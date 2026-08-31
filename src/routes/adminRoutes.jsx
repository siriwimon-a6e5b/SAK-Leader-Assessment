import { lazy } from "react";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  IdcardOutlined,
  RollbackOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { Badge } from "antd";
import { appConfig } from "../config/appConfig";
import { assessmentApprovalItems } from "../pages/Admin/adminAssessmentData";

const AdminApprovalPage = lazy(() => import("../pages/Admin/AdminApprovalPage"));
const AdminDashboardPage = lazy(() => import("../pages/Admin/AdminDashboardPage"));
const AdminExecutiveDashboardPage = lazy(() =>
  import("../pages/Admin/AdminExecutiveDashboardPage"),
);
const AdminHistoryPage = lazy(() => import("../pages/Admin/AdminHistoryPage"));
const AdminSupervisorDetailPage = lazy(() =>
  import("../pages/Admin/AdminSupervisorDetailPage"),
);
const AdminSupervisorProfilePage = lazy(() =>
  import("../pages/Admin/AdminSupervisorProfilePage"),
);
const AdminSupervisorProfileDetailPage = lazy(() =>
  import("../pages/Admin/AdminSupervisorProfileDetailPage"),
);

const pendingApprovalCount = assessmentApprovalItems.filter(
  (item) => item.status === "รอตรวจ",
).length;

const AdminAssessmentRoundsPage = lazy(() =>
  import("../pages/Admin/AdminAssessmentRoundsPage"),
);
const AdminAssessmentRoundDetailPage = lazy(() =>
  import("../pages/Admin/AdminAssessmentRoundDetailPage"),
);
const AdminAssessmentFormsPage = lazy(() =>
  import("../pages/Admin/AdminAssessmentFormsPage"),
);

export const adminRoutes = [
 {
     key: "dashboard",
     externalUrl: appConfig.auth.dashboardUrl,
     label: "กลับหน้าหลัก",
     icon:<RollbackOutlined />,
     showInMenu: true,
   },

    {
    key: "assessment",
    label: "Dashboard",
    icon: <BarChartOutlined />,
    showInMenu: true,
    children: [
      {
        path: "/Admin_Check",
        label: "แดชบอร์ดติดตามการประเมิน",
        icon: <SafetyOutlined />,
        element: <AdminDashboardPage />,
        showInMenu: true,
      }, {
        path: "/Admin_Dashboard",
        label: "แดชบอร์ดผู้บริหาร",
        icon: <BarChartOutlined />,
        element: <AdminExecutiveDashboardPage />,
        showInMenu: true,
      },
    ],
  },
  // {
  //   path: "/Admin_Dashboard",
  //   label: "แดชบอร์ดผู้บริหาร",
  //   icon: <BarChartOutlined />,
  //   element: <AdminExecutiveDashboardPage />,
  //   showInMenu: true,
  // },
  // {
  //   path: "/Admin_Check",
  //   label: "แดชบอร์ดติดตามการประเมิน",
  //   icon: <SafetyOutlined />,
  //   element: <AdminDashboardPage />,
  //   showInMenu: true,
  // },

  
  {
    path: "/Admin_Assessment_Rounds/:roundId",
    label: "รายละเอียดรอบประเมิน",
    icon: <CalendarOutlined />,
    element: <AdminAssessmentRoundDetailPage />,
    showInMenu: false,
  },
  
  {
    path: "/Admin_Check/:supervisorId",
    label: "รายละเอียดผลการประเมิน",
    icon: <FileTextOutlined />,
    element: <AdminSupervisorDetailPage />,
    showInMenu: false,
  },
  {
    path: "/Admin_Approval",
    label: (
      <span className="menu-label-with-badge">
        อนุมัติผลการประเมิน
        <Badge count={pendingApprovalCount} size="small" />
      </span>
    ),
    icon: <CheckSquareOutlined />,
    element: <AdminApprovalPage />,
    showInMenu: true,
  },
  
  {
    path: "/Admin_Supervisor_Profile",
    label: "ประวัติหัวหน้าผู้ถูกประเมิน",
    icon: <IdcardOutlined />,
    element: <AdminSupervisorProfilePage />,
    showInMenu: true,
  },
  {
    path: "/Admin_Assessment_Rounds",
    label: "สร้างรอบประเมิน",
    icon: <CalendarOutlined />,
    element: <AdminAssessmentRoundsPage />,
    showInMenu: true,
  },
  {
    path: "/Admin_Supervisor_Profile/:employeeCode",
    label: "โปรไฟล์หัวหน้าผู้ถูกประเมิน",
    icon: <IdcardOutlined />,
    element: <AdminSupervisorProfileDetailPage />,
    showInMenu: false,
  },
    {
    path: "/Admin_Assessment_Forms",
    label: "จัดการแบบฟอร์มประเมิน",
    icon: <FileTextOutlined />,
    element: <AdminAssessmentFormsPage />,
    showInMenu: true,
  },
  // {
  //   path: "/Admin_History",
  //   label: "ประวัติการใช้งานระบบ",
  //   icon: <HistoryOutlined />,
  //   element: <AdminHistoryPage />,
  //   showInMenu: true,
  // },

  
  // {
  //   path: "/Admin_Check",
  //   menuKey: "/Admin_Check?section=report",
  //   label: "รายงาน",
  //   icon: <BarChartOutlined />,
  //   element: <AdminDashboardPage />,
  //   showInMenu: true,
  // },
  
  // {
  //   path: "/Admin_Check",
  //   menuKey: "/Admin_Check?section=reports",
  //   label: "ประวัติการใช้งานระบบ",
  //   icon: <HistoryOutlined />,
  //   element: <AdminDashboardPage />,
  //   showInMenu: true,
  // },
 
];
