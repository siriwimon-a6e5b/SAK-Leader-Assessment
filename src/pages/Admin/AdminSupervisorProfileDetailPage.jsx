import {
  BarChartOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  IdcardOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Card,
  Col,
  Row,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { Navigate, useParams } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import { supervisorProfiles } from "./adminAssessmentData";

export default function AdminSupervisorProfileDetailPage() {
  const { employeeCode } = useParams();
  const selectedProfile = supervisorProfiles.find(
    (item) => item.employeeCode === employeeCode,
  );

  if (!selectedProfile) return <Navigate to="/Admin_Supervisor_Profile" replace />;

  const latestHistory = selectedProfile.history[0];
  const totalScore = selectedProfile.history.reduce((sum, item) => sum + item.score, 0);
  const averageScore = (totalScore / selectedProfile.history.length).toFixed(2);

  const columns = [
    {
      title: "ปี/รอบประเมิน",
      key: "round",
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.year}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.round}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "ประเมินแล้ว",
      dataIndex: "submitted",
      key: "submitted",
      align: "center",
      render: (submitted) => <Typography.Text>{submitted} คน</Typography.Text>,
    },
    {
      title: "คะแนน",
      dataIndex: "score",
      key: "score",
      align: "center",
      render: (score) => <Tag color="blue">{score.toFixed(2)}/4</Tag>,
    },
    {
      title: "สถานะ",
      dataIndex: "resultStatus",
      key: "resultStatus",
      render: (status) => (
        <Tag color={status === "รอติดตาม" ? "warning" : "success"}>{status}</Tag>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Supervisor Profile"
      title="โปรไฟล์หัวหน้าผู้ถูกประเมิน"
      description="ข้อมูลเชิงลึกรายบุคคล พร้อม timeline การถูกประเมิน ตำแหน่ง พื้นที่ และผลคะแนนย้อนหลัง"
    >
      <Card className="clean-card supervisor-profile-hero" variant="outlined">
        <div className="supervisor-profile-main">
          <Avatar className="supervisor-avatar" size={68} icon={<UserOutlined />} />
          <div>
            <Space size={8} wrap>
              <Typography.Title level={3}>{selectedProfile.name}</Typography.Title>
              <Tag color={selectedProfile.statusColor}>{selectedProfile.status}</Tag>
            </Space>
            <div className="supervisor-profile-meta">
              <Space wrap>
                <IdcardOutlined />
                <Typography.Text>{selectedProfile.employeeCode}</Typography.Text>
              </Space>
              <Space wrap>
                <TeamOutlined />
                <Typography.Text>{selectedProfile.currentPosition}</Typography.Text>
              </Space>
              <Space wrap>
                <EnvironmentOutlined />
                <Typography.Text>
                  {selectedProfile.currentDepartment} / {selectedProfile.currentWorkArea}
                </Typography.Text>
              </Space>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard label="คะแนนเฉลี่ยย้อนหลัง" value={`${averageScore}/4`} detail={`${selectedProfile.history.length} รอบประเมิน`} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="คะแนนล่าสุด" value={`${latestHistory.score.toFixed(2)}/4`} detail={latestHistory.round} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="เริ่มงาน" value={selectedProfile.startWorkDate} detail="ข้อมูลบุคคล" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="เริ่มเป็นหัวหน้า" value={selectedProfile.leaderStartDate} detail="ตำแหน่งบริหารทีม" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={16}>
          <Card
            className="clean-card admin-table-card supervisor-history-card"
            title="ประวัติการถูกประเมินย้อนหลัง"
            variant="outlined"
          >
            <Table
              className="supervisor-history-table"
              columns={columns}
              dataSource={selectedProfile.history}
              pagination={false}
              rowKey="round"
              scroll={{ x: 520 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="clean-card supervisor-profile-timeline" title="Timeline ตำแหน่งและพื้นที่" variant="outlined">
            <Timeline
              items={selectedProfile.positionTimeline.map((item) => ({
                color: "blue",
                children: (
                  <div>
                    <Typography.Text strong>{item.date}</Typography.Text>
                    <div>
                      <Typography.Text>{item.label}</Typography.Text>
                    </div>
                    <div>
                      <Typography.Text type="secondary">{item.workArea}</Typography.Text>
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <BarChartOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">แนวโน้มคะแนน</Typography.Text>
            <Typography.Title level={3}>คงที่ดี</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <HistoryOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">รอบที่เคยประเมิน</Typography.Text>
            <Typography.Title level={3}>{selectedProfile.history.length} รอบ</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <CalendarOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">รอบล่าสุด</Typography.Text>
            <Typography.Title level={3}>{latestHistory.year}</Typography.Title>
          </Card>
        </Col>
      </Row>
    </PagePanel>
  );
}
