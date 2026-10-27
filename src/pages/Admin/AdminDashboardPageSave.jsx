import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient from "../../recoilstore/userStores";

const DASHBOARD_ROUNDS_API = "/api/insurances/getAssessmentDashboardRounds";
const DASHBOARD_DETAIL_API = "/api/insurances/getAssessmentDashboardDetail";
const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";
const DASHBOARD_TABLE_PAGE_SIZE = 50;

function getApiRows(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.rounds)) return result.rounds;
  if (Array.isArray(result?.supervisors)) return result.supervisors;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.list)) return result.list;

  return [];
}

function getApiResult(data) {
  return data?.result ?? data?.data ?? data ?? {};
}

function getNumber(value, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getPercent(value, total) {
  const totalNumber = getNumber(total);

  if (!totalNumber) return 0;

  return Math.round((getNumber(value) / totalNumber) * 100);
}

function getThaiYearFromDate(dateText) {
  const year = String(dateText || "").match(/\d{4}/)?.[0];
  const yearNumber = Number(year);

  if (!yearNumber) return "";

  return yearNumber > 2400 ? String(yearNumber) : String(yearNumber + 543);
}

function getDateTimeValue(dateText) {
  const value = new Date(dateText || "").getTime();

  return Number.isFinite(value) ? value : 0;
}

function formatThaiDate(dateText) {
  if (!dateText) return "-";

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return dateText;

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatThaiDateRange(startDate, endDate) {
  return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
}

function compareRoundsByCreatedAt(a, b) {
  const dateDiff =
    getDateTimeValue(a.createdAt) - getDateTimeValue(b.createdAt);

  if (dateDiff) return dateDiff;

  return String(a.id || a.EVC_Code || "").localeCompare(
    String(b.id || b.EVC_Code || ""),
  );
}

function mapApiDashboardRound(row = {}) {
  const EVC_ID = row.EVC_ID || row.id || "";
  const EVC_Code = row.EVC_Code || row.code || "";
  const EVC_Period = row.EVC_Period || row.period || row.label || "-";
  const EVC_Year =
    row.EVC_Year ||
    row.year ||
    getThaiYearFromDate(row.EVC_StartDate || row.startDate) ||
    String(new Date().getFullYear() + 543);
  const totalSupervisors = getNumber(
    row.totalSupervisors ?? row.total_supervisors ?? row.supervisor_count,
  );
  const totalEvaluators = getNumber(
    row.totalEvaluators ?? row.total_evaluators ?? row.evaluator_count,
  );
  const totalSubmitted = getNumber(
    row.totalSubmitted ?? row.total_submitted ?? row.submitted_count,
  );

  return {
    id: EVC_ID || EVC_Code,
    EVC_ID,
    EVC_Code,
    EVT_ID: row.EVT_ID || "",
    EVT_Name: row.EVT_Name || "",
    EVP_set_evaluators : row.EVP_set_evaluators || "",
    EVC_Period,
    label: EVC_Period,
    detail: row.EVC_detail || row.detail || row.description || "",
    year: String(EVC_Year),
    startDate: row.EVC_StartDate || row.startDate || "",
    endDate: row.EVC_EndDate || row.endDate || "",
    createdAt: row.EVC_CreatedAt || row.createdAt || row.created_at || "",
    status: row.EVC_Status ?? row.status ?? "",
    statusText:
      row.statusText ||
      row.EVC_StatusName ||
      (String(row.EVC_Status ?? row.status ?? "") === "1"
        ? "เปิดใช้งาน"
        : "รอบประเมิน"),
    statusColor: row.statusColor || "processing",
    totalSupervisors,
    totalEvaluators,
    totalSubmitted,
    percent: getPercent(totalSubmitted, totalEvaluators),
  };
}

function mapApiDashboardSupervisor(row = {}, selectedRoundId = "") {
  const totalEvaluators = getNumber(
    row.totalEvaluators ??
      row.EVP_Number_evaluators ??
      row.total_evaluators ??
      row.EVP_TotalEvaluators ??
      row.EVP_EvaluatorTotal,
  );
  const submitted = getNumber(
    row.submitted ??
      row.submitted_count ??
      // row.EVP_set_evaluators ??
      row.EVP_SubmittedTotal,
  );
  const waitingHrCheck = getNumber(
    row.waitingHrCheck ?? row.waiting_hr_check ?? row.pendingHrCheck,
  );
  const numHrCheck = getNumber(
    row.numHrCheck ?? row.numhrcheck ?? row.num_hr_check ?? row.checkedHr,
  );
  const EVP_set_evaluators = getNumber(row.EVP_set_evaluators);
  const pending = Math.max(totalEvaluators - submitted, 0);
  const percent = getPercent(submitted, totalEvaluators);
  const numsum = getNumber(row.EVP_Number_evaluators ?? row.numsum);
  const remainingStatus = Math.max(numsum - submitted, 0);
  const statusText =
    numsum === 0
      ? "ไม่มีผู้ประเมิน"
      : remainingStatus === 0
        ? "ครบแล้ว"
        : "รอติดตาม";
  const statusColor =
    numsum === 0 ? "default" : remainingStatus === 0 ? "success" : "warning";

  return {
    id: row.EVP_TargetID || row.target_id || row.id || "",
    roundId: selectedRoundId,
    EVC_ID: row.EVC_ID || selectedRoundId,
    EVC_Code: row.EVC_Code || row.roundId || "",
    name: row.EVP_TargetName || row.target_name || row.name || "-",
    position: row.EVP_PositionName || row.position || "-",
    EVP_Photo: row.EVP_Photo || "-",
    EVP_ID: row.EVP_ID || "-",
    employeeCode: row.employeeCode || row.employee_code || "",
    department: row.EVP_WorkplaceName || row.department || "-",
    workArea: row.EVP_WorkplaceCode || row.work_area || row.workArea || "-",
    numsum: row.EVP_Number_evaluators|| "-",
    EVP_set_evaluators,
    round: row.EVC_Period || row.round || selectedRoundId,
    totalEvaluators,
    submitted,
    waitingHrCheck,
    numHrCheck,
    pending,
    averageScore: getNumber(
      row.averageScore ?? row.average_score ?? row.avg_score,
    ),
    status: statusText,
    statusColor,
    hrApproved: String(row.hrApproved ?? row.hr_approved ?? "") === "1",
    percent,
  };
}

function mapTopicScores(rows = []) {
  return rows
    .map((item) => ({
      id: item.LAC_ID || item.category_id || item.id || item.name,
      name:
        item.LAC_Name ||
        item.category_name ||
        item.topicName ||
        item.name ||
        "หัวข้อประเมิน",
      score: getNumber(
        item.averageScore ?? item.average_score ?? item.avg_score ?? item.score,
        null,
      ),
    }))
    .filter((item) => item.score !== null);
}

function mapDashboardMeta(result = {}, rows = []) {
  const summary = result.summary || result.dashboardSummary || result;
  const rowScores = rows
    .map((item) => item.averageScore)
    .filter((score) => Number.isFinite(score) && score > 0);
  const averageFromRows = rowScores.length
    ? rowScores.reduce((sum, score) => sum + score, 0) / rowScores.length
    : 0;

  return {
    averageScore: getNumber(
      summary.averageScore ?? summary.average_score ?? summary.avg_score,
      averageFromRows,
    ),
    maxScore: getNumber(
      summary.maxScore ?? summary.max_score ?? summary.highest_score,
      rowScores.length ? Math.max(...rowScores) : 0,
    ),
    minScore: getNumber(
      summary.minScore ?? summary.min_score ?? summary.lowest_score,
      rowScores.length ? Math.min(...rowScores) : 0,
    ),
    topicScores: mapTopicScores(
      result.topicScores ||
        result.topic_scores ||
        result.topics ||
        result.categories ||
        [],
    ),
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [assessmentRounds, setAssessmentRounds] = useState([]);
  const [supervisorRows, setSupervisorRows] = useState([]);
  const [dashboardMeta, setDashboardMeta] = useState({
    averageScore: 0,
    maxScore: 0,
    minScore: 0,
    topicScores: [],
  });
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadError, setLoadError] = useState("");
  const roundYears = useMemo(
    () =>
      Array.from(new Set(assessmentRounds.map((round) => round.year)))
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a)),
    [assessmentRounds],
  );
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [dashboardView, setDashboardView] = useState("overview");
  const selectedRound = assessmentRounds.find(
    (round) => round.id === selectedRoundId,
  );
  const roundsByYear = useMemo(
    () =>
      assessmentRounds
        .filter((round) => round.year === selectedYear)
        .sort(compareRoundsByCreatedAt),
    [assessmentRounds, selectedYear],
  );
  const filteredSupervisorRows = useMemo(
    () => supervisorRows.filter((item) => item.roundId === selectedRoundId),
    [supervisorRows, selectedRoundId],
  );

  //การ์ดรอบ
  const fetchAssessmentRounds = useCallback(async () => {
    setLoadingRounds(true);
    setLoadError("");

    try {
      const response = await apiClient.get(DASHBOARD_ROUNDS_API);

      // console.log("DASHBOARD ROUNDS:", response.data);

      const result = response.data?.result || {};
      const rows = Array.isArray(result)
        ? result
        : result.rows || result.rounds || result.data || [];

      const apiRounds = rows
        .map((row) => {
          const EVC_ID = row.EVC_ID || row.id || "";
          const EVC_Code = row.EVC_Code || "";
          const totalSupervisors = getNumber(
            row.totalSupervisors || row.total_supervisors || row.supervisor_count,
          );
          const totalEvaluators = getNumber(
            row.totalEvaluators || row.total_evaluators || row.evaluator_count,
          );
          const totalSubmitted = getNumber(
            row.totalSubmitted || row.total_submitted || row.submitted_count,
          );
          const waitingHrCheck = getNumber(
            row.waitingHrCheck || row.waiting_hr_check || row.pendingHrCheck,
          );
          const numHrCheck = getNumber(
            row.numHrCheck || row.num_hr_check || row.checkedHr,
          );

          return {
            id: EVC_ID,
            EVC_ID,
            EVC_Code,
            EVT_ID: row.EVT_ID || "",
            EVT_Name: row.EVT_Name || "",
            EVC_Period: row.EVC_Period || "-",
            label: row.EVC_Period || "-",
            detail: row.EVC_detail || "",
            year:
              String(row.EVC_Year || "") ||
              getThaiYearFromDate(row.EVC_StartDate) ||
              String(new Date().getFullYear() + 543),
            startDate: row.EVC_StartDate || "",
            endDate: row.EVC_EndDate || "",
            createdAt: row.EVC_CreatedAt || "",
            status: row.EVC_Status || "",
            statusText:
              String(row.EVC_Status || "") === "1"
                ? "เปิดใช้งาน"
                : "รอบประเมิน",
            statusColor: "processing",
            totalSupervisors,
            totalEvaluators,
            totalSubmitted,
            waitingHrCheck,
            numHrCheck,
            percent: getPercent(totalSubmitted, totalEvaluators),
          };
        })
        .filter((item) => item.id);

      setAssessmentRounds(apiRounds);

      setSelectedYear((currentYear) => currentYear || apiRounds[0]?.year || "");
    } catch (error) {
      console.error(error);

      setLoadError("โหลดรายการรอบประเมินไม่สำเร็จ");
      setAssessmentRounds([]);
    } finally {
      setLoadingRounds(false);
    }
  }, []);

  const fetchDashboardDetail = useCallback(async (round) => {
    if (!round?.id) return;

    setLoadingDashboard(true);
    setLoadError("");

    try {
      const response = await apiClient.get(DASHBOARD_DETAIL_API, {
        params: {
          EVC_ID: round.EVC_ID,
          EVC_Code: round.EVC_Code,
          EVT_ID: round.EVT_ID,
        },
      });

      console.log(response.data);
      const result = getApiResult(response.data);
      const apiRows = getApiRows(response.data).map((item) =>
        mapApiDashboardSupervisor(item, round.id),
      );

      setSupervisorRows(apiRows);
      setDashboardMeta(mapDashboardMeta(result, apiRows));
    } catch (error) {
      console.error(error);
      setLoadError("โหลดข้อมูลแดชบอร์ดไม่สำเร็จ");
      setSupervisorRows([]);
      setDashboardMeta({
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        topicScores: [],
      });
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

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
    const waitingHrCheck = filteredSupervisorRows.reduce(
      (sum, item) => sum + item.waitingHrCheck,
      0,
    );
    const numHrCheck = filteredSupervisorRows.reduce(
      (sum, item) => sum + item.numHrCheck,
      0,
    );
    const completed = filteredSupervisorRows.filter(
      (item) => item.pending === 0,
    ).length;
    const pending = Math.max(totalEvaluators - totalSubmitted, 0);

    return {
      totalSupervisors,
      totalEvaluators,
      totalSubmitted,
      waitingHrCheck,
      numHrCheck,
      pending,
      completed,
      percent: totalEvaluators ? getPercent(totalSubmitted, totalEvaluators)
        : 0,
    };
  }, [filteredSupervisorRows]);

  const dashboardRows = useMemo(() => {
    if (dashboardView === "attention") {
      return filteredSupervisorRows.filter((item) => item.pending > 0);
    }

    if (dashboardView === "completed") {
      return filteredSupervisorRows.filter((item) => item.pending === 0);
    }

    return filteredSupervisorRows;
  }, [dashboardView, filteredSupervisorRows]);

  const dashboardViewOptions = [
    {
      label: "หัวหน้าทั้งหมด",
      value: "overview",
      count: filteredSupervisorRows.length,
    },
    {
      label: "ต้องติดตาม",
      value: "attention",
      count: filteredSupervisorRows.filter((item) => item.pending > 0).length,
    },
    {
      label: "ครบแล้ว",
      value: "completed",
      count: filteredSupervisorRows.filter((item) => item.pending === 0).length,
    },
  ];

  function getEmployeePhotoUrl(photo) {
    const fileName = String(photo || "").trim();

    if (!fileName) return undefined;

    return `${EMPLOYEE_PHOTO_URL}/${encodeURIComponent(fileName)}`;
  }

  const selectedViewLabel =
    dashboardViewOptions.find((item) => item.value === dashboardView)?.label ||
    "ภาพรวม";

  const heroRoundTitle = selectedRound?.label?.includes("/")
    ? `ปี ${selectedRound.label.split("/")[1]} เดือน ${selectedRound.label.split("/")[0]}`
    : selectedRound?.detail || selectedRound?.label || "รอบประเมิน";

  const formatThaiDate = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const roundDateText =
    selectedRound?.startDate && selectedRound?.endDate
      ? `${formatThaiDate(selectedRound.startDate)} - ${formatThaiDate(
          selectedRound.endDate,
        )}`
      : "-";

  const columns = [
    {
      title: "หัวหน้าที่ถูกประเมิน",
      key: "supervisor",
      render: (_, row) => {
        const photoUrl = getEmployeePhotoUrl(row.EVP_Photo);

        return (
          <Space size={12}>
            <Avatar
              className="supervisor-avatar"
              size={56}
              src={photoUrl}
              icon={!photoUrl ? <UserOutlined /> : undefined}
            />

            <div>
              <Typography.Text strong>{row.name}</Typography.Text>

              <div>
                <Typography.Text type="secondary">
                  รหัสพนักงาน {row.id || "-"}
                </Typography.Text>
              </div>

              <div>
                <Typography.Text type="secondary">
                  {row.position}
                </Typography.Text>
              </div>
            </div>
          </Space>
        );
      },
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
        const percent = getPercent(row.EVP_set_evaluators, row.numsum);

        return (
          <div className="admin-progress-cell">
            <Progress percent={percent} size="small" />
            <Typography.Text type="secondary">
              ส่งแล้ว {row.EVP_set_evaluators}/{row.numsum} คน
            </Typography.Text>
          </div>
        );
      },
    },
     {
      title: "คงเหลือ",
      dataIndex: "pending",
      key: "pending",
      align: "center",
      render: (_, row) => <Typography.Text type="secondary">
               {row.numsum - row.EVP_set_evaluators} คน
            </Typography.Text>,
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
      render: (score) => <Tag color="blue">{score.toFixed(2)}</Tag>,
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, row) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => {
            const query = new URLSearchParams();

            if (selectedRound?.EVC_ID) query.set("EVC_ID", selectedRound.EVC_ID);
            if (selectedRound?.EVC_Code) query.set("EVC_Code", selectedRound.EVC_Code);

            const detailPath = query.toString()
              ? `/Admin_Check/${row.id}?${query.toString()}`
              : `/Admin_Check/${row.id}`;

            navigate(detailPath, {
              state: {
                supervisor: row,
                selectedRound,
              },
            });
          }}
        >
          ดูรายละเอียด
        </Button>
      ),
    },
  ];
  const handleSelectRound = async (roundId) => {
    setDashboardView("overview");
    setSelectedRoundId(roundId);

    // หาข้อมูลรอบที่กด
    const round = assessmentRounds.find((item) => item.id === roundId);

    if (!round) {
      console.log("ไม่พบรอบ:", roundId);
      return;
    }

    // โหลดรายละเอียดทันทีเมื่อเลือกรอบ
    await fetchDashboardDetail(round);
  };

  useEffect(() => {
    // alert("asdasd");
    fetchAssessmentRounds();
  }, [fetchAssessmentRounds]);

  if (!selectedRoundId) {
    return (
      <PagePanel
        eyebrow="Admin Console"
        title="แดชบอร์ดภาพรวมการประเมิน"
        description="เลือกรอบประเมินตามปี เพื่อดูข้อมูลสรุปและความคืบหน้าเฉพาะรอบนั้น"
        action={
          <Select
            className="dashboard-year-select"
            size="large"
            loading={loadingRounds}
            value={selectedYear}
            options={roundYears.map((year) => ({
              label: `ปี ${year}`,
              value: year,
            }))}
            onChange={setSelectedYear}
          />
        }
        className="admin-dashboard-picker-page"
        showBack={false}
      >
        <div className="dashboard-round-section">
          <Space align="center" className="dashboard-round-section-title">
            <CalendarOutlined />
            <Typography.Title level={4}>
              รอบประเมินปี {selectedYear || "-"}
            </Typography.Title>
          </Space>
        </div>

        <Row gutter={[18, 18]} className="dashboard-round-gallery">
          {roundsByYear.map((round, index) => {
            const totalSupervisors = round.totalSupervisors;
            const totalEvaluators = round.totalEvaluators;
            const totalSubmitted = round.totalSubmitted;
            const percent = round.percent;

            return (
              <Col xs={24} md={12} xl={8} key={round.id}>
                <Card
                  className={`clean-card dashboard-round-card theme-${index % 3}`}
                  hoverable
                  variant="outlined"
                  onClick={() => handleSelectRound(round.id)}
                >
                  <div className="dashboard-round-cover">
                    <div className="dashboard-round-brand">
                      <BarChartOutlined />
                      SAK Dashboard
                    </div>
                    <div className="dashboard-round-cover-text">
                      <Typography.Title level={3}>
                        {round.label}
                      </Typography.Title>
                      <Typography.Text>
                        เปิดดูภาพรวมและความคืบหน้าของรอบประเมินนี้
                      </Typography.Text>
                    </div>
                  </div>

                  <div className="dashboard-round-body">
                    <Space wrap size={8}>
                      {index === 0 ? <Tag color="red">ล่าสุดของปี</Tag> : null}
                      <Tag color={round.statusColor}>{round.statusText}</Tag>
                      <Typography.Text type="secondary">
                        {formatThaiDateRange(round.startDate, round.endDate)}
                      </Typography.Text>
                    </Space>

                    <Typography.Title level={4}>
                      {round.detail || "รอบประเมิน"}
                    </Typography.Title>

                    <div className="dashboard-round-progress">
                      <Progress
                        percent={percent}
                        showInfo={false}
                        size="small"
                        strokeColor="#1677ff"
                      />
                      <Typography.Text strong>{percent}%</Typography.Text>
                    </div>

                    <div className="dashboard-round-footer">
                      <span>หัวหน้า {totalSupervisors} คน</span>
                      <span>ส่งแล้ว {totalSubmitted} รายการ</span>
                      <span>ผู้มีสิทธิ์ {totalEvaluators} คน</span>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
        {!roundsByYear.length ? (
          <Card className="clean-card dashboard-empty-year" variant="outlined">
            {loadingRounds ? (
              <Typography.Text type="secondary">
                กำลังโหลดรอบประเมิน...
              </Typography.Text>
            ) : (
              <Empty
                description={`ยังไม่มีรอบประเมินในปี ${selectedYear || "-"}`}
              />
            )}
          </Card>
        ) : null}
        {loadError ? <Alert title={loadError} type="warning" showIcon /> : null}
      </PagePanel>
    );
  }

  return (
    <PagePanel
      eyebrow="Admin Console"
      title="จัดการและติดตามการประเมินหัวหน้า"
      description={`ดูสถานะรายหัวหน้า แยกตามฝ่ายและพื้นที่ สำหรับ${selectedRound?.detail || "รอบประเมินที่เลือก"}`}
      action={
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setSelectedRoundId(null)}
          >
            เลือกรอบอื่น
          </Button>
          <Select
            className="admin-round-select"
            loading={loadingRounds}
            value={selectedRoundId}
            options={assessmentRounds.map((round) => ({
              label: round.label,
              value: round.id,
            }))}
            onChange={handleSelectRound}
          />
        </Space>
      }
      // className="admin-dashboard-detail-page"
      showBack={false}
    >
      <Card className="clean-card admin-round-summary-panel" variant="outlined">
        <div className="admin-dashboard-hero">
          <div className="admin-dashboard-hero-copy">
            <Typography.Text className="admin-dashboard-hero-badge">
              <BarChartOutlined />
              SAK Dashboard
            </Typography.Text>
            <Typography.Title level={2}>{heroRoundTitle}</Typography.Title>
            <Typography.Paragraph>{roundDateText}</Typography.Paragraph>
          </div>

          <div className="admin-dashboard-hero-status">
            <Tag color="blue">{selectedRound?.label || "รอบปัจจุบัน"}</Tag>
            <div>
              <strong>{summary.percent}%</strong>
              <span>ความคืบหน้ารวม</span>
            </div>
          </div>

          <div className="admin-dashboard-hero-track" aria-hidden="true">
            <span style={{ width: `${summary.percent}%` }} />
          </div>
        </div>

        <Row gutter={[12, 12]} className="admin-dashboard-summary-row">
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              label="หัวหน้าทั้งหมด"
              value={`${summary.totalSupervisors} คน`}
              detail="ในรอบนี้"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              label="ประเมินแล้วรอการตรวจสอบ"
              value={`${summary.waitingHrCheck} รายการ`}
              detail="รอ HR ตรวจสอบ"
            />
          </Col>
          {/* <Col xs={24} sm={12} lg={6}>
            <MetricCard
              label="ส่งแล้ว"
              value={`${summary.totalSubmitted} รายการ`}
              detail={`ตรวจแล้ว ${summary.numHrCheck} รายการ`}
            />
          </Col> */}
           <Col xs={24} sm={12} lg={6}>
            <MetricCard
              label="ตรวจสอบแล้ว"
              value={`${summary.numHrCheck} รายการ`}
              detail={`HR ตรวจสอบแล้ว`}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard
              label="รอประเมิน"
              value={`${summary.pending} รายการ`}
              detail={`ครบแล้ว ${summary.completed} หัวหน้า`}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]} className="admin-dashboard-insight-row">
        <Col xs={24} lg={12}>
          <Card
            className="clean-card admin-dashboard-insight-card"
            title="ผลคะแนนภาพรวม"
            variant="outlined"
          >
            <div className="admin-score-overview">
              <div>
                <Typography.Text type="secondary">คะแนนเฉลี่ย</Typography.Text>
                <Typography.Title level={2}>
                  {dashboardMeta.averageScore
                    ? dashboardMeta.averageScore.toFixed(2)
                    : "-"}{" "}
                  <span>/ 4</span>
                </Typography.Title>
              </div>
              <div className="admin-score-pairs">
                <span>สูงสุด</span>
                <strong>
                  {dashboardMeta.maxScore
                    ? dashboardMeta.maxScore.toFixed(2)
                    : "-"}
                </strong>
                <span>ต่ำสุด</span>
                <strong>
                  {dashboardMeta.minScore
                    ? dashboardMeta.minScore.toFixed(2)
                    : "-"}
                </strong>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            className="clean-card admin-dashboard-insight-card"
            title="สถานะการประเมิน"
            variant="outlined"
          >
            <div className="admin-status-overview">
              <div>
                <CheckCircleOutlined />
                <span>ครบแล้ว</span>
                <strong>{summary.completed}</strong>
              </div>
              <div>
                <ClockCircleOutlined />
                <span>ต้องติดตาม</span>
                <strong>{dashboardViewOptions[1].count}</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="clean-card admin-topic-score-card"
        title="คะแนนเฉลี่ยแยกตามหัวข้อ"
        variant="outlined"
      >
        {dashboardMeta.topicScores.length ? (
          <div className="admin-topic-score-list">
            {dashboardMeta.topicScores.map((topic) => (
              <div
                className="admin-topic-score-row"
                key={topic.id || topic.name}
              >
                <Typography.Text strong>{topic.name}</Typography.Text>
                <Progress
                  percent={getPercent(topic.score, 4)}
                  showInfo={false}
                  size="small"
                  strokeColor="#1677ff"
                />
                <Typography.Text strong>
                  {topic.score.toFixed(2)}
                </Typography.Text>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="ยังไม่มีข้อมูลคะแนนแยกตามหัวข้อ" />
        )}
      </Card>

      <Card
        className="clean-card admin-table-card"
        title={`รายชื่อหัวหน้า · ${selectedViewLabel}`}
        variant="outlined"
      >
        <div className="admin-view-filter-row">
          {dashboardViewOptions.map((option) => (
            <button
              type="button"
              className={`admin-view-filter ${
                dashboardView === option.value ? "is-active" : ""
              }`}
              key={option.value}
              onClick={() => setDashboardView(option.value)}
            >
              <span>{option.label}</span>
              <strong>{option.count}</strong>
            </button>
          ))}
        </div>

        {loadError ? (
          <Alert
            className="assessment-success-alert"
            title={loadError}
            type="warning"
            showIcon
          />
        ) : null}
        <Table
          columns={columns}
          dataSource={dashboardRows}
          loading={loadingDashboard}
          pagination={{
            pageSize: DASHBOARD_TABLE_PAGE_SIZE,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} จาก ${total} รายการ`,
          }}
          rowKey={(row) =>
            `${row.EVC_ID || row.EVC_Code || "round"}-${row.id || row.EVP_ID || "target"}`
          }
          scroll={{ x: 920 }}
        />
      </Card>
    </PagePanel>
  );
}
