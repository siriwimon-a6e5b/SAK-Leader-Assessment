import { appConfig } from "../config/appConfig";
import { readTokenValue } from "../utils/tokenUtils";
import { getRoleFromToken } from "./roleAccess";

function preferenceKey(token) {
  return `assessment-role-view:${readTokenValue(token?.PerD)}`;
}

export function canSwitchRole(token) {
  if (!token) return false;

  const access = getRoleFromToken(token);
  const employeeId = readTokenValue(token.PerD);
  const workplaceCode = readTokenValue(token.PerWP);
  const isAllowedEmployee = appConfig.auth.roleSwitchEmployeeIds.includes(employeeId);
  const isAllowedWorkplace = appConfig.auth.roleSwitchWorkplaceCodes.includes(workplaceCode);

  return access.role === "admin" || isAllowedEmployee || isAllowedWorkplace;
}

export function getEffectiveRole(token) {
  const access = getRoleFromToken(token);
  if (canSwitchRole(token)) {
    const selectedRole = sessionStorage.getItem(preferenceKey(token));

    if (["admin", "user"].includes(selectedRole)) {
      return { ...access, role: selectedRole };
    }
  }

  return access;
}

export function setRoleView(token, role) {
  if (!canSwitchRole(token) || !["admin", "user"].includes(role)) return false;
  sessionStorage.setItem(preferenceKey(token), role);
  return true;
}
