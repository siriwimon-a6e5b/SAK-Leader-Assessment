import { loadOwnAssessmentResults, useOwnAssessmentResults } from "../stores/ownAssessmentResults";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { appConfig } from "../config/appConfig";
import { getInitialUserDetail } from "../recoilstore/userStores";
import { getAllowedPaths, getRoleHomePath } from "../routes";
import { canViewRegionalScoresFromToken, getUserLevelFromToken } from "./roleAccess";
import { getEffectiveRole } from "./roleView";

function getTokenStorageKey(locationSearch) {
  return `${localStorage.getItem(appConfig.auth.tokenStorageKey) || ""}|${locationSearch}`;
}

export default function AuthGuard() {
  const [token, setToken] = useState(() => getInitialUserDetail());
  const [loading, setLoading] = useState(true);
  const lastTokenKey = useRef("");
  const location = useLocation();
  const navigate = useNavigate();
  const resultsStatus = useOwnAssessmentResults((state) => state.status);
  const canViewOwnResults = useOwnAssessmentResults((state) => state.canView);

  const publicRoutes = [/^\/DataReportDSRs\/.+$/];
  const isPublicRoute = publicRoutes.some((regex) =>
    regex.test(location.pathname),
  );

  useEffect(() => {
    let expiryTimeoutId;

    const scheduleExpiryCheck = (nextToken) => {
      window.clearTimeout(expiryTimeoutId);
      const expiresAt = Number(nextToken?.PerExp_Token) * 1000;
      const delay = expiresAt - Date.now();

      if (!Number.isFinite(delay) || delay <= 0) return;

      const maximumDelay = 2_147_483_647;
      expiryTimeoutId = window.setTimeout(() => {
        if (delay > maximumDelay) {
          scheduleExpiryCheck(nextToken);
          return;
        }

        // Re-read the token once at its actual expiry time so the access check
        // below can display the existing expiry message.
        setToken(getInitialUserDetail());
      }, Math.min(delay, maximumDelay));
    };

    const syncToken = (force = false) => {
      const nextTokenKey = getTokenStorageKey(location.search);

      if (!force && nextTokenKey === lastTokenKey.current) return;

      lastTokenKey.current = nextTokenKey;
      setLoading(true);
      const nextToken = getInitialUserDetail();
      setToken(nextToken);
      scheduleExpiryCheck(nextToken);
    };

    syncToken(true);

    const handleFocus = () => syncToken();
    const handleStorage = (event) => {
      // Roles are per-tab view preferences; only shared login changes need syncing.
      if (event.storageArea === localStorage &&
          (event.key === appConfig.auth.tokenStorageKey || event.key === null)) {
        syncToken();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.clearTimeout(expiryTimeoutId);
    };
  }, [location.search]);

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    if (!token) {
      loadOwnAssessmentResults();
      if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }

      setLoading(false);
      return;
    }

    try {
      const { role, PerExp_Token } = getEffectiveRole(token);
      const userLevel = getUserLevelFromToken(token, role);
      const canViewRegionalScores = canViewRegionalScoresFromToken(token, role);

      if (Number(PerExp_Token) * 1000 < Date.now()) {
        Swal.fire({
          icon: "warning",
          title: "Token หมดอายุ",
          text: "กรุณา Login ใหม่",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#005b85",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        return;
      }

      if (role === "guest") {
        Swal.fire({
          icon: "warning",
          title: "ไม่มีสิทธิ์เข้าใช้งาน",
          confirmButtonColor: "#005b85",
        }).then(() => {
          window.location.href = appConfig.auth.loginUrl;
        });
        return;
      }

      sessionStorage.setItem(appConfig.auth.roleStorageKey, role);
      sessionStorage.setItem(appConfig.auth.userLevelStorageKey, userLevel);

      loadOwnAssessmentResults();
      if (role === "user" && location.pathname === "/Leader_Check" && resultsStatus !== "ready") return;
      const defaultHome = getRoleHomePath(role, userLevel);
      const homePath = defaultHome === "/Leader_Check" && !canViewOwnResults ? "/User_Check" : defaultHome;
      const allowedPaths = getAllowedPaths(role, { userLevel, canViewOwnResults, canViewRegionalScores });
      const isAllowedPath = allowedPaths.some((path) =>
        location.pathname.startsWith(path),
      );

      if (location.pathname === "/" || !isAllowedPath) {
        navigate(homePath, { replace: true });
      }
    } catch (err) {
      console.error("Token error:", err);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [isPublicRoute, token, navigate, location.pathname, resultsStatus, canViewOwnResults]);

  if (loading) return null;
  return null;
}
