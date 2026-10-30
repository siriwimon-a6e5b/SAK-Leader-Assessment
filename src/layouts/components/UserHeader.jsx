import EvaluationNotifications from "./EvaluationNotifications";
import { BookOutlined } from "@ant-design/icons";
import { Avatar, Button, Space, Tag, Typography } from "antd";
import RoleViewSwitch from "./RoleViewSwitch";
import HeaderUserIdentity from "./HeaderUserIdentity";
import { appConfig } from "../../config/appConfig";
import { readCurrentUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";

function getPositionLevel(value) {
  const level = Number(readTokenValue(value).replace(/\D/g, ""));
  return Number.isFinite(level) ? level : 0;
}

export default function UserHeader() {
  const roleConfig = appConfig.roles.user;
  const userLevel =
    sessionStorage.getItem(appConfig.auth.userLevelStorageKey) || "employee";
  const userLevelConfig = appConfig.userLevels[userLevel];
  const positionLevel = getPositionLevel(readCurrentUserDetail()?.PerPST_LV);
  const canViewRegionalManual = positionLevel > 0 &&
    positionLevel <= appConfig.manualRules.regionalMaximumPositionLevel;
  const manuals = [
    { key: "employee", label: "คู่มือพนักงาน", path: appConfig.manuals.employee },
    ...(canViewRegionalManual
      ? [{ key: "regional", label: "คู่มือส่วนของเขต", path: appConfig.manuals.regional }]
      : []),
  ];

  return (
    <header className="app-header app-header-modern">
      <Space className="brand-area" size={12} align="center">
         <Avatar className="header-brand-logo" shape="square" src="/img/SakERP.png" size={40} />
        <div className="brand-copy">
          <Typography.Title level={4}>{appConfig.appName}</Typography.Title>
          <Typography.Text className="app-header-label">
            {roleConfig.subtitle}
          </Typography.Text>
        </div>
      </Space>

      <Space className="header-actions" size={10} wrap>
        <Tag className="role-tag user-role-tag">
          {userLevelConfig?.label || roleConfig.label}
        </Tag>
        {manuals.map((manual) => (
          <Button
            key={manual.key}
            icon={<BookOutlined />}
            size="small"
            href={manual.path}
            target="_blank"
            rel="noopener noreferrer"
          >
            {manual.label}
          </Button>
        ))}
       
        <RoleViewSwitch currentRole="user" />
      <EvaluationNotifications />   <HeaderUserIdentity />
      </Space>
    </header>
  );
}
