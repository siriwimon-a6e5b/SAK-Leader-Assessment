import {
  ArrowUpOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  SmileOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Col, Progress, Row, Space, Tag, Typography } from "antd";
import { Navigate, useParams } from "react-router-dom";
import { appConfig } from "../../config/appConfig";
import PagePanel from "../components/PagePanel";
import {
  getPercent,
  supervisorDetailSections,
  supervisorRows,
} from "./adminAssessmentData";

const sectionIcons = {
  leadership: <SmileOutlined />,
  team: <TeamOutlined />,
  target: <TrophyOutlined />,
};

export default function AdminSupervisorDetailPage() {
  const { supervisorId } = useParams();
  const supervisor = supervisorRows.find((item) => item.id === supervisorId);

  if (!supervisor) return <Navigate to="/Admin_Check" replace />;

  const submittedPercent = getPercent(supervisor.submitted, supervisor.totalEvaluators);

  return (
    <PagePanel
      eyebrow="Performance Dashboard"
      title="แดชบอร์ดผลการประเมินรายบุคคล"
      description="ข้อมูลลับ - รายงานสำหรับผู้ดูแลระบบและฝ่ายบุคคล"
    >
      <section className="admin-report-page">
        <div className="admin-report-brand">
          <Space size={12} align="center">
            <Avatar shape="square" src="/img/SakERP.png" size={46} />
            <div>
              <Typography.Title level={4}>{appConfig.appName}</Typography.Title>
              <Typography.Text type="secondary">SAKSIAM LEASING PLC</Typography.Text>
            </div>
          </Space>
          <Tag color={supervisor.statusColor}>{supervisor.status}</Tag>
        </div>

        <div className="admin-report-person">
          <Avatar className="admin-report-avatar" size={78} icon={<UserOutlined />} />
          <div className="admin-report-person-grid">
            <div>
              <Typography.Text strong>ชื่อหัวหน้า : {supervisor.name}</Typography.Text>
              <Typography.Text>ตำแหน่ง : {supervisor.position}</Typography.Text>
              <Typography.Text>ฝ่าย : {supervisor.department}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>รหัสพนักงาน : {supervisor.employeeCode}</Typography.Text>
              <Typography.Text>สถานที่ปฏิบัติงาน : {supervisor.workArea}</Typography.Text>
              <Typography.Text>รอบการประเมิน : {supervisor.round}</Typography.Text>
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <BarChartOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">คะแนนเฉลี่ยรวม</Typography.Text>
              <Typography.Title level={2}>{supervisor.averageScore.toFixed(2)} / 4</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <CheckCircleOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">ความคืบหน้าการส่ง</Typography.Text>
              <Typography.Title level={2}>{submittedPercent}%</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <CrownOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">ผู้ประเมินทั้งหมด</Typography.Text>
              <Typography.Title level={2}>{supervisor.totalEvaluators} คน</Typography.Title>
            </Card>
          </Col>
        </Row>

        {supervisorDetailSections.map((section) => (
          <Card
            className={`admin-report-section is-${section.accent}`}
            key={section.title}
            title={section.title}
            variant="outlined"
          >
            <Row gutter={[18, 18]} align="middle">
              <Col xs={24} lg={9}>
                <div className="admin-report-score-card">
                  <div className="admin-report-score-icon">
                    {sectionIcons[section.icon]}
                  </div>
                  <Typography.Text strong>{section.totalTitle}</Typography.Text>
                  <Typography.Title level={1}>{section.score.toFixed(1)} / 5</Typography.Title>
                  <Tag color="success">{section.label}</Tag>
                </div>
              </Col>
              <Col xs={24} lg={15}>
                <div className="admin-report-metric-list">
                  {section.metrics.map((metric) => (
                    <div className="admin-report-metric" key={metric.label}>
                      <Typography.Text>{metric.label}</Typography.Text>
                      <Progress
                        percent={(metric.score / 5) * 100}
                        showInfo={false}
                        strokeColor={metric.score >= 4.2 ? "#0f8a3b" : "#f59f00"}
                      />
                      <Typography.Text strong>{metric.score.toFixed(1)}</Typography.Text>
                      <ArrowUpOutlined className="admin-report-trend" />
                    </div>
                  ))}
                </div>
              </Col>
            </Row>

            {section.comments ? (
              <div className="admin-report-comment-grid">
                {section.comments.map((comment) => (
                  <div className="admin-report-comment" key={comment}>
                    <span className="quote-mark">“</span>
                    <Typography.Text>{comment}</Typography.Text>
                    <span className="quote-mark is-end">”</span>
                  </div>
                ))}
              </div>
            ) : null}

            {section.summary ? (
              <Row gutter={[16, 16]} className="admin-report-summary-row">
                <Col xs={24} md={12}>
                  <Card className="clean-card admin-report-note" title="สรุปผลงานสำคัญ" variant="outlined">
                    <ul>
                      {section.summary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card className="clean-card admin-report-note" title="แผนพัฒนาสำหรับปีถัดไป" variant="outlined">
                    <ul>
                      {section.developmentPlan.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Card>
                </Col>
              </Row>
            ) : null}
          </Card>
        ))}
      </section>
    </PagePanel>
  );
}
