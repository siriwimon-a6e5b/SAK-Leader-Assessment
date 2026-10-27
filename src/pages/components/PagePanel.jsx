import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

export function getSafeBackPath(pathname = "", search = "") {
  const params = new URLSearchParams(search);
  const roundCode = params.get("EVC_Code");
  const fromPage = params.get("from");
  const roundSearch = roundCode
    ? `?EVC_Code=${encodeURIComponent(roundCode)}`
    : "";

  if (pathname.startsWith("/User_Assess_Supervisor_Form")) {
    if (fromPage === "history") {
      return "/User_out";
    }

    return `/User_Assess_Supervisor${roundSearch}`;
  }

  if (
    pathname.startsWith("/User_Assess_Supervisor") ||
    pathname.startsWith("/User_Assess_Transferred_Supervisor") ||
    pathname.startsWith("/User_Assess_Peer") ||
    pathname.startsWith("/User_out") ||
    pathname.startsWith("/Leader_Check") ||
    pathname.startsWith("/Manager_Check")
  ) {
    return "/User_Check";
  }

  if (pathname.startsWith("/Admin_Assessment_Rounds/")) {
    return "/Admin_Assessment_Rounds";
  }

  if (pathname.startsWith("/Admin_Check/")) {
    if (fromPage === "supervisor-profile") {
      const employeeCode = pathname.slice("/Admin_Check/".length).split("/")[0];
      if (employeeCode) return `/Admin_Supervisor_Profile/${employeeCode}`;
    }

    return "/Admin_Check";
  }

  if (pathname.startsWith("/Admin_Supervisor_Profile/")) {
    return "/Admin_Supervisor_Profile";
  }

  if (pathname.startsWith("/Admin")) {
    return "/Admin_Check";
  }

  return "/";
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div className="page-heading-main">
        <div className="page-heading-marker" />
        <div>
          {eyebrow ? <Typography.Text className="access-eyebrow">{eyebrow}</Typography.Text> : null}
          <Typography.Title level={2}>{title}</Typography.Title>
          {description ? <Typography.Paragraph>{description}</Typography.Paragraph> : null}
        </div>
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

export default function PagePanel({
  eyebrow = "เข้าสู่ระบบสำเร็จ",
  title,
  description,
  children,
  action,
  showBack = true,
  onBack,
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(getSafeBackPath(location.pathname, location.search));
  };
  const pageAction =
    action ||
    (showBack ? (
      <Button
        className="page-back-button"
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
      >
        กลับ
      </Button>
    ) : null);

  return (
    <section className={`page-panel ${className}`.trim()}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={pageAction}
      />
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
