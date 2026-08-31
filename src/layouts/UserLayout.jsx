import { appConfig } from "../config/appConfig";
import { getMenuItems, userRoutes } from "../routes";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import UserHeader from "./components/UserHeader";

export default function UserLayout({ children }) {
  const userLevel =
    localStorage.getItem(appConfig.auth.userLevelStorageKey) || "employee";

  return (
    <div className="app-shell user-shell">
      <UserHeader />
      <Navbar items={getMenuItems(userRoutes, { userLevel })} />
      <main className="app-content">{children}</main>
      <Footer label={appConfig.roles.user.footerLabel} />
    </div>
  );
}
