import {
  EyeOutlined,
  IdcardOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient from "../../recoilstore/userStores";

const SUPERVISOR_PROFILE_LIST_API =
  "/api/insurances/getSupervisorProfileList";
const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";
const SUPERVISOR_PROFILE_PAGE_SIZE = 50;

function getApiRows(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.supervisors)) return result.supervisors;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.list)) return result.list;

  return [];
}

function getApiResult(data) {
  return data?.result ?? data?.data ?? data ?? {};
}

function getNumber(value, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getAverageScore(profile) {
  return getNumber(profile.averageScore);
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (String(photo).startsWith("http")) return photo;

  return `${EMPLOYEE_PHOTO_URL}/${photo}`;
}

function mapSupervisorProfile(row) {
  const employeeCode =
    row.employeeCode ?? row.EVP_TargetID ?? row.PerID ?? row.PSNID ?? "";

  return {
    employeeCode,
    name: row.name ?? row.EVP_TargetName ?? row.PerName ?? "-",
    position: row.position ?? row.EVP_PositionName ?? row.PerPST_N ?? "-",
    department:
      row.department ?? row.EVP_WorkplaceName ?? row.PerWP_N ?? row.workplace ?? "-",
    workArea:
      row.workArea ?? row.EVP_WorkplaceCode ?? row.PerWP ?? row.workplaceCode ?? "-",
    regionId: String(row.region_id ?? row.region ?? row.regionId ?? "").trim(),
    districtName: row.belong ?? row.belong_name ?? row.belongName ?? "",
    photo: row.photo ?? row.EVP_Photo ?? row.photo_PSN ?? "",
    averageScore: getNumber(row.averageScore ?? row.avgScore ?? row.score),
    historyCount: getNumber(row.historyCount ?? row.totalRounds ?? row.roundCount),
    assessmentTypeCounts: getArray(row.assessmentTypeCounts).map((item) => ({
      id: item.EVT_ID ?? item.id ?? item.typeId,
      name: item.EVT_Name ?? item.name ?? item.typeName ?? "ไม่ระบุประเภท",
      total: getNumber(item.total ?? item.count),
    })),
    latestYear: row.latestYear ?? row.EVC_Year ?? row.year ?? "-",
    latestRound: row.latestRound ?? row.EVC_Period ?? row.round ?? "-",
    status: row.status ?? row.statusText ?? "มีประวัติ",
    statusColor: row.statusColor ?? "processing",
  };
}

export default function AdminSupervisorProfilePage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [employeeCodeFilter, setEmployeeCodeFilter] = useState("");
  const [workplaceFilter, setWorkplaceFilter] = useState("");
  const [supervisorProfiles, setSupervisorProfiles] = useState([]);
  const [activeFilters, setActiveFilters] = useState({ name: "", employeeCode: "", workplace: "" });
  const [profilePage, setProfilePage] = useState(1);
  const [profileTotal, setProfileTotal] = useState(0);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchSupervisorProfiles = useCallback(async (signal) => {
    setLoadingProfiles(true);
    setLoadError("");

    try {
      const response = await apiClient.get(SUPERVISOR_PROFILE_LIST_API, {
        signal,
        params: {
          page: profilePage,
          limit: SUPERVISOR_PROFILE_PAGE_SIZE,
          name: activeFilters.name,
          employeeCode: activeFilters.employeeCode,
          workplace: activeFilters.workplace,
        },
      });
      if (signal.aborted) return;
      const result = getApiResult(response.data);
      const rows = getApiRows(response.data)
        .map(mapSupervisorProfile)
        .filter((item) => item.employeeCode);

      setSupervisorProfiles(rows);
      setProfileTotal(getNumber(result.total, rows.length));
    } catch (error) {
      if (signal.aborted) return;
      console.error(error);
      setLoadError("โหลดรายชื่อหัวหน้าไม่สำเร็จ");
      setSupervisorProfiles([]);
      setProfileTotal(0);
    } finally {
      if (!signal.aborted) setLoadingProfiles(false);
    }
  }, [profilePage, activeFilters]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSupervisorProfiles(controller.signal);
    return () => controller.abort();
  }, [fetchSupervisorProfiles]);

  const handleSearch = (event) => {
    event.preventDefault();
    setProfilePage(1);
    setActiveFilters({
      name: searchText.trim(),
      employeeCode: employeeCodeFilter.trim(),
      workplace: workplaceFilter.trim(),
    });
  };

  const totalHistory = supervisorProfiles.reduce(
    (sum, item) => sum + item.historyCount,
    0,
  );
  const averageScore =
    supervisorProfiles.length > 0
      ? supervisorProfiles.reduce((sum, item) => sum + getAverageScore(item), 0) /
        supervisorProfiles.length
      : 0;
  const columns = [
    {
      title: "หัวหน้าผู้ถูกประเมิน",
      key: "profile",
      width: "23%",
      render: (_, row) => (
        <div className="supervisor-table-profile">
          <Avatar
          
            size={42}
            src={getPhotoUrl(row.photo)}
          >
            {row.name?.charAt(0) || "H"}
          </Avatar>
          <div>
            <Typography.Text strong>{row.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                {row.employeeCode} · {row.position}
              </Typography.Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "ฝ่าย/สาขา · เขต/ภาค",
      key: "workArea",
      width: "10%",
      render: (_, row) => (
        <div className="supervisor-table-text">
          <Typography.Text>{row.department}</Typography.Text>
          {/* <Typography.Text type="secondary">{row.workArea}</Typography.Text> */}
          {row.regionId === "6" ? (
            <Typography.Text type="secondary">สำนักงานใหญ่</Typography.Text>
          ) : (
            <>
              {row.districtName ? (
                <Typography.Text type="secondary"> {row.districtName}</Typography.Text>
              ) : null}
              {row.regionId ? (
                <Typography.Text type="secondary">ภาคธุรกิจที่ {row.regionId}</Typography.Text>
              ) : null}
            </>
          )}
        </div>
      ),
    },
    {
      title: "ประวัติ",
      key: "historyCount",
      width: "10%",
      render: (_, row) => (
        <div className="supervisor-table-history-tags">
          <Tag color="blue">รวม {row.historyCount} รอบ</Tag>
          {/* {row.assessmentTypeCounts.map((item) => (
            <Tag color="geekblue" key={`${row.employeeCode}-${item.id}-${item.name}`}>
              {item.name} {item.total}
            </Tag>
          ))} */}
        </div>
      ),
    },
    {
      title: "คะแนนเฉลี่ย",
      key: "averageScore",
      width: "17%",
      render: (_, row) => {
        const score = getAverageScore(row);

        return (
          <div className="supervisor-table-score">
            <div>
              <Typography.Text strong>{score.toFixed(2)} / 4</Typography.Text>
              <Typography.Text type="secondary">
                ล่าสุด {row.latestRound} / {row.latestYear}
              </Typography.Text>
            </div>
            <Progress
              percent={(score / 4) * 100}
              showInfo={false}
              size="small"
              strokeColor="#1677ff"
            />
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      key: "status",
      width: "9%",
      render: (_, row) => <Tag color={row.statusColor}>{row.status}</Tag>,
    },
    {
      title: "",
      key: "action",
      className: "supervisor-directory-action-cell",
      align: "center",
      width: "14%",
      render: (_, row) => (
        <Button
          icon={<EyeOutlined />}
          type="primary"
          onClick={() =>
            navigate(`/Admin_Supervisor_Profile/${row.employeeCode}`)
          }
        >
          ดูรายละเอียด
        </Button>
      ),
    },
  ];

  return (
    <PagePanel
      className="supervisor-directory-page"
      eyebrow="Supervisor Directory"
      title="ประวัติหัวหน้าผู้ถูกประเมิน"
      description="รวมรายชื่อหัวหน้าทั้งหมด พร้อมคะแนนล่าสุดและประวัติการถูกประเมินย้อนหลัง"
      showBack={false}
    >
      <Row gutter={[12, 12]} className="supervisor-profile-summary-row">
        <Col xs={24} md={8}>
          <MetricCard
            label="หัวหน้าทั้งหมด"
            value={`${profileTotal} คน`}
            detail="จาก API"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="ประวัติประเมินรวม"
            value={`${totalHistory} รอบ`}
            detail="เฉพาะหน้าปัจจุบัน"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="คะแนนเฉลี่ยรวม"
            value={`${averageScore.toFixed(2)} / 4`}
            detail="เฉพาะหน้าปัจจุบัน"
          />
        </Col>
      </Row>

      <Card
        className="clean-card supervisor-directory-table-card"
        variant="outlined"
      >
        <div className="supervisor-directory-toolbar">
          <div>
            <Typography.Title level={4}>รายชื่อหัวหน้าทั้งหมด</Typography.Title>
            <Typography.Text type="secondary">
            เลือกหัวหน้าเพื่อดู timeline คะแนนรายปีและรอบที่เคยถูกประเมิน
            </Typography.Text>
          </div>
        </div>
        <form className="supervisor-directory-filters" onSubmit={handleSearch}>
          <Input
            allowClear
            aria-label="ค้นหาชื่อหัวหน้า"
            placeholder="ค้นหาชื่อหัวหน้า"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
          />
          <Input
            allowClear
            aria-label="รหัสพนักงาน"
            placeholder="รหัสพนักงาน"
            value={employeeCodeFilter}
            onChange={(event) => {
              setEmployeeCodeFilter(event.target.value);
            }}
          />
          <Input
            allowClear
            aria-label="ฝ่าย / สาขา"
            placeholder="ฝ่าย / สาขา (ชื่อหรือรหัส)"
            value={workplaceFilter}
            onChange={(event) => {
              setWorkplaceFilter(event.target.value);
            }}
          />
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loadingProfiles}>
            ค้นหา
          </Button>
          <Button onClick={() => {
            setSearchText("");
            setEmployeeCodeFilter("");
            setWorkplaceFilter("");
            setActiveFilters({ name: "", employeeCode: "", workplace: "" });
            setProfilePage(1);
          }}>
            ล้างตัวกรอง
          </Button>
        </form>

        <Table
          className="supervisor-directory-table"
          tableLayout="fixed"
          columns={columns}
          dataSource={supervisorProfiles}
          loading={loadingProfiles}
          locale={{
            emptyText: (
              <Empty
                description={
                  loadError || "ไม่พบหัวหน้าตามเงื่อนไขที่ค้นหา"
                }
              />
            ),
          }}
          pagination={{
            current: profilePage,
            pageSize: SUPERVISOR_PROFILE_PAGE_SIZE,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} จาก ${total} คน`,
            total: profileTotal,
          }}
          rowKey="employeeCode"
          onChange={(pagination) => setProfilePage(pagination.current || 1)}
        />
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space align="center">
          <IdcardOutlined className="list-icon" />
          <Typography.Text type="secondary">
            หน้านี้เป็นภาพรวมรายชื่อหัวหน้าทั้งหมด ส่วนรายละเอียดจะแสดง timeline คะแนนย้อนหลังรายปีและรอบประเมิน
          </Typography.Text>
        </Space>
      </Card>
    </PagePanel>
  );
}
