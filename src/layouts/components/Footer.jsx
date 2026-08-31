import { Typography } from "antd";
import { appConfig } from "../../config/appConfig";

export default function Footer({ label }) {
  return (
    <footer className="app-footer">
      <Typography.Text type="secondary">{appConfig.appName}</Typography.Text>
      <Typography.Text type="secondary">{label}</Typography.Text>
    </footer>
  );
}
