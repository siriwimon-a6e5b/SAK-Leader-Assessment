import {
  BarChartOutlined,
  CalendarOutlined,
  CrownOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  IdcardOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Card,
  Empty,
  Progress,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import PagePanel from "../components/PagePanel";
import ProfileYearlyScoreChart from "../components/ProfileYearlyScoreChart";
import apiClient from "../../recoilstore/userStores";

import { formatBuddhistYear, formatThaiProfileDate, formatThaiProfileDateShort, formatThaiRound, formatWorkTenure } from "../../utils/thaiProfileDates";

const SUPERVISOR_PROFILE_DETAIL_API =
  "/api/insurances/getSupervisorProfileDetail";
const EVALUATOR_HISTORY_API = "/api/insurances/getEvaluationHistoryUser";
const EVALUATION_DETAIL_API = "/api/insurances/getEvaluationDetail";
const FORM_DETAIL_API = "/api/insurances/getFormDetailUser";
const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";

function getScorePercent(score) {
  return Math.min(100, Math.round((score / 4) * 100));
}

function getHistoryKey(item, index) {
  return `${item.year}-${item.round}-${item.assessmentTypeId}-${index}`;
}

function getApiResult(data) {
  return data?.result ?? data?.data ?? data ?? {};
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function getFirstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function getNumber(value, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (String(photo).startsWith("http")) return photo;

  return `${EMPLOYEE_PHOTO_URL}/${photo}`;
}

function mapSupervisor(row) {
  return {
    employeeCode: row.employeeCode ?? row.EVP_TargetID ?? row.PerID ?? "",
    name: row.name ?? row.EVP_TargetName ?? row.PerName ?? "-",
    position: row.position ?? row.EVP_PositionName ?? row.PerPST_N ?? "-",
    department: row.department ?? row.EVP_WorkplaceName ?? row.PerWP_N ?? "-",
    workArea: row.workArea ?? row.EVP_WorkplaceCode ?? row.PerWP ?? "-",
    regionId: String(row.region_id ?? row.region ?? row.regionId ?? "").trim(),
    photo: row.photo ?? row.EVP_Photo ?? row.photo_PSN ?? "",
    startWorkDate: row.startWorkDate ?? row.startworkdate_PSN ?? row.EVP_startworkdate_PSN ?? "-",
    leaderStartDate: row.leaderStartDate ?? row.leader_start_date ?? "-",
    status: row.status ?? "มีประวัติ",
    statusColor: row.statusColor ?? "processing",
  };
}

function mapHistory(row) {
  const totalEvaluators = getNumber(
    row.totalEvaluators ?? row.EVP_Number_evaluators ?? row.numsum,
  );
  const submitted = getNumber(
    row.submitted ?? row.EVP_set_evaluators ?? row.submittedCount,
  );

  return {
    // The profile API's legacy EVC_ID comes from permissions and is a round code.
    // latestRoundId is the actual ID from int_evaluation_cycle.
    EVC_ID:
      row.latestRoundId ?? row.evcId ??
      ((row.EVC_Code ?? row.evcCode ?? row.EVC_ID_Code) ? row.EVC_ID : "") ?? "",
    EVC_Code:
      row.EVC_Code ?? row.evcCode ?? row.EVC_ID_Code ?? row.EVC_ID ?? "",
    assessmentTypeId: row.EVT_ID ?? row.assessmentTypeId ?? row.typeId ?? "",
    year: row.year ?? row.EVC_Year ?? "-",
    round: row.round ?? row.EVC_Period ?? row.EVC_Name ?? "-",
    position: row.position ?? row.EVP_PositionName ?? "-",
    department: row.department ?? row.EVP_WorkplaceName ?? "-",
    workArea: row.workArea ?? row.EVP_WorkplaceCode ?? "-",
    score: getNumber(row.score ?? row.averageScore ?? row.avgScore),
    scoredCount: getNumber(row.scoredCount),
    totalEvaluators,
    submitted,
    pending: Math.max(totalEvaluators - submitted, 0),
    assessmentTypes: row.assessmentTypes ?? row.EVT_Name ?? "-",
    resultStatus: row.resultStatus ?? row.statusText ?? "มีประวัติ",
  };
}

function getScoreText(score, maxScore = 5) {
  if (!Number.isFinite(Number(score)) || Number(score) <= 0) return "-";

  return `${Number(score).toFixed(2)}/${maxScore}`;
}

function formatSubmitDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getEvaluationAnswers(data) {
  const result = getApiResult(data);

  if (Array.isArray(result)) return result;
  if (Array.isArray(result.answers)) return result.answers;
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result.detail)) return result.detail;

  return [];
}

function getFormTopicNameMap(data) {
  const result = getApiResult(data);
  const topicMap = new Map();

  if (Array.isArray(result)) {
    result.forEach((row) => {
      if (row.LAC_ID && row.LAC_Name) {
        topicMap.set(String(row.LAC_ID), row.LAC_Name);
      }
    });

    return topicMap;
  }

  getArray(result.topics).forEach((topic) => {
    if (topic.LAC_ID && topic.LAC_Name) {
      topicMap.set(String(topic.LAC_ID), topic.LAC_Name);
    }
  });

  return topicMap;
}

function mapTopicScoresFromAnswers(data, submissionId = "", topicNameMap = new Map()) {
  const topicMap = new Map();

  getEvaluationAnswers(data).forEach((answer) => {
    const answerSubmissionId = String(answer.submission_ID ?? "");

    if (submissionId && answerSubmissionId && answerSubmissionId !== String(submissionId)) {
      return;
    }

    const score = getNumber(answer.score ?? answer.answer_score ?? answer.answer_value);
    const answerType = String(answer.answer_type ?? answer.LAQ_Type ?? "rating").toLowerCase();

    if (!score || answerType === "checkbox" || answerType === "textarea") return;

    const topicId = answer.LAC_ID ?? answer.topicId ?? answer.LAC_Name ?? "topic";
    const label =
      topicNameMap.get(String(topicId)) ??
      answer.LAC_Name ??
      answer.topicName ??
      "หัวข้อประเมิน";
    const current = topicMap.get(topicId) || {
      label,
      totalScore: 0,
      count: 0,
    };

    current.totalScore += score;
    current.count += 1;
    topicMap.set(topicId, current);
  });

  return Array.from(topicMap.values()).map((item) => ({
    label: item.label,
    score: item.totalScore / item.count,
    count: item.count,
  }));
}

function mapGivenEvaluation(row) {
  return {
    submissionId: row.submission_ID ?? row.Submission_ID ?? "",
    EVC_Code: row.EVC_Code ?? row.evcCode ?? "",
    EVC_ID: row.EVC_ID ?? row.evcId ?? "",
    assessmentTypeId: row.EVT_ID ?? row.assessmentTypeId ?? row.typeId ?? "",
    assessmentTypes:
      row.EVT_Name ??
      row.assessment_type_name ??
      row.assessmentTypes ??
      "ประเมินผู้บังคับบัญชา",
    year: row.EVC_Year ?? row.year ?? "",
    round: row.EVC_Period ?? row.period ?? row.round ?? "-",
    targetId: row.EVP_TargetID ?? row.targetId ?? "",
    targetName:
      row.EVP_TargetName ??
      row.target_name ??
      row.targetName ??
      row.EVP_TargetID ??
      "-",
    targetPosition: row.EVP_PositionName ?? row.position ?? "-",
    targetWorkplace: row.EVP_WorkplaceName ?? row.workplace ?? "-",
    targetPhoto: row.EVP_Photo ?? row.photo ?? "",
    score: getNumber(row.Total_Score ?? row.totalScore ?? row.score),
    submittedAt:
      row.submitted_At ??
      row.EVS_SubmittedAt ??
      row.submittedAt ??
      "",
    status: row.statusText ?? row.status ?? "ส่งแล้ว",
    topicScores: getFirstArray(
      row.topicScores,
      row.scoreDetails,
      row.details,
    ).map((item) => ({
      label: item.LAC_Name ?? item.label ?? item.topicName ?? "หัวข้อประเมิน",
      score: getNumber(item.score ?? item.averageScore ?? item.avgScore),
      count: getNumber(item.count ?? item.totalAnswers),
    })).filter((item) => item.score > 0),
  };
}

function getAssessmentTypeStyle(item) {
  const typeId = String(item.assessmentTypeId || "");
  const typeName = String(item.assessmentTypes || "").toLowerCase();

  if (typeId === "1" || typeName.includes("ผู้บังคับ")) {
    return {
      color: "#2563eb",
      softColor: "#eff6ff",
      icon: <CrownOutlined />,
    };
  }

  if (typeId === "2" || typeName.includes("อยู่ร่วม")) {
    return {
      color: "#0f766e",
      softColor: "#ecfdf5",
      icon: <TeamOutlined />,
    };
  }

  if (typeId === "3" || typeName.includes("ประจำปี")) {
    return {
      color: "#7c3aed",
      softColor: "#f5f3ff",
      icon: <BarChartOutlined />,
    };
  }

  return {
    color: "#64748b",
    softColor: "#f8fafc",
    icon: <IdcardOutlined />,
  };
}

function mapPositionTimeline(row) {
  return {
    date: row.MRForm_DateEffect ?? row.date ?? row.createdAt ?? row.EVC_CreatedAt ?? "-",
    label: row.label ?? row.position ?? row.EVP_PositionName ?? "-",
    workArea: row.workArea ?? row.EVP_WorkplaceName ?? "-",
    commandNumber: row.commandNumber ?? row.MRForm_CRnum ?? "",
    ageJob: row.ageJob ?? row.MRP_AGEJob ?? "",
    oldPositionCode: row.oldPositionCode ?? row.MRP_PS_old ?? "",
    oldWorkplaceCode: row.oldWorkplaceCode ?? row.MRP_WP_old ?? "",
    oldBelong: row.oldBelong ?? row.MRP_BL_old ?? "",
    newPositionCode: row.newPositionCode ?? row.MRP_PS_new ?? "",
    newWorkplaceCode: row.newWorkplaceCode ?? row.MRP_WP_new ?? "",
    newBelongCode: row.newBelongCode ?? row.MRP_BR_new ?? "",
    oldPositionName: row.oldPositionName ?? "",
    oldWorkplaceName: row.oldWorkplaceName ?? "",
    oldBelongName: row.oldBelongName ?? "",
    newPositionName: row.newPositionName ?? "",
    newWorkplaceName: row.newWorkplaceName ?? "",
    newBelongName: row.newBelongName ?? "",
  };
}

export default function AdminSupervisorProfileDetailPage() {
  const { employeeCode } = useParams();
  const navigate = useNavigate();
  const [supervisor, setSupervisor] = useState(null);
  const [history, setHistory] = useState([]);
  const [givenEvaluationHistory, setGivenEvaluationHistory] = useState([]);
  const [expandedGivenEvaluations, setExpandedGivenEvaluations] = useState([]);
  const [positionTimeline, setPositionTimeline] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState("");


  const toggleGivenEvaluation = (key) => {
    setExpandedGivenEvaluations((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const fetchSupervisorProfileDetail = useCallback(async () => {
    if (!employeeCode) return;

    setLoadingProfile(true);
    setLoadError("");

    try {
      const response = await apiClient.get(SUPERVISOR_PROFILE_DETAIL_API, {
        params: {
          employeeCode,
          EVP_TargetID: employeeCode,
        },
      });
      const result = getApiResult(response.data);
      const supervisorRow = result.supervisor ?? result.profile ?? result;
      const historyRows = getArray(result.history ?? result.rounds);
      const timelineRows = getArray(
        result.positionTimeline ?? result.positions,
      );
      const mappedHistory = historyRows.map(mapHistory);
      const inlineGivenHistoryRows = getFirstArray(
        result.givenEvaluationHistory,
        result.evaluatorHistory,
        result.evaluatedBySupervisor,
        result.assessmentsGiven,
      );
      let mappedGivenEvaluationHistory =
        inlineGivenHistoryRows.map(mapGivenEvaluation);

      if (!mappedGivenEvaluationHistory.length) {
        try {
          const evaluatorHistoryResponse = await apiClient.get(
            EVALUATOR_HISTORY_API,
            {
              params: {
                EVP_EvaluatorID: employeeCode,
              },
            },
          );
          const evaluatorHistoryResult = getApiResult(
            evaluatorHistoryResponse.data,
          );
          const evaluatorHistoryRows = getFirstArray(
            evaluatorHistoryResult,
            evaluatorHistoryResult.rows,
            evaluatorHistoryResult.history,
            evaluatorHistoryResult.items,
          );

          mappedGivenEvaluationHistory =
            evaluatorHistoryRows.map(mapGivenEvaluation);
        } catch (error) {
          console.error(error);
          mappedGivenEvaluationHistory = [];
        }
      }

      if (mappedGivenEvaluationHistory.length) {
        mappedGivenEvaluationHistory = await Promise.all(
          mappedGivenEvaluationHistory.map(async (item) => {
            if (item.topicScores?.length) return item;

            try {
              const [detailResponse, formResponse] = await Promise.all([
                apiClient.get(
                  EVALUATION_DETAIL_API,
                  {
                    params: {
                      EVC_Code: item.EVC_Code,
                      submission_ID: item.submissionId || undefined,
                      EVP_EvaluatorID: employeeCode,
                      EVP_TargetID: item.targetId,
                    },
                  },
                ),
                apiClient.get(
                  FORM_DETAIL_API,
                  {
                    params: {
                      EVC_Code: item.EVC_Code,
                      supervisor_id: item.targetId,
                    },
                  },
                ),
              ]);
              const topicNameMap = getFormTopicNameMap(formResponse.data);

              return {
                ...item,
                topicScores: mapTopicScoresFromAnswers(
                  detailResponse.data,
                  item.submissionId,
                  topicNameMap,
                ),
              };
            } catch (error) {
              console.error(error);
              return item;
            }
          }),
        );
      }

      setSupervisor(mapSupervisor(supervisorRow));
      setHistory(mappedHistory);
      setGivenEvaluationHistory(mappedGivenEvaluationHistory);
      setPositionTimeline(timelineRows.map(mapPositionTimeline));
    } catch (error) {
      console.error(error);
      setLoadError("โหลดข้อมูลหัวหน้าไม่สำเร็จ");
      setSupervisor(null);
      setHistory([]);
      setGivenEvaluationHistory([]);
      setPositionTimeline([]);
    } finally {
      setLoadingProfile(false);
    }
  }, [employeeCode]);

  useEffect(() => {
    fetchSupervisorProfileDetail();
  }, [fetchSupervisorProfileDetail]);

  if (!employeeCode) return <Navigate to="/Admin_Supervisor_Profile" replace />;

  const totalScore = history.reduce((sum, item) => sum + item.score, 0);
  const averageScore = history.length
    ? (totalScore / history.length).toFixed(2)
    : "0.00";
  const latestHistory = history[0] ?? {
    score: 0,
    round: "-",
    year: "-",
  };

  const handleOpenAssessmentDetail = (item) => {
    const queryParams = new URLSearchParams();
    queryParams.set("from", "supervisor-profile");

    if (item.EVC_ID) queryParams.set("EVC_ID", item.EVC_ID);
    if (item.EVC_Code) queryParams.set("EVC_Code", item.EVC_Code);
    if (item.assessmentTypeId) {
      queryParams.set("EVT_ID", item.assessmentTypeId);
    }
    queryParams.set("averageScore", item.score);
    queryParams.set("numsum", item.totalEvaluators);
    queryParams.set("EVP_set_evaluators", item.submitted);

    navigate(
      `/Admin_Check/${supervisor.employeeCode}?${queryParams.toString()}`,
      {
        state: {
          selectedRound: {
            EVC_ID: item.EVC_ID,
            EVC_Code: item.EVC_Code,
            EVC_Period: item.round,
            EVC_Year: item.year,
            EVT_ID: item.assessmentTypeId,
          },
          supervisor: {
            EVP_TargetID: supervisor.employeeCode,
            EVP_TargetName: supervisor.name,
            EVP_PositionName: supervisor.position,
            EVP_WorkplaceName: supervisor.department,
            EVP_WorkplaceCode: supervisor.workArea,
            EVP_Photo: supervisor.photo,
            averageScore: item.score,
            numsum: item.totalEvaluators,
            EVP_set_evaluators: item.submitted,
            EVT_ID: item.assessmentTypeId,
            EVC_ID: item.EVC_ID,
            EVC_Code: item.EVC_Code,
          },
        },
      },
    );
  };

  if (loadingProfile) {
    return (
      <PagePanel
        eyebrow="Supervisor Profile"
        title="โปรไฟล์หัวหน้าผู้ถูกประเมิน"
        description="กำลังโหลดข้อมูลจาก API"
      >
        <Card className="clean-card" loading variant="outlined" />
      </PagePanel>
    );
  }

  if (!supervisor) {
    return (
      <PagePanel
        eyebrow="Supervisor Profile"
        title="โปรไฟล์หัวหน้าผู้ถูกประเมิน"
        description="ไม่พบข้อมูลหัวหน้าที่เลือก"
      >
        <Card className="clean-card" variant="outlined">
          <Empty description={loadError || "ไม่พบข้อมูลหัวหน้า"} />
        </Card>
      </PagePanel>
    );
  }

  return (
    <PagePanel
      eyebrow="Supervisor Profile"
      title="โปรไฟล์หัวหน้าผู้ถูกประเมิน"
      description="ข้อมูลส่วนบุคคล ประวัติตำแหน่ง และผลการประเมินย้อนหลัง"
    >
      <div className="resume-profile resume-profile-modern">
        {/* =========================
        TOP PROFILE
    ========================== */}
        <div className="resume-profile-top">
          {/* LEFT : PHOTO */}
          <div className="resume-profile-identity">
            <div className="resume-photo-box">
              <Avatar
                className="resume-avatar"
                shape="square" 
                src={getPhotoUrl(supervisor.photo)}
                icon={!supervisor.photo ? <UserOutlined /> : undefined}
              />
            </div>

            <div className="resume-name">
              <Typography.Title level={3}>{supervisor.name}</Typography.Title>

              <Typography.Text>{supervisor.position}</Typography.Text>
            </div>
          </div>

          {/* RIGHT : PERSONAL INFO */}
          <div className="resume-personal-info">
            <div className="resume-personal-heading">
              <div>
                <span className="resume-personal-eyebrow">ข้อมูลบุคลากร</span>
                <Typography.Title level={4}>ข้อมูลส่วนตัว</Typography.Title>
              </div>
              <Tag color={supervisor.statusColor}>{supervisor.status}</Tag>
            </div>

            <div className="resume-info-grid">
              <div>
                <span><IdcardOutlined /> รหัสพนักงาน</span>
                <strong>{supervisor.employeeCode}</strong>
              </div>

              <div>
                <span><CrownOutlined /> ตำแหน่ง</span>
                <strong>{supervisor.position}</strong>
              </div>

              <div>
                <span><TeamOutlined /> ฝ่าย / แผนก</span>
                <strong>{supervisor.department}</strong>
              </div>

              <div>
                <span><EnvironmentOutlined /> พื้นที่</span>
                <strong>
                  {supervisor.regionId === "6"
                    ? "สำนักงานใหญ่"
                    : supervisor.regionId
                      ? `ภาคธุรกิจที่ ${supervisor.regionId}`
                      : "ไม่ระบุภาคธุรกิจ"}
                </strong>
              </div>

              <div>
                <span><CalendarOutlined /> วันที่เริ่มงาน</span>
                <strong>{formatThaiProfileDate(supervisor.startWorkDate)}</strong>
              </div>

              <div>
                <span><CalendarOutlined /> อายุงาน</span>
                <strong>{formatWorkTenure(supervisor.startWorkDate)}</strong>
              </div>

              {/* <div>
                <span><CalendarOutlined /> เริ่มเป็นหัวหน้า</span>
                <strong>{formatThaiProfileDate(supervisor.leaderStartDate)}</strong>
              </div> */}
            </div>


          </div>

        </div>

        {/* =========================
        BODY
    ========================== */}
        <div className="resume-body">
          <header className="resume-document-heading">
            <span>ประวัติหัวหน้าผู้ถูกประเมิน</span>
            <Typography.Title level={2}>{supervisor.name}</Typography.Title>
            <Typography.Text>{supervisor.position} · {supervisor.department}</Typography.Text>
            <div className="resume-document-rule" />
          </header>
          {/* POSITION HISTORY AND SUMMARY */}
          <div className="resume-column resume-overview-row">
            {/* POSITION HISTORY */}
            <section className="resume-section">
              <div className="resume-section-title">
                <HistoryOutlined />
                <span>ประวัติการโยกย้าย</span>
                <b className="resume-history-count">
                  ย้าย {positionTimeline.length} ครั้ง
                </b>
              </div>

              {positionTimeline.length ? (
                <div className="resume-history-list">
                  {positionTimeline.map((item, index) => (
                    <div
                      className="resume-history-item"
                      key={`${item.date}-${index}`}
                    >
                      <div className="resume-history-meta">
                        <div className="resume-history-year">{formatThaiProfileDateShort(item.date)}</div>
                        {item.commandNumber ? (
                          <span className="resume-transfer-age">เลขที่คำสั่ง {item.commandNumber}</span>
                        ) : null}
                      </div>

                      <div className="resume-history-content">
                        {item.oldPositionCode || item.newPositionCode ? (
                          <div className="resume-transfer-card">
                            <div className="resume-transfer-column">
                              <div className="resume-transfer-column-head">เดิม</div>
                              <strong>{item.oldPositionName || item.oldPositionCode || "-"}</strong>
                              <span>พื้นที่ : {item.oldWorkplaceName || item.oldWorkplaceCode || "-"}</span>
                              <span>สังกัด : {item.oldBelongName || item.oldBelong || "-"}</span>
                            </div>
                            <div className="resume-transfer-column is-new">
                              <div className="resume-transfer-column-head">ใหม่</div>
                              <strong>{item.newPositionName || item.newPositionCode || "-"}</strong>
                              <span>พื้นที่ : {item.newWorkplaceName || item.newWorkplaceCode || "-"}</span>
                              <span>สังกัด : {item.newBelongName || item.newBelongCode || "-"}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <strong>{item.label}</strong>
                            <span>{item.workArea}</span>
                          </>
                        )}
                        {item.ageJob ? (
                          <span className="resume-transfer-age">อายุงาน ณ วันที่ยื่นเรื่อง {item.ageJob}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="ยังไม่มีประวัติตำแหน่ง"
                />
              )}
            </section>


            {/* SUMMARY */}
            <section className="resume-section">
              <div className="resume-section-title">
                <BarChartOutlined />
                <span>สรุปผลการประเมิน</span>
              </div>

              <div className="resume-score-summary">
                <div className="resume-score-box">
                  <span>คะแนนเฉลี่ย</span>

                  <strong>
                    {averageScore}
                    <small>/4</small>
                  </strong>

                  <p>{history.length} รอบประเมิน</p>
                </div>

                <div className="resume-score-box">
                  <span>คะแนนล่าสุด</span>

                  <strong>
                    {latestHistory?.score?.toFixed(2) || "0.00"}
                    <small>/4</small>
                  </strong>

                  <p>{formatThaiRound(latestHistory?.round)}</p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="resume-column">
           
            <section className="resume-section">
              <div className="resume-section-title">
                <BarChartOutlined />
                <span>ประวัติผลการประเมิน</span>
              </div>

              {history.length ? (
                <div className="resume-assessment-list">
                  {history.map((item, index) => {
                    const historyKey = getHistoryKey(item, index);

                    return (
                      <button
                        type="button"
                        key={historyKey}
                        className="resume-assessment-item"
                        onClick={() => handleOpenAssessmentDetail(item)}
                      >
                        <div className="resume-assessment-head">
                          <div>
                            <span className="resume-assessment-year">
                              {formatBuddhistYear(item.year)}
                            </span>

                            <strong>{formatThaiRound(item.round)}</strong>
                          </div>

                          <Tag
                            color={
                              item.resultStatus === "รอติดตาม"
                                ? "warning"
                                : "success"
                            }
                          >
                            {item.resultStatus}
                          </Tag>
                        </div>

                        <div className="resume-assessment-type">
                          {item.assessmentTypes}
                        </div>

                        <div className="resume-assessment-score">
                          <div>
                            <span>คะแนน</span>

                            <strong>
                              {item.score.toFixed(2)}
                              <small>/4</small>
                            </strong>
                          </div>

                          <div className="resume-assessment-progress">
                            <Progress
                              percent={getScorePercent(item.score)}
                              showInfo={false}
                              size="small"
                              strokeColor="#60a5fa"
                            />
                          </div>
                        </div>

                        <div className="resume-assessment-footer">
                          <span>
                            ส่งประเมิน{" "}
                            <strong>
                              {item.submitted}/{item.totalEvaluators}
                            </strong>
                          </span>

                          <span>
                            คงเหลือ <strong>{item.pending}</strong>
                          </span>

                          <span className="resume-view-detail">
                            ดูรายละเอียด →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="ยังไม่มีประวัติการประเมิน"
                />
              )}
            </section>

      


             <section className="resume-section">
              <div className="resume-section-title">
                <BarChartOutlined />
                <span>เปรียบเทียบผลการประเมินแต่ละรอบ</span>
              </div>
              <ProfileYearlyScoreChart history={history} />
            </section>

                  <section className="resume-section">
              <div className="resume-section-title">
                <HistoryOutlined />
                <span>ประวัติที่หัวหน้าคนนี้เคยประเมิน</span>
              </div>

              {givenEvaluationHistory.length ? (
                <div className="resume-given-evaluation-list">
                  {givenEvaluationHistory.map((item, index) => {
                    const style = getAssessmentTypeStyle(item);
                    const topicScores = item.topicScores || [];
                    const givenKey = `${item.submissionId || item.EVC_Code || item.EVC_ID}-${item.targetId}-${index}`;
                    const isExpanded = expandedGivenEvaluations.includes(givenKey);

                    return (
                      <article
                        className="resume-given-evaluation-item"
                        key={givenKey}
                        style={{
                          "--history-accent": style.color,
                          "--history-soft": style.softColor,
                        }}
                      >
                        <Avatar
                          size={38}
                          src={getPhotoUrl(item.targetPhoto)}
                          icon={!item.targetPhoto ? <UserOutlined /> : undefined}
                        />

                        <div className="resume-given-evaluation-main">
                          <div className="resume-given-evaluation-top">
                            <div>
                              <strong>{item.targetName}</strong>
                              <span>
                                {item.targetId ? `รหัส ${item.targetId}` : "ผู้ถูกประเมิน"} · {item.targetPosition}
                              </span>
                            </div>
                            <b>{getScoreText(item.score, 5)}</b>
                          </div>

                          <div className="resume-given-evaluation-meta">
                            <span className="resume-given-evaluation-type">
                              {style.icon} {item.assessmentTypes}
                            </span>
                            <span>{formatBuddhistYear(item.year)}</span>
                            <span>{formatThaiRound(item.round)}</span>
                            <span>ส่งเมื่อ {formatSubmitDate(item.submittedAt)}</span>
                          </div>

                          <button
                            type="button"
                            className="resume-given-topic-toggle"
                            onClick={() => toggleGivenEvaluation(givenKey)}
                          >
                            {isExpanded ? "ซ่อนคะแนนรายหัวข้อ" : "ดูคะแนนรายหัวข้อ"}
                          </button>

                          {isExpanded && topicScores.length ? (
                            <div className="resume-given-topic-breakdown">
                              <div className="resume-given-topic-heading">
                                คะแนนแยกหัวข้อใหญ่
                              </div>
                              <div className="resume-given-topic-rows">
                                {topicScores.map((topic) => (
                                  <div
                                    className="resume-given-topic-row"
                                    key={`${item.submissionId}-${topic.label}`}
                                  >
                                    <span>{topic.label}</span>
                                    <div>
                                      <Progress
                                        percent={(topic.score / 5) * 100}
                                        showInfo={false}
                                        size="small"
                                        strokeColor={style.color}
                                      />
                                      <b>{getScoreText(topic.score, 5)}</b>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : isExpanded ? (
                            <div className="resume-given-topic-empty">
                              ไม่มีคะแนนแยกหัวข้อจาก API
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="ยังไม่มีประวัติว่าหัวหน้าคนนี้เคยประเมินใคร"
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </PagePanel>
  );
}
