import {
  EyeOutlined,
  IdcardOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import { supervisorProfiles } from "./adminAssessmentData";

function getAverageScore(profile) {
  const total = profile.history.reduce((sum, item) => sum + item.score, 0);
  return (total / profile.history.length).toFixed(2);
}

export default function AdminSupervisorProfilePage() {
  const navigate = useNavigate();
  const totalHistory = supervisorProfiles.reduce(
    (sum, item) => sum + item.history.length,
    0,
  );

  const columns = [
    {
      title: "หัวหน้าผู้ถูกประเมิน",
      key: "profile",
      render: (_, row) => (
        <Space size={12}>
          <Avatar className="supervisor-avatar" icon={<UserOutlined />} />
          <div>
            <Typography.Text strong>{row.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                {row.employeeCode} / {row.currentPosition}
              </Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "ฝ่าย/พื้นที่ปัจจุบัน",
      key: "area",
      render: (_, row) => (
        <div>
          <Typography.Text>{row.currentDepartment}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.currentWorkArea}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "ประวัติประเมิน",
      key: "history",
      align: "center",
      render: (_, row) => `${row.history.length} รอบ`,
    },
    {
      title: "คะแนนเฉลี่ยย้อนหลัง",
      key: "average",
      align: "center",
      render: (_, row) => <Tag color="blue">{getAverageScore(row)}/4</Tag>,
    },
    {
      title: "สถานะ",
      key: "status",
      render: (_, row) => <Tag color={row.statusColor}>{row.status}</Tag>,
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, row) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => navigate(`/Admin_Supervisor_Profile/${row.employeeCode}`)}
        >
          ดูโปรไฟล์
        </Button>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Supervisor Directory"
      title="ประวัติหัวหน้าผู้ถูกประเมิน"
      description="ตารางรายชื่อหัวหน้าสำหรับเจ้าหน้าที่ เลือกดูโปรไฟล์เพื่อดูประวัติการถูกประเมิน ตำแหน่ง และพื้นที่ย้อนหลัง"
      showBack={false}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="หัวหน้าทั้งหมด" value={`${supervisorProfiles.length} คน`} detail="มีประวัติในระบบ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ประวัติประเมินรวม" value={`${totalHistory} รอบ`} detail="รวมทุกปีและทุกรอบ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ตำแหน่งหัวหน้า" value="ติดตามได้" detail="ดูย้อนหลังตามตำแหน่ง/พื้นที่" />
        </Col>
      </Row>

      <Card
        className="clean-card admin-table-card"
        title="รายชื่อหัวหน้าผู้ถูกประเมิน"
        variant="outlined"
      >
        <Table
          columns={columns}
          dataSource={supervisorProfiles}
          pagination={false}
          rowKey="employeeCode"
          scroll={{ x: 920 }}
        />
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space align="center">
          <IdcardOutlined className="list-icon" />
          <Typography.Text type="secondary">
            หน้านี้เหมาะสำหรับค้นประวัติหัวหน้าแบบรายบุคคล ก่อนเข้าไปดู profile และ timeline การถูกประเมินย้อนหลัง
          </Typography.Text>
        </Space>
      </Card>
    </PagePanel>
  );
}
