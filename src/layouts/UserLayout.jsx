import { useOwnAssessmentResults } from "../stores/ownAssessmentResults";
import { appConfig } from "../config/appConfig";
import { canViewRegionalScoresFromToken } from "../auth/roleAccess";
import { getInitialUserDetail } from "../recoilstore/userStores";
import { getMenuItems, userRoutes } from "../routes";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import UserHeader from "./components/UserHeader";

export default function UserLayout({ children }) {
  const canViewOwnResults = useOwnAssessmentResults((state) => state.canView);
  const userLevel =
    sessionStorage.getItem(appConfig.auth.userLevelStorageKey) || "employee";
  const userDetail = getInitialUserDetail();
  const canViewRegionalScores = canViewRegionalScoresFromToken(userDetail, "user");

  return (
    <div className="app-shell user-shell">
      <UserHeader />
      <Navbar items={getMenuItems(userRoutes, { userLevel, canViewOwnResults, canViewRegionalScores })} />
      <main className="app-content">{children}</main>
      <Footer label={appConfig.roles.user.footerLabel} />
    </div>
  );
}
