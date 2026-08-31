import {
  BarChartOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FlagOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
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
import PagePanel, { MetricCard } from "../components/PagePanel";
import {
  assessmentRounds,
  getPercent,
  supervisorRows,
} from "./adminAssessmentData";

function getRoundSummary(roundId) {
  const rows = supervisorRows.filter((item) => item.roundId === roundId);
  const totalEvaluators = rows.reduce((sum, item) => sum + item.totalEvaluators, 0);
  const totalSubmitted = rows.reduce((sum, item) => sum + item.submitted, 0);
  const averageScore = rows.length
    ? rows.reduce((sum, item) => sum + item.averageScore, 0) / rows.length
    : 0;

  return {
    rows,
    totalSupervisors: rows.length,
    totalEvaluators,
    totalSubmitted,
    completed: rows.filter((item) => item.pending === 0).length,
    pending: rows.filter((item) => item.pending > 0).length,
    approved: rows.filter((item) => item.hrApproved).length,
    percent: totalEvaluators ? getPercent(totalSubmitted, totalEvaluators) : 0,
    averageScore,
  };
}

export default function AdminExecutiveDashboardPage() {
  const latestRoundId = assessmentRounds[0].id;
  const [selectedRoundId, setSelectedRoundId] = useState(latestRoundId);
  const selectedRound = assessmentRounds.find((round) => round.id === selectedRoundId);
  const currentSummary = useMemo(
    () => getRoundSummary(selectedRoundId),
    [selectedRoundId],
  );
  const roundSummaries = useMemo(
    () =>
      assessmentRounds.map((round) => ({
        ...round,
        ...getRoundSummary(round.id),
      })),
    [],
  );

  const areaRows = useMemo(() => {
    const areaMap = new Map();

    currentSummary.rows.forEach((item) => {
      const current = areaMap.get(item.workArea) || {
        workArea: item.workArea,
        supervisors: 0,
        totalEvaluators: 0,
        submitted: 0,
        scoreTotal: 0,
      };

      areaMap.set(item.workArea, {
        ...current,
        supervisors: current.supervisors + 1,
        totalEvaluators: current.totalEvaluators + item.totalEvaluators,
        submitted: current.submitted + item.submitted,
        scoreTotal: current.scoreTotal + item.averageScore,
      });
    });

    return Array.from(areaMap.values()).map((item) => ({
      ...item,
      percent: item.totalEvaluators ? getPercent(item.submitted, item.totalEvaluators) : 0,
      averageScore: item.scoreTotal / item.supervisors,
    }));
  }, [currentSummary.rows]);

  const columns = [
    {
      title: "รอบประเมิน",
      dataIndex: "label",
      key: "label",
      render: (_, row) => (
        <div>
          <Typography.Text strong>{row.label}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.detail}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "หัวหน้า",
      dataIndex: "totalSupervisors",
      key: "totalSupervisors",
      align: "center",
      render: (value) => `${value} คน`,
    },
    {
      title: "ส่งแล้ว",
      key: "submitted",
      render: (_, row) => (
        <div className="admin-progress-cell">
          <Progress percent={row.percent} size="small" />
          <Typography.Text type="secondary">
            {row.totalSubmitted}/{row.totalEvaluators} รายการ
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "คะแนนเฉลี่ย",
      dataIndex: "averageScore",
      key: "averageScore",
      align: "center",
      render: (score) => <Tag color="blue">{score.toFixed(2)}/4</Tag>,
    },
    {
      title: "สถานะรวม",
      key: "status",
      render: (_, row) => (
        <Space wrap>
          <Tag color="success">ครบ {row.completed}</Tag>
          <Tag color="warning">ติดตาม {row.pending}</Tag>
          <Tag color="blue">อนุมัติ {row.approved}</Tag>
        </Space>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Executive Dashboard"
      title="แดชบอร์ดภาพรวมการประเมิน"
      description={`ภาพรวมสำหรับผู้บริหารของ${selectedRound?.detail || "รอบประเมินที่เลือก"}`}
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
          <MetricCard label="หัวหน้าที่อยู่ในรอบ" value={`${currentSummary.totalSupervisors} คน`} detail={selectedRound?.label} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ความคืบหน้ารวม" value={`${currentSummary.percent}%`} detail={`${currentSummary.totalSubmitted}/${currentSummary.totalEvaluators} รายการ`} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="คะแนนเฉลี่ยรวม" value={`${currentSummary.averageScore.toFixed(2)}/4`} detail="เฉลี่ยจากหัวหน้าทั้งหมด" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="รอผู้บริหาร/HR" value={`${currentSummary.pending} คน`} detail="ยังมีรายการต้องติดตาม" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24} lg={15}>
          <Card className="clean-card executive-hero-card" variant="outlined">
            <div className="executive-hero">
              <div>
                <Typography.Text className="access-eyebrow">Overall Performance</Typography.Text>
                <Typography.Title level={3}>
                  ภาพรวม{selectedRound?.label} อยู่ที่ {currentSummary.percent}%
                </Typography.Title>
                <Typography.Paragraph>
                  สรุปความคืบหน้าและคุณภาพผลประเมินสำหรับผู้บริหาร เพื่อตัดสินใจติดตามแต่ละพื้นที่ได้เร็วขึ้น
                </Typography.Paragraph>
                <Space wrap>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    ประเมินครบ {currentSummary.completed} คน
                  </Tag>
                  <Tag color="warning" icon={<WarningOutlined />}>
                    รอติดตาม {currentSummary.pending} คน
                  </Tag>
                  <Tag color="blue" icon={<FlagOutlined />}>
                    HR อนุมัติแล้ว {currentSummary.approved} คน
                  </Tag>
                </Space>
              </div>
              <Progress
                type="dashboard"
                percent={currentSummary.percent}
                size={150}
                strokeColor="#0f5fb3"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card className="clean-card executive-side-card" title="พื้นที่ที่ต้องติดตาม" variant="outlined">
            <div className="executive-area-list">
              {areaRows.map((item) => (
                <div className="executive-area-item" key={item.workArea}>
                  <div>
                    <Typography.Text strong>{item.workArea}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        หัวหน้า {item.supervisors} คน / คะแนน {item.averageScore.toFixed(2)}/4
                      </Typography.Text>
                    </div>
                  </div>
                  <Progress percent={item.percent} size="small" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <DashboardOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">รอบที่เปิดดูได้</Typography.Text>
            <Typography.Title level={3}>{assessmentRounds.length} รอบ</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <TeamOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">พื้นที่ในรอบนี้</Typography.Text>
            <Typography.Title level={3}>{areaRows.length} พื้นที่</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="clean-card executive-status-card" variant="outlined">
            <BarChartOutlined className="admin-detail-icon" />
            <Typography.Text type="secondary">สถานะรายงาน</Typography.Text>
            <Typography.Title level={3}>พร้อมสรุป</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="clean-card admin-table-card" title="เปรียบเทียบภาพรวมแต่ละรอบ" variant="outlined">
        <Table
          columns={columns}
          dataSource={roundSummaries}
          pagination={false}
          rowKey="id"
          scroll={{ x: 900 }}
        />
      </Card>
    </PagePanel>
  );
}
