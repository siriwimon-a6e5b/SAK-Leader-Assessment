import {
  ArrowUpOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  SmileOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import apiClient from "../../recoilstore/userStores";
import PagePanel from "../components/PagePanel";
import AiAnalysisSummary from "../components/AiAnalysisSummary";

const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";
const SUPERVISOR_DETAIL_API = "/getAssessmentSupervisorDetail";

const assessmentTypes = [
  {
    EVT_ID: "1",
    title: "ส่วนที่ 1 : การประเมินโดยผู้ใต้บังคับบัญชา",
    totalTitle: "คะแนนประเมินโดยรวมจากผู้ใต้บังคับบัญชา",
    icon: <SmileOutlined />,
    accent: "teal",
  },
  {
    EVT_ID: "2",
    title: "ส่วนที่ 2 : การทำงานร่วมกันและความเป็นหนึ่งเดียวของทีม",
    totalTitle: "คะแนนการทำงานร่วมกันโดยรวม",
    icon: <TeamOutlined />,
    accent: "blue",
  },
  {
    EVT_ID: "3",
    title: "ส่วนที่ 3 : การประเมินผลการปฏิบัติงานประจำปี",
    totalTitle: "คะแนนผลการปฏิบัติงานโดยรวม",
    icon: <TrophyOutlined />,
    accent: "navy",
  },
];

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPhotoUrl(photo) {
  if (!photo || photo === "-") return undefined;
  return `${EMPLOYEE_PHOTO_URL}/${encodeURIComponent(photo)}`;
}

function getScoreLabel(score) {
  if (score >= 4.5) return "ยอดเยี่ยม";
  if (score >= 4) return "ดีมาก";
  if (score >= 3) return "ดี";
  if (score > 0) return "ควรติดตาม";
  return "ยังไม่มีคะแนน";
}

function getSupervisorData(apiSupervisor, queryData, selectedRound) {
  const totalEvaluators = toNumber(apiSupervisor.numsum || queryData.numsum);
  const submitted = toNumber(
    apiSupervisor.EVP_set_evaluators || queryData.EVP_set_evaluators,
  );
  const pending = Math.max(totalEvaluators - submitted, 0);

  return {
    EVP_TargetID: apiSupervisor.EVP_TargetID || queryData.EVP_TargetID || "",
    EVP_TargetName: apiSupervisor.EVP_TargetName || "-",
    EVP_PositionName: apiSupervisor.EVP_PositionName || "-",
    EVP_WorkplaceName: apiSupervisor.EVP_WorkplaceName || "-",
    EVP_Photo: apiSupervisor.EVP_Photo || "",
    EVC_Period:
      selectedRound.EVC_Period ||
      apiSupervisor.EVC_Period ||
      queryData.EVC_Code,
    averageScore: toNumber(
      apiSupervisor.averageScore || queryData.averageScore,
    ),
    totalEvaluators,
    submitted,
    pending,
    statusText: pending > 0 ? "รอติดตาม" : "ครบแล้ว",
    statusColor: pending > 0 ? "warning" : "success",
  };
}

function getAssessmentSection(detailRows, aiAnalysisRows, assessmentType) {
  const rows = detailRows.filter(
    (row) => String(row.EVT_ID) === assessmentType.EVT_ID,
  );

  if (!rows.length) return null;

  const topicMap = new Map();
  let totalScore = 0;
  let totalRows = 0;

  rows.forEach((row) => {
    const score = toNumber(row.averageScore);
    const topicName = row.LAC_Name || assessmentType.totalTitle;

    if (score <= 0) return;

    const topic = topicMap.get(topicName) || {
      label: topicName,
      totalScore: 0,
      totalRows: 0,
    };

    topic.totalScore += score;
    topic.totalRows += 1;
    topicMap.set(topicName, topic);

    totalScore += score;
    totalRows += 1;
  });

  if (!totalRows) return null;

  const score = totalScore / totalRows;
  const metrics = Array.from(topicMap.values()).map((topic) => ({
    label: topic.label,
    score: topic.totalScore / topic.totalRows,
  }));
  const aiAnalysis = aiAnalysisRows
    .filter((comment) => String(comment.EVT_ID) === assessmentType.EVT_ID)
    .map((comment) => String(comment.EVP_AIAnalysis || "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    ...assessmentType,
    score,
    label: getScoreLabel(score),
    metrics,
    aiAnalysis,
  };
}

export default function AdminSupervisorDetailPage() {
  const navigate = useNavigate();
  const { supervisorId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const selectedRound = location.state?.selectedRound || {};
  const supervisorFromState = location.state?.supervisor || {};

  const EVC_ID =
    searchParams.get("EVC_ID") ||
    selectedRound.EVC_ID ||
    supervisorFromState.EVC_ID ||
    "";
  const EVC_Code =
    searchParams.get("EVC_Code") ||
    selectedRound.EVC_Code ||
    supervisorFromState.EVC_Code ||
    "";
  const EVT_ID =
    searchParams.get("EVT_ID") ||
    selectedRound.EVT_ID ||
    supervisorFromState.EVT_ID ||
    "";

  const queryData = {
    EVP_TargetID: supervisorId,
    EVC_Code,
    EVT_ID,
    averageScore: searchParams.get("averageScore"),
    numsum: searchParams.get("numsum"),
    EVP_set_evaluators: searchParams.get("EVP_set_evaluators"),
  };

  const [apiSupervisor, setApiSupervisor] = useState(supervisorFromState);
  const [detailRows, setDetailRows] = useState([]);
  const [aiAnalysisRows, setAiAnalysisRows] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(EVC_ID || EVC_Code));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchSupervisorDetail = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiClient.get(SUPERVISOR_DETAIL_API, {
          params: {
            EVC_ID,
            EVC_Code,
            EVT_ID,
            EVP_TargetID: supervisorId,
            page: 1,
            limit: 500,
          },
        });

        const result = response.data?.result || {};
        const rows = result.rows || [];

        setDetailRows(rows);
        setAiAnalysisRows(result.aiAnalyses || []);
        setApiSupervisor(result.supervisor || supervisorFromState || rows[0]);

        if (!rows.length && !supervisorFromState.EVP_TargetID) {
          setLoadError("ไม่พบข้อมูลหัวหน้าคนนี้ในรอบประเมิน");
        }
      } catch (error) {
        setDetailRows([]);
        setAiAnalysisRows([]);
        setLoadError(
          error?.response?.data?.message ||
            error?.message ||
            "โหลดข้อมูลรายละเอียดไม่สำเร็จ",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!supervisorId || (!EVC_ID && !EVC_Code)) {
      // Reset the page when required route parameters are missing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      setDetailRows([]);
      setAiAnalysisRows([]);
      return;
    }

    fetchSupervisorDetail();
  }, [EVC_ID, EVC_Code, EVT_ID, supervisorFromState, supervisorId]);

  const supervisor = useMemo(
    () => getSupervisorData(apiSupervisor, queryData, selectedRound),
    [apiSupervisor, queryData, selectedRound],
  );

  const assessmentSections = useMemo(
    () =>
      assessmentTypes
        .map((assessmentType) =>
          getAssessmentSection(detailRows, aiAnalysisRows, assessmentType),
        )
        .filter(Boolean),
    [aiAnalysisRows, detailRows],
  );

  if (!supervisor.EVP_TargetID && !EVC_ID && !EVC_Code && !isLoading) {
    return <Navigate to="/Admin_Check" replace />;
  }

  return (
    <PagePanel
      eyebrow="Performance Dashboard"
      title="แดชบอร์ดผลการประเมินรายบุคคล"
      onBack={location.state?.returnTo ? () => navigate(location.state.returnTo, {
        replace: true,
        state: { dashboardReturnState: location.state.dashboardReturnState },
      }) : undefined}
      description="ข้อมูลลับ - รายงานสำหรับผู้ดูแลระบบและฝ่ายบุคคล"
    >
      <section className="admin-report-page">
        {loadError ? (
          <Alert
            className="admin-report-alert"
            type="warning"
            message={loadError}
            showIcon
          />
        ) : null}

        {/* <div className="admin-report-brand">
          <Space size={12} align="center">
            <Avatar shape="square" src="/img/SakERP.png" size={46} />
            <div>
              <Typography.Title level={4}>{appConfig.appName}</Typography.Title>
              <Typography.Text type="secondary">
                SAKSIAM LEASING PLC
              </Typography.Text>
            </div>
          </Space>
          <Tag color={supervisor.statusColor}>{supervisor.statusText}</Tag>
        </div> */}

        <div className="admin-report-person">
          <Avatar
            className="admin-report-avatar"
            size={72}
            src={getPhotoUrl(supervisor.EVP_Photo)}
            icon={!supervisor.EVP_Photo ? <UserOutlined /> : undefined}
          />
          <div className="admin-report-person-main">
            <div className="admin-report-person-copy">
              <Typography.Text type="secondary">
                หัวหน้าที่ถูกประเมิน
              </Typography.Text>
              <Typography.Title level={4}>
                {supervisor.EVP_TargetName}
              </Typography.Title>
              <Typography.Text>{supervisor.EVP_PositionName}</Typography.Text>
            </div>
            <div className="admin-report-person-meta">
              <span>
                รหัสพนักงาน
                <strong>{supervisor.EVP_TargetID}</strong>
              </span>
              <span>
                {" "}
                สถานที่ปฏิบัติงาน
                <strong>{supervisor.EVP_WorkplaceName}</strong>
              </span>
              <span>
                {" "}
                รอบการประเมิน
                <strong>{supervisor.EVC_Period}</strong>
              </span>
              <span>
                {" "}
                ประเภทการประเมิน
                <strong>รวมทุกประเภท</strong>
              </span>
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <BarChartOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">คะแนนเฉลี่ยรวม</Typography.Text>
              <Typography.Title level={2}>
                {supervisor.averageScore.toFixed(2)}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <CheckCircleOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">ส่งแล้ว</Typography.Text>
              <Typography.Title level={2}>
                {supervisor.submitted} คน
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <CrownOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">
                พนักงานที่ประเมินได้ทั้งหมด
              </Typography.Text>
              <Typography.Title level={2}>
                {supervisor.totalEvaluators} คน
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="clean-card admin-report-kpi" variant="outlined">
              <ClockCircleOutlined className="admin-detail-icon" />
              <Typography.Text type="secondary">รอประเมิน</Typography.Text>
              <Typography.Title level={2}>
                {supervisor.pending} คน
              </Typography.Title>
            </Card>
          </Col>
        </Row>

        {assessmentSections.length ? (
          assessmentSections.map((section) => (
              <Card
                className={`admin-report-section is-${section.accent}`}
                key={section.EVT_ID}
                title={section.title}
                variant="outlined"
              >
                <Row gutter={[18, 18]} align="middle">
                  <Col xs={24} lg={9}>
                    <div className="admin-report-score-card">
                      <div className="admin-report-score-icon">
                        {section.icon}
                      </div>
                      <Typography.Text strong>
                        {section.totalTitle}
                      </Typography.Text>
                      <Typography.Title level={1}>
                        {section.score.toFixed(1)} / 5
                      </Typography.Title>
                      <Tag color="success">{section.label}</Tag>
                    </div>
                  </Col>
                  <Col xs={24} lg={15}>
                    <div className="admin-report-metric-list">
                      {section.metrics.map((metric) => (
                        <div className="admin-report-metric" key={metric.label}>
                          <Typography.Text>{metric.label}</Typography.Text>
                          <Progress
                            percent={(metric.score / 5) * 100}
                            showInfo={false}
                            strokeColor={
                              metric.score >= 4.2 ? "#0f8a3b" : "#f59f00"
                            }
                          />
                          <Typography.Text strong>
                            {metric.score.toFixed(1)}
                          </Typography.Text>
                          <ArrowUpOutlined className="admin-report-trend" />
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>

                {section.aiAnalysis ? (
                  <div className="admin-report-comment-panel">
                    <AiAnalysisSummary value={section.aiAnalysis} />
                  </div>
                ) : null}
              </Card>
          ))
        ) : (
          <Card
            className="clean-card admin-report-section"
            loading={isLoading}
            variant="outlined"
          >
            {!isLoading ? (
              <Empty description="ยังไม่มีข้อมูลคะแนนตามประเภทการประเมินของหัวหน้าคนนี้" />
            ) : null}
          </Card>
        )}
      </section>
    </PagePanel>
  );
}
