import { BellOutlined, BookOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Avatar, Badge, Button, Popover, Space, Tag, Typography } from "antd";
import { appConfig } from "../../config/appConfig";

const notifications = [
  {
    id: "noti-001",
    title: "ฝ่ายบุคคลอนุมัติรับทราบผลแล้ว",
    description: "ผลการประเมินหัวหน้าฝ่ายขาย รอบไตรมาส 2/2569 ได้รับการอนุมัติแล้ว",
    time: "เมื่อสักครู่",
  },{
    id: "noti-002",
    title: "ฝ่ายบุคคลอนุมัติรับทราบผลแล้ว",
    description: "ผลการประเมินหัวหน้าฝ่ายขาย รอบไตรมาส 2/2569 ได้รับการอนุมัติแล้ว",
    time: "เมื่อสักครู่",
  },
];

export default function UserHeader() {
  const roleConfig = appConfig.roles.user;
  const userLevel =
    localStorage.getItem(appConfig.auth.userLevelStorageKey) || "employee";
  const userLevelConfig = appConfig.userLevels[userLevel];
  const unreadCount = notifications.length;
  const notificationContent = (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <Typography.Text strong>การแจ้งเตือน</Typography.Text>
        <Tag color="blue">{unreadCount} รายการใหม่</Tag>
      </div>

      <div className="notification-list">
        {notifications.map((item) => (
          <div className="notification-item" key={item.id}>
            <CheckCircleOutlined className="notification-icon" />
            <div>
              <Typography.Text strong>{item.title}</Typography.Text>
              <Typography.Paragraph>{item.description}</Typography.Paragraph>
              <Typography.Text type="secondary">{item.time}</Typography.Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
        <Popover
          arrow={false}
          content={notificationContent}
          placement="bottomRight"
          trigger="click"
        >
          <Badge count={unreadCount} size="small">
            <Button
              aria-label="เปิดการแจ้งเตือน"
              className="header-icon-button"
              icon={<BellOutlined />}
              shape="circle"
              size="small"
            />
          </Badge>
        </Popover>
        <Button icon={<BookOutlined />} size="small">
          {roleConfig.manualLabel}
        </Button>
        <Tag className="role-tag user-role-tag">
          {userLevelConfig?.label || roleConfig.label}
        </Tag>
      </Space>
    </header>
  );
}
