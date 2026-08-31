import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Tag, Typography } from "antd";
import PagePanel, { ActionPanel, MetricCard } from "../components/PagePanel";

const teamItems = [
  { title: "แผนกขาย", status: "ส่งครบแล้ว" },
  { title: "แผนกบริการ", status: "รอตรวจสอบ" },
  { title: "แผนกคลังสินค้า", status: "กำลังดำเนินการ" },
];

export default function ManagerDashboardPage() {
  return (
    <PagePanel
      eyebrow="Manager Portal"
      title="ภาพรวมสำหรับผู้จัดการ"
      description="ดูสถานะการประเมินของทีม ติดตามความคืบหน้า และตรวจสอบรายงานสรุป"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="ทีมที่ดูแล" value="3 ทีม" detail="รวม 48 คน" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ส่งข้อมูลแล้ว" value="82%" detail="เหลือ 9 รายการ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="รายงานพร้อมดู" value="5 ชุด" detail="รออนุมัติ 1 ชุด" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={10}>
          <ActionPanel
            icon={<BarChartOutlined />}
            title="ดูรายงานภาพรวม"
            description="ตรวจสอบความคืบหน้า คะแนนเฉลี่ย และสถานะการประเมินของแต่ละทีม"
            buttonText="เปิดรายงาน"
          />
        </Col>
        <Col xs={24} lg={14}>
          <Card className="clean-card" title="สถานะทีม" variant="outlined">
            <div className="data-list">
              {teamItems.map((item) => (
                <div className="data-list-item" key={item.title}>
                  <div className="data-list-main">
                    <ClusterOutlined className="list-icon" />
                    <Typography.Text strong>{item.title}</Typography.Text>
                  </div>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    {item.status}
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </PagePanel>
  );
}
