import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { appConfig } from "../config/appConfig";
import { getInitialUserDetail } from "../recoilstore/userStores";
import { getAllowedPaths, getRoleHomePath } from "../routes";

function decodeBase64(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(
      atob(value)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
  } catch {
    return "";
  }
}

function readTokenValue(value) {
  const decoded = decodeBase64(value);
  return decoded || String(value || "");
}

function getTokenStorageKey(locationSearch) {
  return `${localStorage.getItem(appConfig.auth.tokenStorageKey) || ""}|${locationSearch}`;
}

function getRoleFromToken(token) {
  const PerD = readTokenValue(token.PerD);
  const PerST = readTokenValue(token.PerST);
  const AgU = readTokenValue(token.AgU);
  const PerPST = readTokenValue(token.PerPST);
  const PerRG = readTokenValue(token.PerRG);
  const PerWP = readTokenValue(token.PerWP);
  const PerExp_Token = readTokenValue(token.PerExp_Token); 

  const userRG = ["1", "2", "3", "4", "5", "6"];
  // const userPST = [
  //   "PST014",
  //   "PST015",
  //   "PST016",
  //   "PST017",
  //   "PST018",
  //   "PST019",
  //   "PST119",
  //   "PST020",
  //   "PST025",
  //   "PST083",
  //   "PST084",
  // ];
  const adminWP = ["003792"];

  const isUser =
    userRG.includes(PerRG) && PerST === "1";
  const isAdmin = adminWP.includes(PerD) || (AgU === "AGAD" && PerST === "1");
  // const isUserOut = PerWP === "WP1075";

  // if (isUserOut) return { role: "userOut", PerExp_Token };
  if (isAdmin) return { role: "admin", PerExp_Token };
  if (isUser) return { role: "user", PerExp_Token };

  return { role: "guest", PerExp_Token };
}

//แยกสิทธิ์ระดับ User
function getUserLevelFromToken(token, role) {
  if (role !== "user") return "employee";

  const PerPST_LV = Number(readTokenValue(token.PerPST_LV));
  const PerRG = readTokenValue(token.PerRG);

  if (PerPST_LV >= 4 || PerRG === "5") return "manager";
  if (PerPST_LV >= 2 || PerRG === "3" || PerRG === "4") return "leader";

  return "employee";
}

export default function AuthGuard() {
  const [token, setToken] = useState(() => getInitialUserDetail());
  const [loading, setLoading] = useState(true);
  const lastTokenKey = useRef("");
  const location = useLocation();
  const navigate = useNavigate();

  const publicRoutes = [/^\/DataReportDSRs\/.+$/];
  const isPublicRoute = publicRoutes.some((regex) =>
    regex.test(location.pathname),
  );

  useEffect(() => {
    const syncToken = (force = false) => {
      const nextTokenKey = getTokenStorageKey(location.search);

      if (!force && nextTokenKey === lastTokenKey.current) return;

      lastTokenKey.current = nextTokenKey;
      setLoading(true);
      setToken(getInitialUserDetail());
    };

    syncToken(true);

    const handleFocus = () => syncToken();
    const handleStorage = () => syncToken(true);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    const intervalId = window.setInterval(syncToken, 1000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(intervalId);
    };
  }, [location.search]);

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    if (!token) {
      if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }

      setLoading(false);
      return;
    }

    try {
      const { role, PerExp_Token } = getRoleFromToken(token);
      const userLevel = getUserLevelFromToken(token, role);

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

      localStorage.setItem(appConfig.auth.roleStorageKey, role);
      localStorage.setItem(appConfig.auth.userLevelStorageKey, userLevel);

      const homePath = getRoleHomePath(role, userLevel);
      const allowedPaths = getAllowedPaths(role, { userLevel });
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
  }, [isPublicRoute, token, navigate, location.pathname]);

  if (loading) return null;
  return null;
}
