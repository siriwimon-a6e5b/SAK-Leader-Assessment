import {
  ApartmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";

function getWorkAge(startWorkDate) {
  if (!startWorkDate || startWorkDate === "0000-00-00") return "-";

  const startDate = new Date(String(startWorkDate).split(" ")[0]);
  if (Number.isNaN(startDate.getTime())) return "-";

  const today = new Date();
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();

  if (today.getDate() < startDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return "น้อยกว่า 1 เดือน";
  if (years <= 0) return `${months} เดือน`;
  if (months <= 0) return `${years} ปี`;

  return `${years} ปี ${months} เดือน`;
}

export default function SupervisorAssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const submittedSupervisorId = location.state?.submittedSupervisorId;
  const submittedSupervisorName = location.state?.submittedSupervisorName;
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const PerD = readTokenValue(userDetail.PerD);
  const PerPST = readTokenValue(userDetail.PerPST);
  const PerPST_LV = readTokenValue(userDetail.PerPST_LV);
  const PerWP = readTokenValue(userDetail.PerWP);
  const PerWP_N = readTokenValue(userDetail.PerWP_N);
  
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [loadError, setLoadError] = useState("");
  const hasNoSupervisor = supervisors.length === 0 && !loadingSupervisors;

  const handleOpenAssessmentForm = (supervisorId) => {
    navigate(`/User_Assess_Supervisor_Form/${supervisorId}`);
  };

  const fetchSupervisors = async () => {
    if (!PerD) {
      setLoadError("ไม่พบข้อมูล token ผู้ใช้งาน");
      return;
    }

    setLoadingSupervisors(true);
    setLoadError("");

    const payload = {
      PerD,
      PerPST,
      PerPST_LV,
      PerWP,
    };

    // console.log("payload:", payload);

    try {
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundPermissionUser",
        {
          params: payload,
        },
      );

      // console.log("response:", response.data);

      if (Array.isArray(response.data.result)) {
        setSupervisors(response.data.result);
        console.log(response.data.result)
      } else {
        setSupervisors([]);
      }
    } catch (error) {
      console.error("GET Supervisor Assessment Error:", error);
      setSupervisors([]);

      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "ดึงรายชื่อผู้บังคับบัญชาไม่สำเร็จ",
      );
    } finally {
      setLoadingSupervisors(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  return (
    <PagePanel
      eyebrow="Supervisor Assessment"
      title="เลือกผู้บังคับบัญชาที่ต้องการประเมิน"
      description="ระบบแสดงรายชื่อหัวหน้าที่อยู่ในพื้นที่ทำงานหรือฝ่ายเดียวกัน เลือกรายชื่อเพื่อเข้าสู่แบบประเมิน"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard
            label="ฝ่าย/พื้นที่"
            value={PerWP_N || "-"}
            detail={`ตำแหน่ง ${PerPST || "-"}`}
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="รายชื่อที่ประเมินได้"
            value={`${supervisors.length} คน`}
            detail="จากสิทธิ์ในรอบประเมิน"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="กำหนดส่ง"
            value="30 มิ.ย."
            detail="รอบประเมินไตรมาส 2"
          />
        </Col>
      </Row>

      {submittedSupervisorId ? (
        <Alert
          className="assessment-success-alert"
          message="ส่งแบบประเมินสำเร็จ"
          description={`ระบบบันทึกแบบประเมินของ ${submittedSupervisorName || "ผู้บังคับบัญชา"} เรียบร้อยแล้ว`}
          type="success"
          showIcon
        />
      ) : null}

      {loadError ? (
        <Alert
          className="assessment-success-alert"
          message="โหลดข้อมูลจาก API ไม่สำเร็จ"
          description={loadError}
          type="warning"
          showIcon
        />
      ) : null}

      <Card
        className="clean-card supervisor-list-card"
        title="รายชื่อผู้บังคับบัญชาในฝ่ายเดียวกัน"
        loading={loadingSupervisors}
        variant="outlined"
      >
        <div className="supervisor-list">
          {hasNoSupervisor ? (
            <Typography.Text type="secondary">
              ไม่พบรายชื่อผู้บังคับบัญชาที่ต้องประเมิน
            </Typography.Text>
          ) : null}
          {supervisors.map((supervisor, index) => {
            const isSubmitted =
              supervisor.EVP_TargetID === submittedSupervisorId ||
              String(supervisor.EVP_AssessmentStatus) === "1";

            return (
              <div
                className="supervisor-list-item"
                key={supervisor.EVP_TargetID}
              >
                <div className="supervisor-profile">
                  <Avatar
                    className="supervisor-avatar"
                    size={48}
                    icon={<UserOutlined />}
                  />
                  <div className="supervisor-copy">
                    <Space size={8} wrap>
                      <Typography.Text strong>
                        {supervisor.EVP_TargetName}
                      </Typography.Text>
                      <Tag color={isSubmitted ? "success" : "warning"}>
                        {isSubmitted ? "ประเมินแล้ว" : "ยังไม่ประเมิน"}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      {supervisor.EVP_PositionName}
                    </Typography.Text>
                  </div>
                </div>

                <div className="supervisor-detail-grid">
                  <div className="supervisor-detail">
                    <ApartmentOutlined />
                    <span>
                      {supervisor.EVP_WorkplaceName} /{" "}
                      {supervisor.EVP_WorkplaceCode}
                    </span>
                  </div>
                  <div className="supervisor-detail">
                    <CalendarOutlined />
                    <span>อายุงาน {getWorkAge(supervisor.startworkdate_PSN)}</span>
                  </div>
                  <div className="supervisor-detail">
                    {index === 0 ? <CrownOutlined /> : <TeamOutlined />}
                    <span>{supervisor.EVP_PositionName}</span>
                  </div>
                </div>

                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled={isSubmitted}
                  onClick={() =>
                    handleOpenAssessmentForm(supervisor.EVP_TargetID)
                  }
                >
                  {isSubmitted ? "ประเมินแล้ว" : "ประเมิน"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space align="center">
          <ClockCircleOutlined className="status-icon warning" />
          <Typography.Text type="secondary">
            ข้อมูลตัวอย่างนี้สามารถเปลี่ยนเป็นข้อมูลจาก API
            ตามฝ่ายหรือพื้นที่ทำงานของผู้ใช้งานได้
          </Typography.Text>
        </Space>
      </Card>
    </PagePanel>
  );
}
