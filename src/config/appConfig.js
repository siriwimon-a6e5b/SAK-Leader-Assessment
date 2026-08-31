export const appConfig = {
  appName: "SAK Leader Assessment",
  auth: {
    loginUrl: "https://appncar.sakerp.org/",
    dashboardUrl: import.meta.env.VITE_BASE_URL_DASHBOARDD || "https://appncar.sakerp.org/systemApp/dashboard",
    tokenStorageKey: "userToken",
    roleStorageKey: "role",
    userLevelStorageKey: "userLevel",
  },
  roles: {
    admin: {
      label: "ผู้ดูแลระบบ",
      subtitle: "ระบบจัดการการประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ดูแลระบบ",
      footerLabel: "Admin console",
      homePath: "/Admin_Check",
    },
    user: {
      label: "ผู้ใช้งาน",
      subtitle: "ระบบประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ใช้งาน",
      footerLabel: "User portal",
      homePath: "/User_Check",
    },
    userOut: {
      label: "ผู้ใช้งาน",
      subtitle: "ระบบประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ใช้งาน",
      footerLabel: "User portal",
      homePath: "/User_out",
    },
  },
  userLevels: {
    employee: {
      label: "พนักงานทั่วไป",
      homePath: "/User_Check",
    },
    leader: {
      label: "หัวหน้าผู้ถูกประเมิน",
      homePath: "/Leader_Check",
    },
    manager: {
      label: "ผู้จัดการ",
      homePath: "/Manager_Check",
    },
  },
};
