import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  StarFilled,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient from "../../recoilstore/userStores";

const DASHBOARD_ROUNDS_API = "/api/insurances/getAssessmentDashboardRounds";
const DASHBOARD_DETAIL_API = "/api/insurances/getAssessmentDashboardDetail";
const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";
const DASHBOARD_TABLE_PAGE_SIZE = 50;
const DASHBOARD_LOADING_DELAY = 1000;
const SCORE_FILTER_OPTIONS = [
  { label: "คะแนน 3.50 - 4.00", value: "excellent" },
  { label: "คะแนน 3.00 - 3.49", value: "good" },
  { label: "คะแนน 2.00 - 2.99", value: "fair" },
  { label: "ต่ำกว่า 2.00", value: "low" },
  { label: "ยังไม่มีคะแนน", value: "no-score" },
];
const TOPIC_SCORE_COLORS = [
  "#86efac",
  "#67e8f9",
  "#fde68a",
  "#fdba74",
  "#7dd3fc",
  "#f9a8d4",
  "#bef264",
  "#c4b5fd",
];

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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getPercent(value, total) {
  const totalNumber = getNumber(total);

  if (!totalNumber) return 0;

  return Math.round((getNumber(value) / totalNumber) * 100);
}

function getTopicPoint(index, total) {
  const angle = -90 + (360 / Math.max(total, 1)) * index;
  const radius = 38;
  const radian = (angle * Math.PI) / 180;

  return {
    left: `${50 + Math.cos(radian) * radius}%`,
    top: `${50 + Math.sin(radian) * radius}%`,
  };
}

function getTopicChartBackground(topics = []) {
  if (!topics.length) return "#eef6ff";

  const step = 100 / topics.length;
  const segments = topics.map((_, index) => {
    const color = TOPIC_SCORE_COLORS[index % TOPIC_SCORE_COLORS.length];
    return `${color} ${index * step}% ${(index + 1) * step}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function getBusinessRegionName(regionId) {
  const id = String(regionId || "");

  if (id === "1") return "ภาคธุรกิจที่ 1";
  if (id === "6") return "สำนักงานใหญ่";

  return id ? `ภาคธุรกิจ ${id}` : "ไม่ระบุภาคธุรกิจ";
}

function isHiddenBelongId(belongId) {
  const id = Number(belongId);

  return Number.isInteger(id) && id >= 1 && id <= 11;
}

function getRowRegionId(row = {}) {
  return String(
    row.region_id ??
      row.regionId ??
      row.RegionID ??
      row.region_ID ??
      row.belong_region_id ??
      row.belongRegionId ??
      "",
  );
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

function getDashboardRoundKey(round = {}) {
  return String(round.EVC_Code || round.EVC_ID || round.id || round.roundId || "");
}

function isSameDashboardRound(row = {}, round = {}) {
  const roundCode = String(round.EVC_Code || "");
  const roundId = String(round.EVC_ID || round.id || "");
  const rowCode = String(row.EVC_Code || row.roundCode || row.round_code || "");
  const rowId = String(row.EVC_ID || row.roundId || row.round_id || "");

  if (roundCode && rowCode) return rowCode === roundCode;
  if (roundId && rowId) return rowId === roundId;

  return true;
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

function mapApiDashboardSupervisor(row = {}, selectedRound = {}) {
  const roundKey = getDashboardRoundKey(selectedRound);
  const rowEvcCode = row.EVC_Code || row.roundCode || row.round_code || row.EVC_ID || "";
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
  const averageScore = getNumber(
    row.averageScore ?? row.average_score ?? row.avg_score,
  );
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
    roundId: selectedRound.id || selectedRound.EVC_ID || roundKey,
    roundKey,
    EVC_ID: row.EVC_ID || selectedRound.EVC_ID || selectedRound.id || "",
    EVC_Code: rowEvcCode || selectedRound.EVC_Code || "",
    name: row.EVP_TargetName || row.target_name || row.name || "-",
    position: row.EVP_PositionName || row.position || "-",
    EVP_Photo: row.EVP_Photo || "-",
    EVP_ID: row.EVP_ID || "-",
    employeeCode: row.employeeCode || row.employee_code || "",
    department: row.EVP_WorkplaceName || row.department || "-",
    workArea: row.EVP_WorkplaceCode || row.work_area || row.workArea || "-",
    belongId: row.belong_id || row.belongId || "",
    belongName:
      row.belong ||
      row.belong_name ||
      row.belongName ||
      row.areaName ||
      row.area_name ||
      row.region_area_name ||
      "",
    regionId: getRowRegionId(row),
    regionName: getBusinessRegionName(getRowRegionId(row)),
    numsum: row.EVP_Number_evaluators|| "-",
    EVP_set_evaluators,
    round: row.EVC_Period || row.round || selectedRound.label || roundKey,
    totalEvaluators,
    submitted,
    waitingHrCheck,
    numHrCheck,
    pending,
    averageScore,
    status: statusText,
    statusColor,
    hrApproved: String(row.hrApproved ?? row.hr_approved ?? "") === "1",
    percent,
  };
}

function mapTopicScores(rows = []) {
  return rows
    .map((item) => {
      const score = getNumber(
        item.averageScore ?? item.average_score ?? item.avg_score ?? item.score,
        null,
      );
      const totalAnswers = getNumber(
        item.EVP_Number_evaluators ??
          item.totalAnswers ??
          item.total_answers ??
          item.totalEvaluators ??
          item.total_evaluators,
      );

      return {
        id: item.LAC_ID || item.category_id || item.id || item.name,
        name:
          item.LAC_Name ||
          item.category_name ||
          item.topicName ||
          item.name ||
          "หัวข้อประเมิน",
        score,
        percent: getNumber(
          item.averagePercent ?? item.average_percent ?? item.percent,
          score !== null ? getPercent(score, 4) : null,
        ),
        totalAnswers,
      };
    })
    .filter((item) => item.score !== null);
}

function getUniqueScoredSupervisorRows(rows = []) {
  const supervisorMap = new Map();

  rows.forEach((row, index) => {
    const rawScore = getNumber(row.averageScore, null);

    if (rawScore === null || rawScore <= 0) return;

    const key =
      row.id ||
      row.EVP_TargetID ||
      row.target_id ||
      row.name ||
      `supervisor-${index}`;
    const current = supervisorMap.get(key) || {
      ...row,
      scoreSum: 0,
      scoreCount: 0,
    };

    current.scoreSum += rawScore;
    current.scoreCount += 1;
    current.averageScore = current.scoreSum / current.scoreCount;
    supervisorMap.set(key, current);
  });

  return Array.from(supervisorMap.values());
}

function getScoreDistributionFromRows(rows = []) {
  const ranges = [
    { key: "90-up", label: "90 ขึ้นไป", min: 90, max: Infinity, count: 0 },
    { key: "80-89", label: "80-89", min: 80, max: 89.999, count: 0 },
    { key: "70-79", label: "70-79", min: 70, max: 79.999, count: 0 },
    { key: "60-69", label: "60-69", min: 60, max: 69.999, count: 0 },
    { key: "under-60", label: "< 60", min: 0, max: 59.999, count: 0 },
  ];

  getUniqueScoredSupervisorRows(rows).forEach((row) => {
    const rawScore = getNumber(row.averageScore, null);

    if (rawScore === null || rawScore <= 0) return;

    const score = rawScore <= 4 ? (rawScore / 4) * 100 : rawScore;
    const range = ranges.find((item) => score >= item.min && score <= item.max);

    if (range) range.count += 1;
  });

  return ranges;
}

function mapScoreDistribution(rows = [], fallbackRows = []) {
  const apiRows = Array.isArray(rows) ? rows : [];

  if (!apiRows.length) return getScoreDistributionFromRows(fallbackRows);

  return apiRows.map((item, index) => ({
    key: item.key || item.range || item.label || `score-range-${index}`,
    label: item.label || item.range || item.scoreRange || item.name || "-",
    count: getNumber(
      item.count ?? item.total ?? item.totalPeople ?? item.people ?? item.value,
    ),
  }));
}

function getScoreRangeMeta(label = "") {
  const value = String(label);

  if (value.includes("90")) return { level: "ดีเยี่ยม", tone: "excellent" };
  if (value.includes("80")) return { level: "ดีมาก", tone: "great" };
  if (value.includes("70")) return { level: "ดี", tone: "good" };
  if (value.includes("60")) return { level: "พอใช้", tone: "fair" };

  return { level: "ควรปรับปรุง", tone: "low" };
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
    scoreDistribution: mapScoreDistribution([], rows),
  };
}

function getDashboardRowKey(row) {
  return `${row.EVC_ID || row.EVC_Code || "round"}-${row.id || row.EVP_ID || "target"}`;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedView = location.state?.dashboardReturnState;
  const supervisorTableRef = useRef(null);
  const restoredRowRef = useRef(false);
  const viewedRowKey = savedView?.viewedRowKey;
  const [assessmentRounds, setAssessmentRounds] = useState([]);
  const [supervisorRows, setSupervisorRows] = useState([]);
  const [dashboardMeta, setDashboardMeta] = useState({
    averageScore: 0,
    maxScore: 0,
    minScore: 0,
    topicScores: [],
    scoreDistribution: [],
  });
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const dashboardRequest = useRef(0);
  const [loadError, setLoadError] = useState("");
  const roundYears = useMemo(
    () =>
      Array.from(new Set(assessmentRounds.map((round) => round.year)))
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a)),
    [assessmentRounds],
  );
  const [selectedRoundId, setSelectedRoundId] = useState(savedView?.selectedRoundId ?? null);
  const [selectedYear, setSelectedYear] = useState(savedView?.selectedYear ?? "");
  const [dashboardView, setDashboardView] = useState(savedView?.dashboardView ?? "overview");
  const [expandedRegionIds, setExpandedRegionIds] = useState(savedView?.expandedRegionIds ?? []);
  const [tableFilters, setTableFilters] = useState(savedView?.tableFilters ?? {
    keyword: "",
    employeeCode: "",
    workplace: "",
    scoreRange: "",
  });
  const [draftTableFilters, setDraftTableFilters] = useState(savedView?.draftTableFilters ?? tableFilters);
  const [tablePage, setTablePage] = useState(savedView?.tablePage ?? 1);
  const selectedRound = assessmentRounds.find(
    (round) => round.id === selectedRoundId,
  );
  const selectedRoundKey = getDashboardRoundKey(selectedRound);
  const roundsByYear = useMemo(
    () =>
      assessmentRounds
        .filter((round) => round.year === selectedYear)
        .sort(compareRoundsByCreatedAt),
    [assessmentRounds, selectedYear],
  );
  const roundSupervisorRows = useMemo(
    () =>
      supervisorRows.filter(
        (item) => !selectedRoundKey || item.roundKey === selectedRoundKey,
      ),
    [supervisorRows, selectedRoundKey],
  );
  const filteredSupervisorRows = useMemo(() => {
    const keyword = tableFilters.keyword.trim().toLowerCase();
    const employeeCode = tableFilters.employeeCode.trim().toLowerCase();
    const workplace = tableFilters.workplace.trim().toLowerCase();
    const scoreRange = tableFilters.scoreRange;

    return roundSupervisorRows.filter((row) => {
      const nameText = `${row.name || ""}`.toLowerCase();
      const codeText = `${row.id || ""} ${row.employeeCode || ""} ${row.EVP_ID || ""}`.toLowerCase();
      const workplaceText = `${row.department || ""} ${row.workArea || ""}`.toLowerCase();
      const score = getNumber(row.averageScore, 0);
      const matchScore =
        !scoreRange ||
        (scoreRange === "excellent" && score >= 3.5) ||
        (scoreRange === "good" && score >= 3 && score < 3.5) ||
        (scoreRange === "fair" && score >= 2 && score < 3) ||
        (scoreRange === "low" && score > 0 && score < 2) ||
        (scoreRange === "no-score" && score === 0);

      return (
        (!keyword || nameText.includes(keyword)) &&
        (!employeeCode || codeText.includes(employeeCode)) &&
        (!workplace || workplaceText.includes(workplace)) &&
        matchScore
      );
    });
  }, [roundSupervisorRows, tableFilters]);

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

    const requestId = ++dashboardRequest.current;
    setDashboardMeta({ averageScore: 0, maxScore: 0, minScore: 0, topicScores: [], scoreDistribution: [] });
    setLoadingDashboard(true);
    setLoadError("");

    try {
      const [response] = await Promise.all([
        apiClient.get(DASHBOARD_DETAIL_API, {
          params: {
            EVC_ID: round.EVC_ID,
            EVC_Code: round.EVC_Code,
            EVT_ID: round.EVT_ID,
          },
        }),
        wait(DASHBOARD_LOADING_DELAY),
      ]);

      if (requestId !== dashboardRequest.current) return;
      const result = getApiResult(response.data);
      const roundKey = getDashboardRoundKey(round);
      const apiRows = getApiRows(response.data)
        .filter((item) => isSameDashboardRound(item, round))
        .map((item) => mapApiDashboardSupervisor(item, round))
        .filter((item) => !roundKey || item.roundKey === roundKey);

      setSupervisorRows(apiRows);
      setDashboardMeta(mapDashboardMeta(result, apiRows));
    } catch (error) {
      if (requestId !== dashboardRequest.current) return;
      console.error(error);
      setLoadError("โหลดข้อมูลแดชบอร์ดไม่สำเร็จ");
      setSupervisorRows([]);
      setDashboardMeta({
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        topicScores: [],
        scoreDistribution: [],
      });
    } finally {
      if (requestId === dashboardRequest.current) setLoadingDashboard(false);
    }
  }, []);

  const summary = useMemo(() => {
    const totalSupervisors = roundSupervisorRows.length;
    const totalEvaluators = roundSupervisorRows.reduce(
      (sum, item) => sum + item.totalEvaluators,
      0,
    );
    const totalSubmitted = roundSupervisorRows.reduce(
      (sum, item) => sum + item.submitted,
      0,
    );
    const waitingHrCheck = roundSupervisorRows.reduce(
      (sum, item) => sum + item.waitingHrCheck,
      0,
    );
    const numHrCheck = roundSupervisorRows.reduce(
      (sum, item) => sum + item.numHrCheck,
      0,
    );
    const completed = roundSupervisorRows.filter(
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
  }, [roundSupervisorRows]);

  const dashboardRows = useMemo(() => {
    if (dashboardView === "attention") {
      return filteredSupervisorRows.filter((item) => item.pending > 0);
    }

    if (dashboardView === "completed") {
      return filteredSupervisorRows.filter((item) => item.pending === 0);
    }

    return filteredSupervisorRows;
  }, [dashboardView, filteredSupervisorRows]);

  useEffect(() => {
    if (!viewedRowKey || restoredRowRef.current || loadingDashboard) return;

    const index = dashboardRows.findIndex((row) => getDashboardRowKey(row) === viewedRowKey);
    if (index < 0) return;

    // หากข้อมูลเปลี่ยนระหว่างดูรายละเอียด ให้กลับหน้าที่มีพนักงานคนเดิม
    const targetPage = Math.floor(index / DASHBOARD_TABLE_PAGE_SIZE) + 1;
    if (tablePage !== targetPage) {
      setTablePage(targetPage);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const row = supervisorTableRef.current?.querySelector(".admin-recently-viewed-row");
      if (!row) return;
      restoredRowRef.current = true;
      row.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      row.focus({ preventScroll: true });
      row.classList.add("admin-recently-viewed-row-pulse");
    });
    return () => cancelAnimationFrame(frame);
  }, [dashboardRows, loadingDashboard, tablePage, viewedRowKey]);

  const businessRegionRows = useMemo(() => {
    const regionMap = new Map();

    roundSupervisorRows.forEach((row) => {
      const key = String(row.regionId || "unknown");
      const current = regionMap.get(key) || {
        regionId: key,
        regionName: row.regionName || getBusinessRegionName(key),
        supervisors: 0,
        evaluators: 0,
        submitted: 0,
        waitingHrCheck: 0,
        numHrCheck: 0,
        districts: new Map(),
      };
      const belongKey = String(row.belongId || row.workArea || "unknown");
      const isHeadOffice = key === "6";
      const districtGroupKey = isHeadOffice
        ? String(row.department || row.workArea || "unknown")
        : belongKey;
      const districtLabel = isHeadOffice
        ? row.department || "ไม่ระบุฝ่าย/พื้นที่"
        : row.belongName ||
          (belongKey === "unknown" ? "ไม่ระบุ belong" : `belong ${belongKey}`);

      current.supervisors += 1;
      current.evaluators += getNumber(row.numsum);
      current.submitted += getNumber(row.EVP_set_evaluators);
      current.waitingHrCheck += row.waitingHrCheck;
      current.numHrCheck += row.numHrCheck;

      if (isHeadOffice || !isHiddenBelongId(belongKey)) {
        const districtKey = `${key}-${districtGroupKey}`;
        const district = current.districts.get(districtKey) || {
          districtId: districtKey,
          districtName: districtLabel,
          regionId: key,
          belongId: belongKey,
          supervisors: 0,
          evaluators: 0,
          submitted: 0,
          waitingHrCheck: 0,
          numHrCheck: 0,
          pending: 0,
        };

        district.supervisors += 1;
        district.evaluators += getNumber(row.numsum);
        district.submitted += getNumber(row.EVP_set_evaluators);
        district.waitingHrCheck += row.waitingHrCheck;
        district.numHrCheck += row.numHrCheck;
        district.pending += Math.max(
          getNumber(row.numsum) - getNumber(row.EVP_set_evaluators),
          0,
        );
        current.districts.set(districtKey, district);
      }
      regionMap.set(key, current);
    });

    return Array.from(regionMap.values())
      .map((region) => {
        const statusTotal =
          region.submitted + region.waitingHrCheck + region.numHrCheck;

        return {
          ...region,
          districts: Array.from(region.districts.values())
            .map((district) => ({
              ...district,
              percent: getPercent(district.submitted, district.evaluators),
            }))
            .sort((a, b) =>
              String(a.districtName).localeCompare(String(b.districtName), "th"),
            ),
          percent: getPercent(region.submitted, region.supervisors),
          sentPercent: getPercent(region.submitted, statusTotal),
          waitingPercent: getPercent(region.waitingHrCheck, statusTotal),
          checkedPercent: getPercent(region.numHrCheck, statusTotal),
        };
      })
      .sort((a, b) => String(a.regionId).localeCompare(String(b.regionId), "th"));
  }, [roundSupervisorRows, summary.totalEvaluators]);

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
  const hasTableFilter =
    tableFilters.keyword ||
    tableFilters.employeeCode ||
    tableFilters.workplace ||
    tableFilters.scoreRange;
  const maxScoreDistribution = Math.max(
    ...dashboardMeta.scoreDistribution.map((item) => item.count),
    0,
  );
  const totalScoreDistribution = dashboardMeta.scoreDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const topScoreDistribution = dashboardMeta.scoreDistribution.reduce(
    (topItem, item) => (item.count > (topItem?.count || 0) ? item : topItem),
    null,
  );
  const highScoreDistribution = dashboardMeta.scoreDistribution
    .filter((item) => /^90|^80/.test(String(item.label)))
    .reduce((sum, item) => sum + item.count, 0);
  const highScorePercent = totalScoreDistribution
    ? getPercent(highScoreDistribution, totalScoreDistribution)
    : 0;

  const heroRoundTitle = selectedRound?.EVT_Name || "รอบประเมิน";

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
              ประเมินแล้ว {row.EVP_set_evaluators}/{row.numsum} คน
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
            if (selectedRound?.EVT_ID || row.EVT_ID) {
              query.set("EVT_ID", selectedRound?.EVT_ID || row.EVT_ID);
            }
            if (selectedRound?.EVT_Name || row.EVT_Name) {
              query.set("EVT_Name", selectedRound?.EVT_Name || row.EVT_Name);
            }
            const evaluableEmployees = getNumber(row.numsum ?? row.totalEvaluators);
            const submittedEmployees = getNumber(
              row.EVP_set_evaluators ?? row.submitted,
            );
            const remainingEvaluators = Math.max(
              evaluableEmployees - submittedEmployees,
              0,
            );

            query.set("averageScore", String(row.averageScore || 0));
            query.set("numsum", String(evaluableEmployees));
            query.set("EVP_set_evaluators", String(submittedEmployees));
            query.set("totalEvaluators", String(evaluableEmployees));
            query.set("evaluableEmployees", String(evaluableEmployees));
            query.set("submitted", String(submittedEmployees));
            query.set("pending", String(remainingEvaluators));
            query.set("remainingEvaluators", String(remainingEvaluators));

            const detailPath = query.toString()
              ? `/Admin_Check/${row.id}?${query.toString()}`
              : `/Admin_Check/${row.id}`;

            navigate(detailPath, {
              state: {
                supervisor: row,
                selectedRound,
                returnTo: `${location.pathname}${location.search}`,
                dashboardReturnState: {
                  selectedRoundId, selectedYear, dashboardView, expandedRegionIds,
                  tableFilters, draftTableFilters, tablePage,
                  viewedRowKey: getDashboardRowKey(row),
                },
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
    setTablePage(1);
    setDashboardView("overview");
    setExpandedRegionIds([]);
    setSelectedRoundId(roundId);
    setTableFilters({
      keyword: "",
      employeeCode: "",
      workplace: "",
      scoreRange: "",
    });

    setDraftTableFilters({ keyword: "", employeeCode: "", workplace: "", scoreRange: "" });

    // หาข้อมูลรอบที่กด
    const round = assessmentRounds.find((item) => item.id === roundId);

    if (!round) {
      console.log("ไม่พบรอบ:", roundId);
      return;
    }

  };

  useEffect(() => {
    if (selectedRound) fetchDashboardDetail(selectedRound);
  }, [selectedRound, fetchDashboardDetail]);

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
                       <Typography.Text>
                       การประเมินรอบที่   {round.label}
                      </Typography.Text>
                      <Typography.Title level={3}>
                        {round.EVT_Name}
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

  if (loadingDashboard) {
    return (
      <PagePanel
        eyebrow="Admin Console"
        title="กำลังเตรียมแดชบอร์ด"
        description={`ระบบกำลังดึงข้อมูล${selectedRound?.label || "รอบประเมิน"} และจัดภาพรวมให้พร้อมใช้งาน`}
        action={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setSelectedRoundId(null)}
          >
            เลือกรอบอื่น
          </Button>
        }
        className="admin-dashboard-loading-page"
        showBack={false}
      >
        <div className="admin-dashboard-loader">
          <div className="admin-dashboard-loader-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="admin-dashboard-loader-copy">
            <Typography.Text className="admin-dashboard-loader-badge">
              <BarChartOutlined />
              SAK Dashboard
            </Typography.Text>
            <Typography.Title level={3}>
              กำลังโหลดข้อมูลแดชบอร์ด
            </Typography.Title>
            <Typography.Paragraph>
              รวมสถานะหัวหน้า ผู้ประเมิน และคะแนนเฉลี่ยของรอบนี้
            </Typography.Paragraph>
          </div>
          <div className="admin-dashboard-loader-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
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

        

        
      </Card>
      <Card className="clean-card admin-round-summary-panel" variant="outlined">

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
    <Card
        className="clean-card admin-business-region-card"
        title="ภาพรวมตามภาคธุรกิจ"
        variant="outlined"
      >

        
        {businessRegionRows.length ? (
          <div className="admin-business-region-list">
            {businessRegionRows.map((region, index) => {
              const waitStart = region.sentPercent;
              const checkedStart = region.sentPercent + region.waitingPercent;
              const checkedEnd = checkedStart + region.checkedPercent;
              const theme =
                region.regionId === "6" ? "office" : `theme-${(index % 3) + 1}`;
              const isExpanded = expandedRegionIds.includes(region.regionId);

              return (
              <div
                className={`admin-business-region-item ${theme} ${
                  isExpanded ? "is-expanded" : ""
                }`}
                key={region.regionId}
                style={{
                  "--sent-size": region.sentPercent,
                  "--wait-start": waitStart,
                  "--wait-end": checkedStart,
                  "--checked-start": checkedStart,
                  "--checked-end": checkedEnd,
                  "--region-percent": `${region.percent}%`,
                }}
              >
                <div className="admin-business-region-cover">
                  <div className="admin-business-region-cover-badge">
                    <BarChartOutlined />
                    SAK Dashboard
                  </div>
                  <div className="admin-business-region-cover-copy">
                    <strong>{region.regionName}</strong>
                    <span>ภาพรวมผลประเมินตามพื้นที่ธุรกิจ</span>
                  </div>
                </div>

                <div className="admin-business-region-body">
                  <div className="admin-business-region-heading">
                    <div>
                      <Typography.Text type="secondary">
                       จำนวนผู้ที่ได้รับการประเมิน
                      </Typography.Text>
                    </div>
                    {region.regionId !== "unknown" ? (
                      <Tag className="admin-business-region-tag">
                        {region.regionId === "6"
                          ? "HQ"
                          : `ภาคธุรกิจที่ ${region.regionId}`}
                      </Tag>
                    ) : null}
                  </div>

                  <div className="admin-business-region-content">
                    <div className="admin-business-region-donut">
                      <div>
                        <strong>{region.supervisors}</strong>
                        <span>คน</span>
                      </div>
                    </div>

                    <div className="admin-business-region-status">
                      <div>
                        <i className="is-sent" />
                        <span>ประเมินแล้ว</span>
                        <strong>{region.submitted}</strong>
                      </div>
                      <div>
                        <i className="is-waiting" />
                        <span>รอตรวจ</span>
                        <strong>{region.waitingHrCheck}</strong>
                      </div>
                      <div>
                        <i className="is-checked" />
                        <span>ตรวจแล้ว</span>
                        <strong>{region.numHrCheck}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="admin-business-region-percent">
                    <div>
                      <span>คิดเป็น</span>
                      <strong>{region.percent}%</strong>
                    </div>
                    <div className="admin-business-region-track">
                      <span />
                    </div>
                    <Button
                      shape="circle"
                      icon={<ArrowRightOutlined />}
                      aria-label={`ดูข้อมูล ${region.regionName}`}
                      onClick={() =>
                        setExpandedRegionIds((current) =>
                          current.includes(region.regionId)
                            ? current.filter((id) => id !== region.regionId)
                            : [...current, region.regionId],
                        )
                      }
                    />
                  </div>

                  {isExpanded ? (
                    <div className="admin-business-region-districts">
                      <div className="admin-business-region-districts-head">
                        <Typography.Text strong>
                          {String(region.regionId) === "6" ? "ฝ่ายในนี้" : "เขตในภาคนี้"}
                        </Typography.Text>
                        <Tag className="admin-business-region-tag">
                          {region.districts.length} {String(region.regionId) === "6" ? "ฝ่าย" : "เขต"}
                        </Tag>
                      </div>

                      {region.districts.map((district) => (
                        <div
                          className="admin-business-region-district-item"
                          key={district.districtId}
                        >
                          <div>
                            <strong>{district.districtName}</strong>
                            <span>
                              ผู้รับการประเมิน {district.supervisors} คน · ต้องประเมินทั้งหมด{" "}
                              {district.evaluators} รายการ
                            </span>
                          </div>
                          <div className="admin-business-region-district-progress">
                            <Progress
                              percent={district.percent}
                              showInfo={false}
                              size="small"
                              strokeColor="var(--region-accent)"
                            />
                            <span>
                              ส่งแล้ว {district.submitted} รายการ · ยังไม่ส่ง{" "}
                              {district.pending} รายการ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <Empty description="ยังไม่มีข้อมูลภาคธุรกิจในรอบนี้" />
        )}
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
            title="สถานะการประเมินผู้บังคับบัญ"
            variant="outlined"
          >
            <div className="admin-status-overview row">
              <div>
                <CheckCircleOutlined />
                <span>ถูกประเมินแล้ว</span>
                <strong>{summary.completed} คน</strong>
              </div>
              <div>
                <ClockCircleOutlined />
                <span>ต้องติดตาม</span>
                <strong>{dashboardViewOptions[1].count} คน</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} className="admin-score-analysis-row">
        <Col xs={24} xl={8}>
          <Card
            className="clean-card admin-score-distribution-card"
            variant="outlined"
          >
            {dashboardMeta.scoreDistribution.length ? (
              <div className="admin-score-distribution-content">
                <div className="admin-score-distribution-hero">
                  <div className="admin-score-distribution-title">
                    <span className="admin-score-distribution-icon">
                      <BarChartOutlined />
                    </span>
                    <div>
                      <Typography.Title level={4}>
                        การกระจายคะแนน
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        จำนวนหัวหน้าตามช่วงคะแนน
                      </Typography.Text>
                    </div>
                  </div>

                  <div className="admin-score-distribution-total">
                    <TeamOutlined />
                    <div>
                      <span>รวมทั้งหมด</span>
                      <strong>{totalScoreDistribution} คน</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-score-distribution-list">
                  {dashboardMeta.scoreDistribution.map((item) => {
                    const percent = totalScoreDistribution
                      ? getPercent(item.count, totalScoreDistribution)
                      : 0;
                    const rangeMeta = getScoreRangeMeta(item.label);

                    return (
                      <div
                        className={`admin-score-distribution-row is-${rangeMeta.tone}`}
                        key={item.key}
                      >
                        <div className="admin-score-range-label">
                          <strong>{item.label}</strong>
                          <span>{rangeMeta.level}</span>
                        </div>
                        <div className="admin-score-distribution-track">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <Typography.Text
                          strong
                          className="admin-score-distribution-count"
                        >
                          {item.count} คน
                        </Typography.Text>
                        <Typography.Text
                          type="secondary"
                          className="admin-score-distribution-percent"
                        >
                          {percent}%
                        </Typography.Text>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-score-distribution-summary">
                  <div>
                    
                    <TeamOutlined />
                    <span>รวมทั้งหมด</span>
                    <strong>{totalScoreDistribution} คน</strong>
                  </div>
                  <div>
                    <BarChartOutlined />
                    <span>ช่วงที่มากสุด</span>
                    <strong>{topScoreDistribution?.label || "-"}</strong>
                  </div>
                  <div>
                    <StarFilled />
                    <span>คะแนนสูง 80+</span>
                    <strong>{highScorePercent}%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <Empty description="ยังไม่มีข้อมูลการกระจายคะแนน" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            className="clean-card admin-topic-score-card"
            title="คะแนนเฉลี่ยแยกตามหัวข้อ"
            variant="outlined"
          >
            {dashboardMeta.topicScores.length ? (
              <div className="admin-topic-orbit">
                <div
                  className="admin-topic-orbit-ring"
                  style={{
                    background: getTopicChartBackground(dashboardMeta.topicScores),
                  }}
                >
                  <div className="admin-topic-orbit-hole">
                    <BarChartOutlined />
                    <span>หัวข้อประเมิน</span>
                  </div>
                </div>

                {dashboardMeta.topicScores.map((topic, index) => {
                  const percent = topic.percent ?? getPercent(topic.score, 4);
                  const color = TOPIC_SCORE_COLORS[index % TOPIC_SCORE_COLORS.length];

                  return (
                    <div
                      className="admin-topic-orbit-item"
                      key={topic.id || topic.name}
                      style={{
                        ...getTopicPoint(index, dashboardMeta.topicScores.length),
                        "--topic-color": color,
                      }}
                    >
                      <strong>{topic.name}</strong>
                      <span>{percent.toFixed(2)}%</span>
                      <small>
                        เฉลี่ย {topic.score.toFixed(2)} · {topic.totalAnswers} คำตอบ
                      </small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="ยังไม่มีข้อมูลคะแนนแยกตามหัวข้อ" />
            )}
          </Card>
        </Col>
      </Row>


  
      <Card
        className="clean-card admin-table-card"
        title={`รายชื่อหัวหน้า · ${selectedViewLabel}`}
        variant="outlined"
      >
        <form className="admin-table-filter-panel" onSubmit={(event) => {
          event.preventDefault();
          setTableFilters({ ...draftTableFilters });
        }}>
          <Input
            allowClear
            value={draftTableFilters.keyword}
            placeholder="ค้นหาชื่อหัวหน้า"
            onChange={(event) =>
              setDraftTableFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
          />
          <Input
            allowClear
            value={draftTableFilters.employeeCode}
            placeholder="รหัสพนักงาน"
            onChange={(event) =>
              setDraftTableFilters((current) => ({
                ...current,
                employeeCode: event.target.value,
              }))
            }
          />
          <Input
            allowClear
            value={draftTableFilters.workplace}
            placeholder="ฝ่าย / สาขา"
            onChange={(event) =>
              setDraftTableFilters((current) => ({
                ...current,
                workplace: event.target.value,
              }))
            }
          />
          <Select
            allowClear
            value={draftTableFilters.scoreRange || undefined}
            placeholder="กรองคะแนน"
            options={SCORE_FILTER_OPTIONS}
            onChange={(value) =>
              setDraftTableFilters((current) => ({
                ...current,
                scoreRange: value || "",
              }))
            }
          />
          <Button  htmlType="submit">ค้นหา</Button>
          <Button
            disabled={!hasTableFilter && !Object.values(draftTableFilters).some(Boolean)}
            onClick={() => {
              const cleared = { keyword: "", employeeCode: "", workplace: "", scoreRange: "" };
              setTableFilters(cleared);
              setDraftTableFilters(cleared);
            }}
          >
            ล้างตัวกรอง
          </Button>
        </form>

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
        <div ref={supervisorTableRef}>
        <Table
          columns={columns}
          dataSource={dashboardRows}
          loading={loadingDashboard}
          pagination={{
            current: tablePage,
            onChange: setTablePage,
            pageSize: DASHBOARD_TABLE_PAGE_SIZE,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} จาก ${total} รายการ`,
          }}
          rowKey={getDashboardRowKey}
          rowClassName={(row) => getDashboardRowKey(row) === viewedRowKey ? "admin-recently-viewed-row" : ""}
          onRow={(row) => getDashboardRowKey(row) === viewedRowKey ? { tabIndex: -1, "aria-label": "พนักงานที่เพิ่งเปิดดูรายละเอียด" } : {}}
          scroll={{ x: 920 }}
        />
        </div>
      </Card>
    </PagePanel>
  );
}
