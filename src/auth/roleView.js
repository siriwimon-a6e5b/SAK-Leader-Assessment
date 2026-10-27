import { appConfig } from "../config/appConfig";
import { readTokenValue } from "../utils/tokenUtils";
import { getRoleFromToken } from "./roleAccess";

function preferenceKey(token) {
  return `assessment-role-view:${readTokenValue(token?.PerD)}`;
}

export function canSwitchRole(token) {
  if (!token || getRoleFromToken(token).role !== "admin") return false;
  return appConfig.auth.roleSwitchEmployeeIds.includes(readTokenValue(token.PerD));
}

export function getEffectiveRole(token) {
  const access = getRoleFromToken(token);
  if (canSwitchRole(token) && sessionStorage.getItem(preferenceKey(token)) === "user") {
    return { ...access, role: "user" };
  }
  return access;
}

export function setRoleView(token, role) {
  if (!canSwitchRole(token) || !["admin", "user"].includes(role)) return false;
  sessionStorage.setItem(preferenceKey(token), role);
  return true;
}
