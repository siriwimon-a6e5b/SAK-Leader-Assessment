import {
  BarChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Card, Col, Progress, Row, Space, Tag, Typography } from "antd";
import PagePanel, { MetricCard } from "../components/PagePanel";

const pendingItems = [
  {
    title: "ฝ่ายปฏิบัติการภาคเหนือ",
    description: "ส่งแล้ว 42 จาก 58 รายการ",
    percent: 72,
  },
  {
    title: "ฝ่ายพัฒนาระบบ",
    description: "ส่งแล้ว 18 จาก 20 รายการ",
    percent: 90,
  },
  {
    title: "ฝ่ายบริหารสาขา",
    description: "ส่งแล้ว 95 จาก 140 รายการ",
    percent: 68,
  },
];

export default function AdminHistory() {
  return (
    <PagePanel
      eyebrow="Admin Console"
      title="ภาพรวมการประเมินหัวหน้างานasdasdsad"
      description="ติดตามความคืบหน้าการส่งแบบประเมิน ดูหน่วยงานที่ต้องเร่งติดตาม และสรุปสถานะรอบประเมิน"
    >
      {/* <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="ผู้มีสิทธิ์ประเมิน" value="218 คน" detail="จาก 12 หน่วยงาน" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ส่งแบบประเมินแล้ว" value="155 รายการ" detail="คิดเป็น 71%" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="รอติดตาม" value="63 รายการ" detail="ยังไม่ส่งภายในรอบนี้" />
        </Col>
      </Row> */}

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={14}>
          <Card className="clean-card" title="ความคืบหน้ารายหน่วยงาน" variant="outlined">
            <div className="data-list">
              {pendingItems.map((item) => (
                <div className="data-list-item" key={item.title}>
                  <div className="data-list-main">
                    <TeamOutlined className="list-icon" />
                    <div>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Typography.Paragraph type="secondary">
                        {item.description}
                      </Typography.Paragraph>
                    </div>
                  </div>
                  <div className="progress-cell">
                    <Progress percent={item.percent} size="small" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="clean-card" title="สรุปสถานะรอบประเมิน" variant="outlined">
            <Space orientation="vertical" size={14} className="full-width">
              <Space align="start">
                <CheckCircleOutlined className="status-icon success" />
                <div>
                  <Typography.Text strong>เปิดรอบประเมินแล้ว</Typography.Text>
                  <Typography.Paragraph type="secondary">
                    ระบบพร้อมรับผลจากผู้ใช้งานทุกหน่วยงาน
                  </Typography.Paragraph>
                </div>
              </Space>
              <Space align="start">
                <ExclamationCircleOutlined className="status-icon warning" />
                <div>
                  <Typography.Text strong>มีรายการใกล้ครบกำหนด</Typography.Text>
                  <Typography.Paragraph type="secondary">
                    แนะนำแจ้งเตือนหน่วยงานที่ส่งต่ำกว่า 70%
                  </Typography.Paragraph>
                </div>
              </Space>
              <Tag color="blue" icon={<BarChartOutlined />} className="summary-tag">
                พร้อมดูรายงานสรุป
              </Tag>
            </Space>
          </Card>
        </Col>
      </Row>
    </PagePanel>
  );
}
