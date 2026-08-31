import { CheckCircleOutlined, FileTextOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Card, Col, Progress, Row, Space, Steps, Typography } from "antd";
import PagePanel, { ActionPanel, MetricCard } from "../components/PagePanel";

const peerSteps = [
  { title: "เลือกเพื่อนร่วมงาน", content: "ตรวจสอบรายชื่อที่ต้องประเมิน" },
  { title: "แบบประเมิน", content: "ให้คะแนนและความเห็นตามหัวข้อ" },
  { title: "ยืนยันส่งผล", content: "ตรวจทานและส่งข้อมูลเข้าระบบ" },
];

export default function PeerAssessmentPage() {
  return (
    <PagePanel
      eyebrow="Peer Assessment"
      title="ประเมินเพื่อนร่วมงาน"
      description="หน้าตัวอย่างสำหรับกรอกแบบประเมินเพื่อนร่วมงานในรอบปัจจุบัน"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="รายชื่อที่ต้องประเมิน" value="4 คน" detail="ทำแล้ว 1 คน" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ความคืบหน้า" value="25%" detail="เหลือ 3 รายการ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="กำหนดส่ง" value="30 มิ.ย." detail="รอบประเมินไตรมาส 2" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={14}>
          <Card className="clean-card" title="ขั้นตอนการประเมิน" variant="outlined">
            <Steps
              orientation="vertical"
              current={1}
              items={peerSteps.map((item) => ({
                ...item,
                icon: item.title === "แบบประเมิน" ? <FileTextOutlined /> : undefined,
              }))}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <ActionPanel
            icon={<TeamOutlined />}
            title="เริ่มประเมินเพื่อนร่วมงาน"
            description="เลือกผู้ถูกประเมินและดำเนินการตามแบบประเมินที่ระบบกำหนด"
            buttonText="เริ่มประเมิน"
          />
          <Card className="clean-card compact-card" variant="outlined">
            <Space orientation="vertical" size={12} className="full-width">
              <Space align="center">
                <CheckCircleOutlined className="status-icon success" />
                <Typography.Text>เลือกรอบประเมินเรียบร้อยแล้ว</Typography.Text>
              </Space>
              <Progress percent={25} showInfo={false} />
              <Button block>ดูรายละเอียด</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </PagePanel>
  );
}
