import { SwapOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { appConfig } from "../../config/appConfig";
import { readCurrentUserDetail } from "../../recoilstore/userStores";
import { canSwitchRole, setRoleView } from "../../auth/roleView";
import { getUserLevelFromToken } from "../../auth/roleAccess";

export default function RoleViewSwitch({ currentRole }) {
  const navigate = useNavigate();
  const token = readCurrentUserDetail();
  if (!canSwitchRole(token)) return null;
  const nextRole = currentRole === "admin" ? "user" : "admin";

  const handleSwitch = () => {
    const currentToken = readCurrentUserDetail();
    if (!setRoleView(currentToken, nextRole)) return;
    sessionStorage.setItem(appConfig.auth.roleStorageKey, nextRole);
    sessionStorage.setItem(appConfig.auth.userLevelStorageKey, getUserLevelFromToken(currentToken, nextRole));
    navigate(appConfig.roles[nextRole].homePath, { replace: true });
  };

  return (
    <Button icon={<SwapOutlined />} size="small" onClick={handleSwitch}>
      {nextRole === "user" ? "สลับเป็น User" : "สลับเป็น Admin"}
    </Button>
  );
}
