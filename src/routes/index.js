import { DownOutlined } from "@ant-design/icons";
import React from "react";
import { appConfig } from "../config/appConfig";
import { adminRoutes } from "./adminRoutes";
import { userRoutes } from "./userRoutes";

export { adminRoutes, userRoutes };

export const roleRoutes = {
  admin: adminRoutes,
  user: userRoutes,
  userOut: userRoutes.filter((route) => route.path === "/User_out"),
};

export const roleHomePath = {
  admin: "/Admin_Check",
  user: "/User_Check",
  userOut: "/User_out",
};

function isAllowedForUserLevel(route, userLevel) {
  if (!route.allowedUserLevels || !userLevel) return true;
  return route.allowedUserLevels.includes(userLevel);
}

function filterRoutesByAccess(routes, options = {}) {
  return routes
    .filter((route) => isAllowedForUserLevel(route, options.userLevel))
    .map((route) => ({
      ...route,
      children: route.children
        ? filterRoutesByAccess(route.children, options)
        : undefined,
    }))
    .filter((route) => !route.children || route.children.length > 0 || route.path || route.externalUrl);
}

function flattenRoutes(routes) {
  return routes.flatMap((route) => [
    ...(route.path ? [route] : []),
    ...(route.children ? flattenRoutes(route.children) : []),
  ]);
}

export function getAllowedPaths(role, options = {}) {
  const allowedRoutes = filterRoutesByAccess(roleRoutes[role] || [], options);
  return [...new Set(flattenRoutes(allowedRoutes).map((route) => route.path))];
}

export function getRoleHomePath(role, userLevel) {
  if (role === "user") {
    return appConfig.userLevels[userLevel]?.homePath || roleHomePath.user;
  }

  return roleHomePath[role];
}

export function getMenuItems(routes, options = {}) {
  return filterRoutesByAccess(routes, options)
    .filter((route) => route.showInMenu)
    .map((route) => ({
      key: route.menuKey || route.path || route.key,
      icon: route.icon,
      label: route.children
        ? React.createElement(
            "span",
            { className: "submenu-label" },
            route.label,
            React.createElement(DownOutlined, {
              className: "submenu-label-icon",
            }),
          )
        : route.label,
      externalUrl: route.externalUrl,
      children: route.children
        ?.filter((child) => child.showInMenu !== false)
        .map((child) => ({
          key: child.menuKey || child.path || child.key,
          icon: child.icon,
          label: child.label,
          externalUrl: child.externalUrl,
        })),
    }));
}

export function getUniqueRoutes(routes) {
  const routeMap = new Map();

  flattenRoutes(routes).forEach((route) => {
    if (!routeMap.has(route.path)) {
      routeMap.set(route.path, route);
    }
  });

  return Array.from(routeMap.values());
}
