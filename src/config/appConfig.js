const manualPaths = {
  hr: "/doc/(ส่วนของเจ้าหน้าที่ฝ่ายบุคคล) คู่มือการใช้ระบบประเมินผู้บังคับบัญชา.pdf",
  employee: "/doc/(ส่วนของพนักงาน) คู่มือการใช้ระบบประเมินผู้บังคับบัญชา.pdf",
  regional: "/doc/(ส่วนของเขต) คู่มือการใช้ระบบประเมินผู้บังคับบัญชา.pdf",
};

export const appConfig = {
  appName: "SAK Leader Assessment",
  manuals: manualPaths,
  manualRules: {
    // LV001-LV006 เห็นคู่มือพนักงานและคู่มือส่วนของเขต
    regionalMaximumPositionLevel: 6,
  },
  auth: {
    loginUrl: "https://appncar.sakerp.org/",
    dashboardUrl: import.meta.env.VITE_BASE_URL_DASHBOARDD,
    tokenStorageKey: "userToken",
    roleStorageKey: "role",
    userLevelStorageKey: "userLevel",
    // รหัสพนักงานและรหัสฝ่ายที่อนุญาตให้แสดงปุ่มสลับมุมมอง Admin/User
    roleSwitchEmployeeIds: ["003792","000806","002367","000430","001094","002322"],  
    roleSwitchWorkplaceCodes: ["WP0011"],//เจ้าหน้าที่บุคคล
  },
  roles: { 
    admin: {
      label: "ผู้ดูแลระบบ",
      subtitle: "ระบบจัดการการประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ดูแลระบบ",
      manualPath: manualPaths.hr,
      footerLabel: "Admin console",
      homePath: "/Admin_Check",
    },
    user: {
      label: "ผู้ใช้งาน",
      subtitle: "ระบบประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ใช้งาน",
      manualPath: manualPaths.employee,
      footerLabel: "User portal",
      homePath: "/User_Check",
    },
    userOut: {
      label: "ผู้ใช้งาน",
      subtitle: "ระบบประเมินหัวหน้างาน",
      manualLabel: "คู่มือผู้ใช้งาน",
      manualPath: manualPaths.employee,
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
      // ผู้ใช้ทุกระดับต้องเข้าหน้ารายการประเมินก่อนเสมอ
      homePath: "/User_Check",
    },
    manager: {
      label: "ผู้จัดการ",
      // จากหน้านี้ยังสามารถเปิดหน้าภาพรวมทีมตามสิทธิ์ได้ตามปกติ
      homePath: "/User_Check",
    },
  },
};
