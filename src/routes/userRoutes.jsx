import { lazy } from "react";
import {
  AuditOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  RollbackOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { appConfig } from "../config/appConfig";

const LeaderDashboardPage = lazy(() => import("../pages/User/LeaderDashboardPage"));
const ManagerDashboardPage = lazy(() => import("../pages/User/ManagerDashboardPage"));
const PeerAssessmentPage = lazy(() => import("../pages/User/PeerAssessmentPage"));
const SupervisorAssessmentFormPage = lazy(() =>
  import("../pages/User/SupervisorAssessmentFormPage"),
);
const SupervisorAssessmentPage = lazy(() =>
  import("../pages/User/SupervisorAssessmentPage"),
);
const TransferredSupervisorAssessmentPage = lazy(() =>
  import("../pages/User/TransferredSupervisorAssessmentPage"),
);
const UserDashboardPage = lazy(() => import("../pages/User/UserDashboardPage"));
const UserReportPage = lazy(() => import("../pages/User/UserReportPage"));

const allUserLevels = ["employee", "leader", "manager"];

export const userRoutes = [
  {
    key: "dashboard",
    externalUrl: appConfig.auth.dashboardUrl,
    label: "กลับหน้าหลัก",
    icon: <RollbackOutlined />,
    showInMenu: true,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/User_Check",
    label: "ประเมินประจำปี",
    icon: <AuditOutlined />,
    element: <UserDashboardPage />,
    showInMenu: true,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/User_Assess_Supervisor",
    label: "ประเมินผู้บังคับบัญชา",
    icon: <AuditOutlined />,
    element: <SupervisorAssessmentPage />,
    showInMenu: false,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/User_Assess_Transferred_Supervisor",
    label: "ประเมินหัวหน้าเดิมกรณีโยกย้าย",
    icon: <AuditOutlined />,
    element: <TransferredSupervisorAssessmentPage />,
    showInMenu: false,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/User_Assess_Supervisor_Form/:supervisorId",
    label: "แบบประเมินผู้บังคับบัญชา",
    icon: <FileTextOutlined />,
    element: <SupervisorAssessmentFormPage />,
    showInMenu: false,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/User_Assess_Peer",
    label: "ประเมินเพื่อนร่วมงาน",
    icon: <TeamOutlined />,
    element: <PeerAssessmentPage />,
    showInMenu: false,
    allowedUserLevels: allUserLevels,
  },
  // {
  //   path: "/User_Check",
  //   menuKey: "/User_Check?section=history",
  //   label: "ประวัติรายการ",
  //   icon: <ProfileOutlined />,
  //   element: <UserDashboardPage />,
  //   showInMenu: true,
  //   allowedUserLevels: ["employee"],
  // },
  {
    path: "/User_out",
    label: "ประวัติการประเมิน",
    icon: <FileSearchOutlined />,
    element: <UserReportPage />,
    showInMenu: true,
    allowedUserLevels: allUserLevels,
  },
  {
    path: "/Leader_Check",
    label: "ผลการประเมินของฉัน",
    icon: <BarChartOutlined />,
    element: <LeaderDashboardPage />,
    showInMenu: true,
    allowedUserLevels: ["employee","leader", "manager"],
  },
  // {
  //   key: "leader-assessment",
  //   label: "งานประเมินของหัวหน้า",
  //   icon: <SolutionOutlined />,
  //   showInMenu: true,
  //   allowedUserLevels: ["leader","employee"],
  //   children: [
  //     {
  //       path: "/Leader_Check",
  //       menuKey: "/Leader_Check?section=evaluator",
  //       label: "รายชื่อผู้ประเมิน",
  //       icon: <TeamOutlined />,
  //       element: <LeaderDashboardPage />,
  //       allowedUserLevels: ["leader","employee"],
  //     },
  //     {
  //       path: "/Leader_Check",
  //       menuKey: "/Leader_Check?section=status",
  //       label: "สถานะรอบประเมิน",
  //       icon: <FileTextOutlined />,
  //       element: <LeaderDashboardPage />,
  //       allowedUserLevels: ["leader","employee"],
  //     },
  //   ],
  // },
  {
    path: "/Manager_Check",
    label: "ภาพรวมทีม",
    icon: <BarChartOutlined />,
    element: <ManagerDashboardPage />,
    showInMenu: true,
    allowedUserLevels: ["manager"],
  },
  {
    key: "manager-report",
    label: "รายงานผู้จัดการ",
    icon: <FileSearchOutlined />,
    showInMenu: true,
    allowedUserLevels: ["manager"],
    children: [
      {
        path: "/Manager_Check",
        menuKey: "/Manager_Check?section=team",
        label: "สถานะทีม",
        icon: <TeamOutlined />,
        element: <ManagerDashboardPage />,
        allowedUserLevels: ["manager"],
      },
      {
        path: "/Manager_Check",
        menuKey: "/Manager_Check?section=summary",
        label: "สรุปผลประเมิน",
        icon: <BarChartOutlined />,
        element: <ManagerDashboardPage />,
        allowedUserLevels: ["manager"],
      },
    ],
  },
];
