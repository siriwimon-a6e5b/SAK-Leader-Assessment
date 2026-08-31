import {
  ApartmentOutlined,
  ArrowRightOutlined,
  SwapOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Card, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import PagePanel from "../components/PagePanel";

const currentAssessmentRound = {
  startDate: "2026-06-01",
  endDate: "2026-06-30",
};

const transferHistories = [
  {
    transferDate: "2026-06-01",
    fromWorkArea: "สาขารังสิต",
    toWorkArea: "สำนักงานใหญ่",
  },
];

function isDateInRange(date, startDate, endDate) {
  const time = new Date(date).getTime();
  return time >= new Date(startDate).getTime() && time <= new Date(endDate).getTime();
}

const hasTransferDuringAssessmentRound = transferHistories.some((item) =>
  isDateInRange(
    item.transferDate,
    currentAssessmentRound.startDate,
    currentAssessmentRound.endDate,
  ),
);

const assessmentMenus = [
  {
    title: "ประเมินผู้บังคับบัญชา",
    description: "เข้าสู่แบบประเมินหัวหน้างานหรือผู้บังคับบัญชาโดยตรง",
    icon: <ApartmentOutlined />,
    path: "/User_Assess_Supervisor",
  },
  {
    title: "ประเมินหัวหน้าเดิมกรณีโยกย้าย",
    description: "สำหรับพนักงานที่ย้ายพื้นที่ระหว่างรอบประเมิน และต้องประเมินหัวหน้าเดิม",
    icon: <SwapOutlined />,
    path: "/User_Assess_Transferred_Supervisor",
    visibleWhen: () => hasTransferDuringAssessmentRound,
  },
  // {
  //   title: "ประเมินเพื่อนร่วมงาน",
  //   description: "เข้าสู่แบบประเมินเพื่อนร่วมงานในรอบประเมินปัจจุบัน",
  //   icon: <TeamOutlined />,
  //   path: "/User_Assess_Peer",
  //   disabled: true,
  // },
  
];

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const visibleAssessmentMenus = assessmentMenus.filter((item) =>
    item.visibleWhen ? item.visibleWhen() : true,
  );
  const menuLayoutClass =
    visibleAssessmentMenus.length === 1
      ? "is-one-item"
      : visibleAssessmentMenus.length === 2
      ? "is-two-items"
      : "is-three-items";

  return (
    <PagePanel
      eyebrow="Assessment"
      title="เลือกประเภทการประเมิน"
      description="เลือกแบบประเมินที่ต้องการดำเนินการในรอบปัจจุบัน"
      showBack={false}
    >
      <div className={`assessment-choice-grid ${menuLayoutClass}`}>
        {visibleAssessmentMenus.map((item) => (
          <button
            className={`assessment-choice-button${item.disabled ? " is-disabled" : ""}`}
            type="button"
            disabled={item.disabled}
            key={item.path}
            onClick={() => {
              if (!item.disabled) navigate(item.path);
            }}
          >
            <span className="assessment-choice-icon">{item.icon}</span>
            <span className="assessment-choice-content">
              <span className="assessment-choice-title">
                <Typography.Text strong>{item.title}</Typography.Text>
                {item.disabled ? <Tag>ยังไม่เปิดใช้งาน</Tag> : null}
              </span>
              <Typography.Text type="secondary">{item.description}</Typography.Text>
            </span>
            <ArrowRightOutlined className="assessment-choice-arrow" />
          </button>
        ))}
      </div>

      <Card className="clean-card compact-card" variant="outlined">
        <div className="data-list-item">
          <div className="data-list-main">
            <UserSwitchOutlined className="list-icon" />
            <div>
              <Typography.Text strong>รอบประเมินปัจจุบัน</Typography.Text>
              <div>
                <Typography.Text type="secondary">
                  ระบบจะแสดงแบบประเมินตามสิทธิ์และรอบที่เปิดใช้งานa
                </Typography.Text>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </PagePanel>
  );
}
