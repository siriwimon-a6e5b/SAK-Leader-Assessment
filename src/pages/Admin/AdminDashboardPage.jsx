import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import {
  assessmentRounds,
  getPercent,
  supervisorRows,
} from "./adminAssessmentData";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const latestRoundId = assessmentRounds[0].id;
  const [selectedRoundId, setSelectedRoundId] = useState(latestRoundId);
  const selectedRound = assessmentRounds.find(
    (round) => round.id === selectedRoundId,
  );
  const filteredSupervisorRows = useMemo(
    () => supervisorRows.filter((item) => item.roundId === selectedRoundId),
    [selectedRoundId],
  );

  const summary = useMemo(() => {
    const totalSupervisors = filteredSupervisorRows.length;
    const totalEvaluators = filteredSupervisorRows.reduce(
      (sum, item) => sum + item.totalEvaluators,
      0,
    );
    const totalSubmitted = filteredSupervisorRows.reduce(
      (sum, item) => sum + item.submitted,
      0,
    );
    const completed = filteredSupervisorRows.filter((item) => item.pending === 0).length;

    return {
      totalSupervisors,
      totalEvaluators,
      totalSubmitted,
      completed,
      percent: totalEvaluators ? getPercent(totalSubmitted, totalEvaluators) : 0,
    };
  }, [filteredSupervisorRows]);

  const columns = [
    {
      title: "หัวหน้า",
      dataIndex: "name",
      key: "name",
      render: (_, row) => (
        <Space size={12}>
          <Avatar className="supervisor-avatar" icon={<UserOutlined />} />
          <div>
            <Typography.Text strong>{row.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary">{row.position}</Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "ฝ่าย/พื้นที่",
      key: "department",
      render: (_, row) => (
        <div>
          <Typography.Text>{row.department}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.workArea}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "ความคืบหน้า",
      key: "progress",
      render: (_, row) => {
        const percent = getPercent(row.submitted, row.totalEvaluators);

        return (
          <div className="admin-progress-cell">
            <Progress percent={percent} size="small" />
            <Typography.Text type="secondary">
              ส่งแล้ว {row.submitted}/{row.totalEvaluators} คน
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (_, row) => <Tag color={row.statusColor}>{row.status}</Tag>,
    },
    {
      title: "คะแนนเฉลี่ย",
      dataIndex: "averageScore",
      key: "averageScore",
      align: "center",
      render: (score) => <Tag color="blue">{score.toFixed(2)}/4</Tag>,
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, row) => (
        <Button icon={<EyeOutlined />} onClick={() => navigate(`/Admin_Check/${row.id}`)}>
          ดูรายละเอียด
        </Button>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Admin Console"
      title="จัดการและติดตามการประเมินหัวหน้า"
      description={`ดูสถานะรายหัวหน้า แยกตามฝ่ายและพื้นที่ สำหรับ${selectedRound?.detail || "รอบประเมินที่เลือก"}`}
      action={
        <Select
          className="admin-round-select"
          value={selectedRoundId}
          options={assessmentRounds.map((round) => ({
            label: round.label,
            value: round.id,
          }))}
          onChange={setSelectedRoundId}
        />
      }
      showBack={false}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard label="หัวหน้าทั้งหมด" value={`${summary.totalSupervisors} คน`} detail={selectedRound?.label} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ผู้มีสิทธิ์ประเมิน" value={`${summary.totalEvaluators} คน`} detail="รวมทุกพื้นที่" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ส่งแล้ว" value={`${summary.totalSubmitted} รายการ`} detail={`คิดเป็น ${summary.percent}%`} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ประเมินครบ" value={`${summary.completed} คน`} detail="รอหรืออนุมัติแล้ว" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={16}>
          <Card className="clean-card admin-insight-card" variant="outlined">
            <div className="admin-insight-main">
              <div>
                <Typography.Text className="access-eyebrow">Round Progress</Typography.Text>
                <Typography.Title level={3}>ความคืบหน้ารวม {summary.percent}%</Typography.Title>
                <Typography.Paragraph>
                  ระบบติดตามจำนวนผู้ประเมินที่ส่งข้อมูลแล้ว เทียบกับผู้มีสิทธิ์ทั้งหมดใน{selectedRound?.label}
                </Typography.Paragraph>
              </div>
              <Progress
                type="circle"
                percent={summary.percent}
                size={118}
                strokeColor="#0f5fb3"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="clean-card admin-mini-dashboard" variant="outlined">
            <Space orientation="vertical" size={14} className="full-width">
              <Space align="center">
                <CheckCircleOutlined className="status-icon success" />
                <Typography.Text strong>
                  อนุมัติรับทราบแล้ว {filteredSupervisorRows.filter((item) => item.hrApproved).length} คน
                </Typography.Text>
              </Space>
              <Space align="center">
                <ClockCircleOutlined className="status-icon warning" />
                <Typography.Text strong>
                  รอติดตาม {filteredSupervisorRows.filter((item) => item.pending > 0).length} คน
                </Typography.Text>
              </Space>
              <Tag color="blue" icon={<BarChartOutlined />} className="summary-tag">
                พร้อมสรุปผลรายพื้นที่
              </Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        className="clean-card admin-table-card"
        title="ตารางรายชื่อหัวหน้าและสถานะการประเมิน"
        variant="outlined"
      >
        <Table
          columns={columns}
          dataSource={filteredSupervisorRows}
          pagination={false}
          rowKey="id"
          scroll={{ x: 920 }}
        />
      </Card>

    </PagePanel>
  );
}
