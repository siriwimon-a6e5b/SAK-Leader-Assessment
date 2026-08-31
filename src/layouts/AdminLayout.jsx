import { appConfig } from "../config/appConfig";
import { adminRoutes, getMenuItems } from "../routes";
import AdminHeader from "./components/AdminHeader";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

export default function AdminLayout({ children }) {
  return (
    <div className="app-shell admin-shell">
      <AdminHeader />
      <Navbar items={getMenuItems(adminRoutes)} />
      <main className="app-content">{children}</main>
      <Footer label={appConfig.roles.admin.footerLabel} />
    </div>
  );
}
