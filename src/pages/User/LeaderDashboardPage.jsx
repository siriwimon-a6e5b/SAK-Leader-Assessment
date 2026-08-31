import {
  BarChartOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { Card, Col, Progress, Row, Space, Tag, Typography } from "antd";
import { supervisorDetailSections } from "../Admin/adminAssessmentData";
import PagePanel, { MetricCard } from "../components/PagePanel";

const currentRound = {
  label: "ปี 2569 เดือน 6",
  evaluatedBy: 18,
  totalEvaluators: 20,
  approvedAt: "รับทราบผลโดยฝ่ายบุคคลแล้ว",
};

const visibleSections = supervisorDetailSections.slice(0, 1);
const mainSection = visibleSections[0];
const averageScore =
  visibleSections.reduce((sum, section) => sum + section.score, 0) / visibleSections.length;
const submittedPercent = Math.round((currentRound.evaluatedBy / currentRound.totalEvaluators) * 100);

export default function LeaderDashboardPage() {
  return (
    <PagePanel
      eyebrow="My Assessment Result"
      title="ผลการประเมินของฉัน"
      description="แสดงเฉพาะคะแนนรวมจากผู้ประเมินทั้งหมด ไม่แสดงชื่อผู้ประเมินและไม่แสดงคอมเม้นรายบุคคล"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard label="รอบประเมิน" value={currentRound.label} detail={currentRound.approvedAt} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="คะแนนรวม" value={`${averageScore.toFixed(2)} / 5`} detail={mainSection.label} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="จำนวนผู้ส่ง" value={`${currentRound.evaluatedBy} คน`} detail={`จากทั้งหมด ${currentRound.totalEvaluators} คน`} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ความเป็นส่วนตัว" value="ไม่ระบุตัวตน" detail="ไม่เปิดเผยผู้ประเมิน" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={8}>
          <Card className="clean-card leader-result-summary-card" variant="outlined">
            <div className="leader-result-score">
              <div className="leader-result-score-icon">
                <BarChartOutlined />
              </div>
              <Typography.Text type="secondary">คะแนนเฉลี่ยรวม</Typography.Text>
              <Typography.Title level={1}>{averageScore.toFixed(2)}</Typography.Title>
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {mainSection.label}
              </Tag>
            </div>
            <div className="leader-result-progress">
              <Space className="full-width" orientation="vertical" size={8}>
                <Space className="space-between">
                  <Typography.Text strong>สัดส่วนผู้ส่งประเมิน</Typography.Text>
                  <Typography.Text type="secondary">{submittedPercent}%</Typography.Text>
                </Space>
                <Progress percent={submittedPercent} showInfo={false} />
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            className="clean-card"
            title={
              <Space>
                <SafetyOutlined />
                <span>คะแนนรวมแยกตามหัวข้อ</span>
              </Space>
            }
            extra={<Tag color="blue">ข้อมูลรวมเท่านั้น</Tag>}
            variant="outlined"
          >
            <div className="leader-result-metric-list">
              {mainSection.metrics.map((metric) => (
                <div className="leader-result-metric-item" key={metric.label}>
                  <div>
                    <Typography.Text strong>{metric.label}</Typography.Text>
                    <Typography.Text type="secondary">คะแนนเฉลี่ยจากผู้ประเมินทั้งหมด</Typography.Text>
                  </div>
                  <div className="leader-result-metric-score">
                    <Progress
                      percent={(metric.score / 5) * 100}
                      showInfo={false}
                      strokeColor={metric.score >= 4 ? "#0f5fb3" : "#f59f00"}
                    />
                    <Typography.Text strong>{metric.score.toFixed(1)} / 5</Typography.Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24}>
          <Card className="clean-card" variant="outlined">
            <Space align="start" size={12}>
              <LockOutlined className="list-icon" />
              <div>
                <Typography.Text strong>การแสดงผลถูกปกปิดตัวตนผู้ประเมิน</Typography.Text>
                <Typography.Paragraph type="secondary">
                  หน้านี้ออกแบบให้หัวหน้าดูผลรวมของตนเองเท่านั้น จึงไม่แสดงรายชื่อผู้ประเมิน
                  ไม่แสดงคอมเม้นรายบุคคล และไม่สามารถย้อนกลับไประบุตัวผู้ประเมินได้
                </Typography.Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </PagePanel>
  );
}
