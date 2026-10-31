import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CrownOutlined,
  FileTextOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Alert, Card, Empty, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PagePanel from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import {
  refreshPendingAssessments,
  usePendingAssessments,
} from "../../stores/pendingAssessments";

const assessmentTypeMap = {
  1: {
    title: "ประเมินผู้บังคับบัญชา",
    description: "เข้าสู่แบบประเมินหัวหน้างานหรือผู้บังคับบัญชา",
    icon: <ApartmentOutlined />,
    path: "/User_Assess_Supervisor",
  },
  2: {
    title: "ประเมินการอยู่ร่วมกัน",
    description: "เข้าสู่แบบประเมินการทำงานร่วมกันในองค์กร",
    icon: <TeamOutlined />,
    path: "/User_Assess_Supervisor",
  },
  3: {
    title: "ประเมินพนักงานประจำปี",
    description: "เข้าสู่แบบประเมินผลการปฏิบัติงานประจำปี",
    icon: <FileTextOutlined />,
    path: "/User_Assess_Supervisor",
  },
  4: {
    title: "Successor Assessment",
    description: "เข้าสู่แบบประเมินผู้สืบทอดตำแหน่ง",
    icon: <CrownOutlined />,
    path: "/User_Assess_Supervisor",
  },
};

function getRoundRows(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.data)) return result.data;

  return [];
}

function getRoundCode(round) {
  return round?.EVC_Code || round?.code || "";
}

function isRoundOpen(round) {
  return String(round?.EVC_Status ?? round?.status ?? "") === "1";
}

function getGridClass(total) {
  if (total <= 1) return "is-one-item";
  if (total === 2) return "is-two-items";
  if (total >= 4) return "is-four-items";

  return "is-three-items";
}

function getMenuYear(menu) {
  const periodYear = String(menu?.EVC_Period || "").match(/25\d{2}/)?.[0];

  return menu?.EVC_Year || periodYear || `${new Date().getFullYear() + 543}`;
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const userDetail = useMemo(() => getInitialUserDetail() || {}, []);
  const PerD = readTokenValue(userDetail.PerD);
  const pendingCountsByRound = usePendingAssessments(
    (state) => state.countsByRound,
  );

  const fetchOpenRounds = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await apiClient.get("/getAssessmentRound", {
        params: {
          PerD,
          EVC_Status: "1",
          page: 1,
          limit: 4,
        },
      });

      setRounds(getRoundRows(response.data));
    } catch (error) {
      console.error(error);
      setRounds([]);
      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "โหลดรอบประเมินไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenRounds();
    refreshPendingAssessments();
  }, []);

  const menus = rounds
    .filter(isRoundOpen)
    .map((round) => {
      const type = String(round.EVT_ID || "");
      const config = assessmentTypeMap[type];

      if (!config || !getRoundCode(round)) return null;

      return {
        ...config,
        EVC_ID: round.EVC_ID,
        EVC_Code: getRoundCode(round),
        EVC_Period: round.EVC_Period,
        EVC_detail: round.EVC_detail,
        EVC_Year: round.EVC_Year,
        EVC_StartDate: round.EVC_StartDate,
        EVC_EndDate: round.EVC_EndDate,
        EVT_ID: type,
        pendingAssessmentCount: Number(
          pendingCountsByRound[getRoundCode(round)] || 0,
        ),
      };
    })
    .filter(Boolean);
  const dashboardYear = menus[0] ? getMenuYear(menus[0]) : new Date().getFullYear() + 543;

  const openAssessmentPage = (menu) => {
    if (!menu.EVC_Code) {
      messageApi.warning("ไม่พบรหัสรอบประเมิน");
      return;
    }

    const queryParams = new URLSearchParams();
    queryParams.set("EVC_Code", menu.EVC_Code);
    if (menu.EVT_ID) queryParams.set("EVT_ID", menu.EVT_ID);

    navigate(`${menu.path}?${queryParams.toString()}`, {
      state: {
        EVC_ID: menu.EVC_ID,
        EVC_Code: menu.EVC_Code,
        EVC_Period: menu.EVC_Period,
        EVC_detail: menu.EVC_detail,
        EVT_ID: menu.EVT_ID,
      },
    });
  };

  return (
    <PagePanel
      eyebrow="Assessment"
      title="เลือกประเภทการประเมิน"
      description="ระบบจะแสดงเฉพาะรอบประเมินที่เปิดใช้งานและคุณมีสิทธิ์ประเมิน"
      showBack={false}
    >
      {contextHolder}

      {loadError ? (
        <Alert
          className="assessment-success-alert"
          title="โหลดข้อมูลจาก API ไม่สำเร็จ"
          description={loadError}
          type="warning"
          showIcon
        />
      ) : null}

      {/* <div className="user-dashboard-round-title">
        <CalendarOutlined />
        <Typography.Title level={3}>รอบประเมินปี {dashboardYear}</Typography.Title>
      </div> */}

      <div className={`assessment-choice-grid ${getGridClass(menus.length)}`}>
        {menus.map((menu, index) => (
          <button
            className={`assessment-choice-button theme-${index % 3}`}
            type="button"
            disabled={loading}
            key={`${menu.EVT_ID}-${menu.EVC_Code}`}
            onClick={() => openAssessmentPage(menu)}
          >
            <span
              className={`assessment-choice-notification ${
                menu.pendingAssessmentCount ? "has-pending" : "is-complete"
              }`}
              aria-label={menu.pendingAssessmentCount
                ? `รอประเมิน ${menu.pendingAssessmentCount} คน`
                : "ประเมินครบแล้ว"}
              title={menu.pendingAssessmentCount
                ? `รอประเมิน ${menu.pendingAssessmentCount} คน`
                : "ประเมินครบแล้ว"}
            >
              <span className="assessment-choice-notification-count">
                {menu.pendingAssessmentCount.toLocaleString("en-US")}
              </span>
            </span>
            <span className="assessment-choice-cover">
              <span className="assessment-choice-brand">
                <BarChartOutlined />
                SAK Assessment
              </span>
              <span className="assessment-choice-cover-text">
                <Typography.Title level={3}>
                  {menu.title}
                </Typography.Title>
                <Typography.Text>{menu.description}</Typography.Text>
              </span>
              <span className="assessment-choice-arrow">
                <ArrowRightOutlined />
              </span>
            </span>

            <span className="assessment-choice-body">
              <span className="assessment-choice-title">
                <span className="assessment-choice-icon">{menu.icon}</span>
              <Typography.Text strong>{menu.title} รอบที่  {menu.EVC_Period}</Typography.Text>
              </span>
              <span className="assessment-choice-meta">
                <Tag color="processing">อยู่ในรอบประเมิน</Tag>
                <span className={`assessment-choice-pending ${
                  menu.pendingAssessmentCount ? "has-pending" : "is-complete"
                }`}>
                  {menu.pendingAssessmentCount
                    ? `รอประเมิน ${menu.pendingAssessmentCount.toLocaleString("en-US")} คน`
                    : "ประเมินครบแล้ว"}
                </span>
                <span className="assessment-choice-pill">
                  <CalendarOutlined />
                  {loading ? "กำลังโหลด..." : menu.EVC_Period || "รอบปัจจุบัน"}
                </span>
                <span className="assessment-choice-pill is-code">
                  รหัสรอบ {menu.EVC_Code}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {!loading && !menus.length ? (
        <Card className="clean-card compact-card" variant="outlined">
          <Empty description="ยังไม่มีรอบประเมินที่เปิดใช้งานสำหรับคุณ" />
        </Card>
      ) : null}
    </PagePanel>
  );
}
