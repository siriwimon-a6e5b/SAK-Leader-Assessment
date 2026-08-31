import {
  ApartmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";

const transferredSupervisors = [
  {
    id: "OLD001",
    name: "คุณศุภชัย เมธากุล",
    position: "หัวหน้าฝ่ายบริการลูกค้า",
    oldDepartment: "ฝ่ายบริการลูกค้า",
    oldWorkArea: "สาขารังสิต",
    currentDepartment: "ฝ่ายขาย",
    currentWorkArea: "สำนักงานใหญ่",
    transferDate: "ย้ายพื้นที่เมื่อ 1 มิ.ย. 2569",
    workPeriod: "ทำงานร่วมกัน 7 เดือน",
    status: "ยังไม่ประเมิน",
  },
];

export default function TransferredSupervisorAssessmentPage() {
  const navigate = useNavigate();

  return (
    <PagePanel
      eyebrow="Transfer Assessment"
      title="ประเมินหัวหน้าเดิมกรณีโยกย้าย"
      description="ระบบแสดงหัวหน้าเดิมจากประวัติโยกย้าย สำหรับกรณีย้ายพื้นที่ระหว่างรอบประเมิน"
    >
      <Alert
        className="assessment-success-alert"
        message="ข้อมูลจากประวัติโยกย้าย"
        description="ตัวอย่างนี้จำลองว่าระบบพบหัวหน้าเดิมที่เคยอยู่พื้นที่เดียวกันก่อนย้าย"
        type="info"
        showIcon
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="พื้นที่เดิม" value="สาขารังสิต" detail="ฝ่ายบริการลูกค้า" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="พื้นที่ปัจจุบัน" value="สำนักงานใหญ่" detail="ฝ่ายขาย" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="หัวหน้าเดิมที่ประเมินได้" value="1 คน" detail="จากประวัติโยกย้าย" />
        </Col>
      </Row>

      <Card
        className="clean-card supervisor-list-card"
        title="รายชื่อหัวหน้าเดิมที่เคยอยู่พื้นที่เดียวกัน"
        variant="outlined"
      >
        <div className="supervisor-list">
          {transferredSupervisors.map((supervisor) => (
            <div className="supervisor-list-item" key={supervisor.id}>
              <div className="supervisor-profile">
                <Avatar className="supervisor-avatar" size={48} icon={<UserOutlined />} />
                <div className="supervisor-copy">
                  <Space size={8} wrap>
                    <Typography.Text strong>{supervisor.name}</Typography.Text>
                    <Tag color="warning">{supervisor.status}</Tag>
                  </Space>
                  <Typography.Text type="secondary">{supervisor.position}</Typography.Text>
                </div>
              </div>

              <div className="supervisor-detail-grid">
                <div className="supervisor-detail">
                  <ApartmentOutlined />
                  <span>
                    เดิม: {supervisor.oldDepartment} / {supervisor.oldWorkArea}
                  </span>
                </div>
                <div className="supervisor-detail">
                  <SwapOutlined />
                  <span>
                    ปัจจุบัน: {supervisor.currentDepartment} / {supervisor.currentWorkArea}
                  </span>
                </div>
                <div className="supervisor-detail">
                  <CalendarOutlined />
                  <span>
                    {supervisor.transferDate} / {supervisor.workPeriod}
                  </span>
                </div>
              </div>

              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() =>
                  navigate(`/User_Assess_Supervisor_Form/${supervisor.id}`)
                }
              >
                ประเมิน
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space align="center">
          <HistoryOutlined className="status-icon warning" />
          <Typography.Text type="secondary">
            เมื่อต่อหลังบ้านจริง ให้ดึงรายชื่อจากประวัติโยกย้ายในช่วงรอบประเมิน
          </Typography.Text>
        </Space>
      </Card>
    </PagePanel>
  );
}
