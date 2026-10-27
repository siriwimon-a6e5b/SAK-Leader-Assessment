import { canViewRegionalScoresFromToken } from "../auth/roleAccess";
import { appConfig } from "../config/appConfig";
import { getInitialUserDetail } from "../recoilstore/userStores";
import { adminRoutes, getMenuItems } from "../routes";
import AdminHeader from "./components/AdminHeader";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

export default function AdminLayout({ children }) {
  const userDetail = getInitialUserDetail();
  const canViewRegionalScores = canViewRegionalScoresFromToken(userDetail, "admin");

  return (
    <div className="app-shell admin-shell">
      <AdminHeader />
      <Navbar items={getMenuItems(adminRoutes, { canViewRegionalScores })} />
      <main className="app-content">{children}</main>
      <Footer label={appConfig.roles.admin.footerLabel} />
    </div>
  );
}
