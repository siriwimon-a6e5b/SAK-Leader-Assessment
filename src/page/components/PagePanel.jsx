import { Button, Card, Col, Row, Space, Typography } from "antd";

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow ? <Typography.Text className="access-eyebrow">{eyebrow}</Typography.Text> : null}
        <Typography.Title level={2}>{title}</Typography.Title>
        {description ? <Typography.Paragraph>{description}</Typography.Paragraph> : null}
      </div>
      {action ? <div className="page-heading-action">{action}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, detail }) {
  return (
    <Card className="metric-card" variant="outlined">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Title level={3}>{value}</Typography.Title>
      <Typography.Text type="secondary">{detail}</Typography.Text>
    </Card>
  );
}

export function ActionPanel({ title, description, buttonText, icon }) {
  return (
    <Card className="action-panel" variant="outlined">
      <Space align="start" size={14}>
        <div className="action-icon">{icon}</div>
        <div>
          <Typography.Title level={4}>{title}</Typography.Title>
          <Typography.Paragraph>{description}</Typography.Paragraph>
          {buttonText ? <Button type="primary">{buttonText}</Button> : null}
        </div>
      </Space>
    </Card>
  );
}

export default function PagePanel({ eyebrow = "เข้าสู่ระบบสำเร็จ", title, description, children }) {
  return (
    <section className="page-panel">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children ? (
        <div className="page-section">{children}</div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <MetricCard label="สถานะ" value="พร้อมใช้งาน" detail="รอเชื่อมต่อข้อมูลจริง" />
          </Col>
        </Row>
      )}
    </section>
  );
}
