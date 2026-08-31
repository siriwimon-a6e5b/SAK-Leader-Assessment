import { BookOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Avatar, Button, Space, Tag, Typography } from "antd";
import { appConfig } from "../../config/appConfig";

export default function AdminHeader() {
  const roleConfig = appConfig.roles.admin;

  return (
    <header className="app-header">
      <Space className="brand-area" size={12} align="center">
        <Avatar shape="square" src="/img/SakERP.png" size={40} />
        <div className="brand-copy">
          <Typography.Title level={4}>{appConfig.appName}</Typography.Title>
          <Typography.Text className="app-header-label">
            {roleConfig.subtitle}
          </Typography.Text>
        </div>
      </Space>

      <Space className="header-actions" size={10}>
        <Button icon={<BookOutlined />} size="small">
          {roleConfig.manualLabel}
        </Button>
        <Tag className="role-tag admin-role-tag">{roleConfig.label}</Tag>
      </Space>
    </header>
  );
}
