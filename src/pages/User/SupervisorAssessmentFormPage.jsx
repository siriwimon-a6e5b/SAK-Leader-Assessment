import {
  CheckCircleOutlined,
  CheckOutlined,
  FileTextOutlined,
  LikeOutlined,
  MehOutlined,
  StarOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons"; 
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Modal,
  Radio,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import PagePanel, { MetricCard, getSafeBackPath } from "../components/PagePanel";
import { refreshPendingAssessments } from "../../stores/pendingAssessments";

const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";

function getEmployeePhotoUrl(photo) {
  const fileName = String(photo || "").trim();

  if (!fileName) return undefined;

  return `${EMPLOYEE_PHOTO_URL}/${encodeURIComponent(fileName)}`;
}

const scoreOptions = [5, 4, 3, 2, 1].map((score) => ({
  label: String(score),
  value: score,
}));

const scoreLevels = [
  { score: "5", label: "ดีเยี่ยม / ปฏิบัติสม่ำเสมอ", icon: <TrophyOutlined /> },
  { score: "4", label: "ดี / ปฏิบัติได้ดี", icon: <LikeOutlined /> },
  { score: "3", label: "ปานกลาง", icon: <MehOutlined /> },
  { score: "2", label: "ควรปรับปรุง", icon: <ToolOutlined /> },
  { score: "1", label: "ต้องปรับปรุงเร่งด่วน", icon: <WarningOutlined /> },
];

function toText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function getType(value) {
  return String(value || "rating").trim().toLowerCase();
}

function getApiResult(data) {
  return data?.result || {};
}

function getEvaluationDetailResult(data) {
  return data?.result || data || {};
}

function mapFormDetail(data) {
  const result = getApiResult(data);

  if (Array.isArray(result)) {
    const topicMap = new Map();
    const firstRow = result[0] || {};

    result.forEach((row) => {
      const topicId = toText(row.LAC_ID);
      if (!topicId) return;

      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, {
          LAC_ID: topicId,
          LAC_Name: row.LAC_Name || "-",
          LAC_Description: row.LAC_Description || "",
          LAC_Type: getType(row.LAC_Type || row.LAQ_Type),
          questions: [],
        });
      }

      if (row.LAQ_ID) {
        topicMap.get(topicId).questions.push({
          LAQ_ID: toText(row.LAQ_ID),
          LAQ_Text: row.LAQ_Text || row.LAQ_Name || "",
          LAQ_Type: getType(row.LAQ_Type || row.LAC_Type),
        });
      }
    });

    return {
      LAF_ID: firstRow.LAF_ID,
      LAF_Name: firstRow.LAF_Name || "แบบประเมิน",
      topics: Array.from(topicMap.values()),
    };
  }

  return {
    LAF_ID: result.LAF_ID,
    LAF_Name: result.LAF_Name || "แบบประเมิน",
    topics: (result.topics || []).map((topic) => ({
      LAC_ID: toText(topic.LAC_ID),
      LAC_Name: topic.LAC_Name || "-",
      LAC_Description: topic.LAC_Description || "",
      LAC_Type: getType(topic.LAC_Type),
      questions: (topic.questions || []).map((question) => ({
        LAQ_ID: toText(question.LAQ_ID),
        LAQ_Text: question.LAQ_Text || question.LAQ_Name || "",
        LAQ_Type: getType(question.LAQ_Type || topic.LAC_Type),
      })),
    })),
  };
}

function getSupervisorDetail(supervisor, supervisorId) {
  return {
    id: supervisor?.EVP_TargetID || supervisorId,
    name: supervisor?.EVP_TargetName || supervisor?.name || supervisorId || "-",
    position: supervisor?.EVP_PositionName || supervisor?.position || "-",
    department: supervisor?.EVP_WorkplaceName || supervisor?.department || "-",
    workplaceCode: supervisor?.EVP_WorkplaceCode || "",
    photo: supervisor?.EVP_Photo || supervisor?.photo_PSN || supervisor?.photo || "",
  };
}

function getSavedComment(detail = {}) {
  const firstRow = Array.isArray(detail) ? detail[0] || {} : {};
  const source = Array.isArray(detail) ? firstRow : detail;

  return (
    source.comment ||
    source.coment ||
    source.commet ||
    source.Submission_Comment ||
    ""
  );
}

function getSavedAnswers(detail = {}) {
  if (Array.isArray(detail)) return detail;
  if (Array.isArray(detail.answers)) return detail.answers;
  if (Array.isArray(detail.rows)) return detail.rows;
  if (Array.isArray(detail.detail)) return detail.detail;

  return [];
}

function getSavedSubmissionId(detail = {}) {
  if (Array.isArray(detail)) return toText(detail[0]?.submission_ID);

  return toText(detail.submission_ID || detail.Submission_ID);
}

function getSavedTargetId(detail = {}) {
  if (Array.isArray(detail)) return toText(detail[0]?.EVP_TargetID);

  return toText(detail.EVP_TargetID);
}

function getDetailSource(detail = {}) {
  return Array.isArray(detail) ? detail[0] || {} : detail;
}

function getSavedTotalScore(detail = {}) {
  const source = getDetailSource(detail);
  const score = Number(
    source.Total_Score ??
      source.totalScore ??
      source.total_score ??
      source.ES_TotalScore,
  );

  return Number.isFinite(score) && score > 0 ? score : null;
}

function getRatingScoreSummary(ratingAnswers = {}) {
  const scores = Object.values(ratingAnswers)
    .map(Number)
    .filter((score) => Number.isFinite(score) && score > 0);
  const total = scores.reduce((sum, score) => sum + score, 0);

  return {
    count: scores.length,
    total,
    average: scores.length ? total / scores.length : 0,
  };
}

function formatAssessmentScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score) || score <= 0) return "-";

  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function buildAnswersFromSavedDetail(detail = {}, submissionId = "") {
  const ratingAnswers = {};
  const checkboxAnswers = {};
  const textAnswers = {};

  getSavedAnswers(detail).forEach((answer) => {
    const answerSubmissionId = toText(answer.submission_ID);
    if (submissionId && answerSubmissionId && answerSubmissionId !== submissionId) {
      return;
    }

    const topicId = toText(answer.LAC_ID);
    const questionId = toText(answer.LAQ_ID);
    const answerType = getType(answer.answer_type);
    const answerValue = answer.answer_value;
    const score = Number(answer.score || answerValue);

    if (!questionId) return;

    if (answerType === "checkbox") {
      if (String(answerValue) === "1") {
        checkboxAnswers[topicId] = [...(checkboxAnswers[topicId] || []), questionId];
      }
      return;
    }

    if (answerType === "textarea") {
      textAnswers[questionId] = answerValue || "";
      return;
    }

    if (!Number.isNaN(score)) {
      ratingAnswers[questionId] = score;
    }
  });

  return {
    ratingAnswers,
    checkboxAnswers,
    textAnswers,
    finalComment: getSavedComment(detail),
  };
}

function buildSubmitAnswers(topics, ratingAnswers, checkboxAnswers, textAnswers) {
  return topics.flatMap((topic) => {
    if (topic.LAC_Type === "checkbox") {
      const selectedList = checkboxAnswers[topic.LAC_ID] || [];

      return topic.questions.map((question) => ({
        LAC_ID: topic.LAC_ID,
        LAQ_ID: question.LAQ_ID,
        answer_type: "checkbox",
        answer_value: selectedList.includes(question.LAQ_ID) ? "1" : "0",
        score: null,
      }));
    }

    if (topic.LAC_Type === "textarea") {
      return topic.questions.map((question) => ({
        LAC_ID: topic.LAC_ID,
        LAQ_ID: question.LAQ_ID,
        answer_type: "textarea",
        answer_value: textAnswers[question.LAQ_ID] || "",
        score: null,
      }));
    }

    return topic.questions.map((question) => ({
      LAC_ID: topic.LAC_ID,
      LAQ_ID: question.LAQ_ID,
      answer_type: "rating",
      answer_value: ratingAnswers[question.LAQ_ID] || null,
      score: ratingAnswers[question.LAQ_ID] || null,
    }));
  });
}

function getValidationKey(topicId, questionId = "") {
  return questionId
    ? `question:${topicId}:${questionId}`
    : `topic:${topicId}`;
}

function getValidationElementId(key) {
  return `assessment-required-${encodeURIComponent(key)}`;
}

function getMissingAnswers(
  topics,
  ratingAnswers,
  checkboxAnswers,
  textAnswers,
) {
  return topics.flatMap((topic) => {
    if (topic.LAC_Type === "checkbox") {
      return (checkboxAnswers[topic.LAC_ID] || []).length
        ? []
        : [getValidationKey(topic.LAC_ID)];
    }

    return topic.questions
      .filter((question) => {
        if (topic.LAC_Type === "textarea") {
          return !String(textAnswers[question.LAQ_ID] || "").trim();
        }

        const score = Number(ratingAnswers[question.LAQ_ID]);
        return !Number.isFinite(score) || score <= 0;
      })
      .map((question) => getValidationKey(topic.LAC_ID, question.LAQ_ID));
  });
}

function ReadOnlyText({ value }) {
  return (
    <div className="assessment-readonly-text">
      {value || "ไม่มีข้อความที่บันทึกไว้"}
    </div>
  );
}

function ReadOnlyRatingTable({ topicIndex, questions, ratingAnswers }) {
  return (
    <div className="assessment-readonly-rating-table-wrap">
      <table className="assessment-readonly-rating-table">
        <thead>
          <tr>
            <th>หัวข้อย่อย</th>
            {scoreOptions.map((score) => (
              <th key={score.value}>คะแนน {score.value}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((question, childIndex) => (
            <tr key={question.LAQ_ID}>
              <td>
                <Typography.Text strong>
                  {topicIndex + 1}.{childIndex + 1} {question.LAQ_Text}
                </Typography.Text>
              </td>
              {scoreOptions.map((score) => {
                const isSelected = Number(ratingAnswers[question.LAQ_ID]) === score.value;

                return (
                  <td key={score.value}>
                    <span
                      className={
                        isSelected
                          ? "assessment-readonly-score-check is-selected"
                          : "assessment-readonly-score-check"
                      }
                    >
                      {isSelected ? <CheckOutlined /> : null}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupervisorAssessmentFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supervisorId } = useParams();
  const query = new URLSearchParams(location.search);

  const roundCode = location.state?.EVC_Code || query.get("EVC_Code") || "";
  const roundPeriod = location.state?.EVC_Period || "";
  const assessmentTypeId = location.state?.EVT_ID || query.get("EVT_ID") || "";
  const submissionId = location.state?.submission_ID || query.get("submission_ID") || "";
  const isReadOnly = Boolean(location.state?.isReadOnly || submissionId);
  const [supervisor, setSupervisor] = useState(() =>
    getSupervisorDetail(location.state?.supervisor, supervisorId),
  );

  const [messageApi, contextHolder] = message.useMessage();
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const evaluator = useMemo(
    () => ({
      PerD: readTokenValue(userDetail.PerD),
      PerTiNa: readTokenValue(userDetail.PerTiNa),
      PerFuNas: readTokenValue(userDetail.PerFuNas),
    }),
    [userDetail],
  );

  const [assessmentForm, setAssessmentForm] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false);
  const [expandedConfirmComment, setExpandedConfirmComment] = useState(false);
  const submitInFlight = useRef(false);
  const [loadError, setLoadError] = useState("");
  const [ratingAnswers, setRatingAnswers] = useState({});
  const [checkboxAnswers, setCheckboxAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({});
  const [finalComment, setFinalComment] = useState("");
  const [savedTotalScore, setSavedTotalScore] = useState(null);
  const [missingAnswerKeys, setMissingAnswerKeys] = useState([]);

  const topics = assessmentForm?.topics || [];
  const ratingScoreSummary = useMemo(
    () => getRatingScoreSummary(ratingAnswers),
    [ratingAnswers],
  );
  const displayTotalScore = savedTotalScore ?? ratingScoreSummary.total;

  const resetAnswers = () => {
    setPendingSubmission(null);
    setRatingAnswers({});
    setCheckboxAnswers({});
    setTextAnswers({});
    setFinalComment("");
    setSavedTotalScore(null);
    setMissingAnswerKeys([]);
  };

  useEffect(() => {
    setSupervisor(getSupervisorDetail(location.state?.supervisor, supervisorId));
  }, [location.state?.supervisor, supervisorId]);

  const loadFormDetail = async () => {
    if (!roundCode) {
      setLoadError("ไม่พบรหัสรอบประเมิน");
      return;
    }

    setLoadingForm(true);
    setLoadError("");

    try {
      const { data } = await apiClient.get("/getFormDetailUser", {
        params: {
          EVC_Code: roundCode,
          supervisor_id: supervisorId,
        },
      });

      setAssessmentForm(mapFormDetail(data));
    } catch (error) {
      console.error(error);
      setAssessmentForm(null);
      setLoadError( 
        error?.response?.data?.message ||
          error?.message ||
          "โหลดหัวข้อแบบประเมินไม่สำเร็จ",
      );
    } finally {
      setLoadingForm(false);
    }
  };

  const fillSavedAnswers = (detail) => {
    const detailTargetId = getSavedTargetId(detail);
    const detailSubmissionId = getSavedSubmissionId(detail);

    if (detailTargetId && detailTargetId !== toText(supervisorId)) {
      setLoadError("ข้อมูลคำตอบที่โหลดมาไม่ตรงกับผู้ถูกประเมินที่เลือก");
      return;
    }

    if (submissionId && detailSubmissionId && detailSubmissionId !== toText(submissionId)) {
      setLoadError("ข้อมูลคำตอบที่โหลดมาไม่ตรงกับรายการประเมินที่เลือก");
      return;
    }

    const savedAnswers = buildAnswersFromSavedDetail(
      detail,
      toText(submissionId || detailSubmissionId),
    );
    const detailSource = getDetailSource(detail);

    setRatingAnswers(savedAnswers.ratingAnswers);
    setCheckboxAnswers(savedAnswers.checkboxAnswers);
    setTextAnswers(savedAnswers.textAnswers);
    setFinalComment(savedAnswers.finalComment);
    setSavedTotalScore(getSavedTotalScore(detail));
    setSupervisor((current) =>
      getSupervisorDetail(
        {
          ...current,
          ...detailSource,
          EVP_TargetID: detailSource.EVP_TargetID || current.id,
          EVP_TargetName: detailSource.EVP_TargetName || current.name,
          EVP_PositionName: detailSource.EVP_PositionName || current.position,
          EVP_WorkplaceName: detailSource.EVP_WorkplaceName || current.department,
          EVP_WorkplaceCode: detailSource.EVP_WorkplaceCode || current.workplaceCode,
          EVP_Photo: detailSource.EVP_Photo || current.photo,
        },
        supervisorId,
      ),
    );
  };

  const loadSavedEvaluation = async () => {
    if (!isReadOnly) return;

    resetAnswers();

    if (location.state?.evaluationDetail) {
      fillSavedAnswers(getEvaluationDetailResult(location.state.evaluationDetail));
      return;
    }

    try {
      const { data } = await apiClient.get("/getEvaluationDetail", {
        params: {
          EVC_Code: roundCode,
          submission_ID: submissionId || undefined,
          EVP_EvaluatorID: evaluator.PerD,
          EVP_TargetID: supervisorId,
        },
      });

      fillSavedAnswers(getEvaluationDetailResult(data));
    } catch (error) {
      console.error(error);
      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "โหลดรายละเอียดการประเมินไม่สำเร็จ",
      );
    }
  };

  useEffect(() => {
    resetAnswers();
    setAssessmentForm(null);
    loadFormDetail();
  }, [roundCode, supervisorId]);

  useEffect(() => {
    loadSavedEvaluation();
  }, [roundCode, supervisorId, submissionId, isReadOnly]);

  const clearMissingAnswer = (key) => {
    setMissingAnswerKeys((current) => current.filter((item) => item !== key));
  };

  const setRatingAnswer = (topicId, questionId, score) => {
    setRatingAnswers((current) => ({
      ...current,
      [questionId]: score,
    }));
    clearMissingAnswer(getValidationKey(topicId, questionId));
  };

  const setCheckboxAnswer = (topicId, values) => {
    setCheckboxAnswers((current) => ({
      ...current,
      [topicId]: values,
    }));
    if (values.length) clearMissingAnswer(getValidationKey(topicId));
  };

  const setTextAnswer = (topicId, questionId, value) => {
    setTextAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
    if (value.trim()) {
      clearMissingAnswer(getValidationKey(topicId, questionId));
    }
  };

  const handleSubmit = () => {
    if (isReadOnly || submitting || loadingForm || !topics.length) return;

    const missingAnswers = getMissingAnswers(
      topics,
      ratingAnswers,
      checkboxAnswers,
      textAnswers,
    );

    if (missingAnswers.length) {
      setMissingAnswerKeys(missingAnswers);
      messageApi.warning(`กรุณาตอบแบบประเมินให้ครบ ยังเหลือ ${missingAnswers.length} ข้อ`);
      window.requestAnimationFrame(() => {
        document
          .getElementById(getValidationElementId(missingAnswers[0]))
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    if (!finalComment.trim()) {
      setMissingAnswerKeys(["final-comment"]);
      messageApi.warning("กรุณากรอกคอมเม้นก่อนส่งแบบประเมิน");
      window.requestAnimationFrame(() => {
        document
          .getElementById(getValidationElementId("final-comment"))
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setMissingAnswerKeys([]);

    const payload = {
      EVC_Code: roundCode,
      LAF_ID: assessmentForm?.LAF_ID,
      EVP_TargetID: supervisorId,
      EVP_TargetName: supervisor.name,
      EVP_EvaluatorID: evaluator.PerD,
      EVP_EvaluatorName: `${evaluator.PerTiNa.trim()}${evaluator.PerFuNas.trim()}`,
      comment: finalComment.trim(),
      answers: buildSubmitAnswers(topics, ratingAnswers, checkboxAnswers, textAnswers),
    };

    setSubmissionConfirmed(false);
    setExpandedConfirmComment(false);
    setPendingSubmission({
      payload,
      totalScore: ratingScoreSummary.total,
      answeredCount: ratingScoreSummary.count,
    });
  };

  const confirmSubmit = async () => {
    if (isReadOnly || !pendingSubmission || !submissionConfirmed || submitInFlight.current) return;

    submitInFlight.current = true;
    setSubmitting(true);

    try {
      await apiClient.post("/InsertEvaluation", pendingSubmission.payload);
      refreshPendingAssessments(true);
      setPendingSubmission(null);
      await Swal.fire({
        icon: "success",
        title: "ประเมินผลสำเร็จ",
        text: `ขอบคุณสำหรับการประเมินในครั้งนี้ ระบบบันทึกผลของ ${pendingSubmission.payload.EVP_TargetName} เรียบร้อยแล้ว`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: "assessment-submit-swal",
          icon: "assessment-submit-swal-icon",
          title: "assessment-submit-swal-title",
          htmlContainer: "assessment-submit-swal-copy",
          timerProgressBar: "assessment-submit-swal-progress",
        },
      });
    } catch (error) {
      console.error(error);
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "ส่งแบบประเมินไม่สำเร็จ",
      );
      submitInFlight.current = false;
      setSubmitting(false);
      return;
    }

    const backQueryParams = new URLSearchParams();
    if (roundCode) backQueryParams.set("EVC_Code", roundCode);
    if (assessmentTypeId) backQueryParams.set("EVT_ID", assessmentTypeId);

    navigate(
      backQueryParams.toString()
        ? `/User_Assess_Supervisor?${backQueryParams.toString()}`
        : "/User_Assess_Supervisor",
      {
        replace: true,
        state: {
          EVC_Code: roundCode,
          EVC_Period: roundPeriod,
          EVT_ID: assessmentTypeId,
          submittedSupervisorId: supervisorId,
          submittedSupervisorName: supervisor.name,
        },
      },
    );
  };

  return (
    <PagePanel
      eyebrow="Assessment Form"
      title={assessmentForm?.LAF_Name || "แบบประเมิน"}
      description={
        isReadOnly
          ? "แสดงรายละเอียดคะแนนและความคิดเห็นที่เคยส่งประเมินไว้"
          : "ประเมินพฤติกรรมผู้บังคับบัญชาตามระดับความเป็นจริง"
      }
    >
      {contextHolder}

      {loadError ? (
        <Alert
          className="assessment-success-alert"
          title="โหลดข้อมูลแบบประเมินไม่สำเร็จ"
          description={loadError}
          type="warning"
          showIcon
        />
      ) : null}

      {isReadOnly ? (
        <Alert
          className="assessment-success-alert"
          title="รายการนี้ส่งประเมินแล้ว"
          description="หน้านี้เป็นโหมดดูข้อมูลย้อนหลัง ไม่สามารถแก้ไขคำตอบได้"
          type="info"
          showIcon
        />
      ) : null}

      <Row gutter={[16, 16]} className="assessment-form-summary-row">
        <Col xs={24} md={8}>
          <MetricCard
            label="ผู้ถูกประเมิน"
            value={supervisor.name}
            detail={supervisor.position}
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="ฝ่าย/พื้นที่"
               value={<span style={{ fontSize: 28 }}>{supervisor.department}</span>}

            // detail={supervisor.workplaceCode || "จากข้อมูลสิทธิ์ประเมิน"}
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="รอบประเมิน"
            value={roundPeriod || "-"}
            detail={submissionId ? `Submission ${submissionId}` : `รหัสรอบ ${roundCode}`}
          />
        </Col>
      </Row>

      <Card className="clean-card assessment-form-card" variant="outlined">
        <div className="assessment-form-profile">
          <div className="assessment-form-profile-main">
            <Avatar
              className="assessment-form-profile-avatar"
              size={58}
              src={getEmployeePhotoUrl(supervisor.photo)}
              icon={<UserOutlined />}
            />
            <div>
              <Typography.Text strong>{supervisor.name}</Typography.Text>
              <div>
                <Space size={8} wrap>
                  <Typography.Text type="secondary">{supervisor.position}</Typography.Text>
                  <Tag color="blue">{supervisor.department}</Tag>
                </Space> 
              </div>
            </div>
          </div>
          {isReadOnly ? (
            <div className="assessment-total-score-panel">
              <span>คะแนนรวมจากพนักงาน</span>
              <strong>{formatAssessmentScore(displayTotalScore)}</strong>
              <small>
                {savedTotalScore
                  ? "คะแนนรวมจากทุกหัวข้อที่ประเมิน"
                  : `${ratingScoreSummary.count} รายการประเมิน`}
              </small>
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        className="clean-card assessment-score-legend-card"
        title="ระดับคะแนน"
        variant="outlined"
      >
        <Typography.Paragraph>
          โปรดประเมินตามระดับความเป็นจริง โดยคะแนน 5 คือมากที่สุด
        </Typography.Paragraph>
        <div className="assessment-score-legend">
          {scoreLevels.map((level) => (
            <div className="assessment-score-legend-item" key={level.score}>
              <Typography.Text strong>{level.score}</Typography.Text>
              <Typography.Text>{level.label}</Typography.Text>
            </div>
          ))}
        </div>
      </Card>

      <Skeleton active loading={loadingForm}>
        {topics.length ? (
          <div className="assessment-topic-list">
            {topics.map((topic, topicIndex) => (
              <Card
                className="clean-card assessment-topic-card"
                key={topic.LAC_ID}
                title={
                  <Space align="start" size={10}>
                    <span className="assessment-topic-number">{topicIndex + 1}</span>
                    <span>{topic.LAC_Name}</span>
                  </Space>
                }
                variant="outlined"
              >
                {topic.LAC_Description ? (
                  <Typography.Paragraph>{topic.LAC_Description}</Typography.Paragraph>
                ) : null}

                {topic.LAC_Type === "checkbox" ? (
                  isReadOnly ? (
                    <div className="assessment-readonly-choice-grid">
                      {topic.questions.map((question) => {
                        const checkedList = checkboxAnswers[topic.LAC_ID] || [];
                        const isChecked = checkedList.includes(question.LAQ_ID);

                        return (
                          <div
                            className={
                              isChecked
                                ? "assessment-readonly-choice is-selected"
                                : "assessment-readonly-choice"
                            }
                            key={question.LAQ_ID}
                          >
                            <span className="assessment-readonly-checkmark">
                              {isChecked ? <CheckOutlined /> : null}
                            </span>
                            <Typography.Text>{question.LAQ_Text}</Typography.Text>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      id={getValidationElementId(getValidationKey(topic.LAC_ID))}
                      className={`assessment-required-field ${
                        missingAnswerKeys.includes(getValidationKey(topic.LAC_ID))
                          ? "has-error"
                          : ""
                      }`}
                    >
                      <Checkbox.Group
                        className="assessment-checkbox-grid"
                        value={checkboxAnswers[topic.LAC_ID] || []}
                        options={topic.questions.map((question) => ({
                          label: question.LAQ_Text,
                          value: question.LAQ_ID,
                        }))}
                        onChange={(values) => setCheckboxAnswer(topic.LAC_ID, values)}
                      />
                      {missingAnswerKeys.includes(getValidationKey(topic.LAC_ID)) ? (
                        <Typography.Text className="assessment-required-message">
                          กรุณาเลือกอย่างน้อย 1 รายการ
                        </Typography.Text>
                      ) : null}
                    </div>
                  )
                ) : null}

                {topic.LAC_Type === "textarea" ? (
                  <Space orientation="vertical" size={12} className="full-width">
                    {topic.questions.map((question) => (
                      <div
                        id={getValidationElementId(
                          getValidationKey(topic.LAC_ID, question.LAQ_ID),
                        )}
                        className={`assessment-required-field ${
                          missingAnswerKeys.includes(
                            getValidationKey(topic.LAC_ID, question.LAQ_ID),
                          )
                            ? "has-error"
                            : ""
                        }`}
                        key={question.LAQ_ID}
                      >
                        <Typography.Text strong>{question.LAQ_Text}</Typography.Text>
                        {isReadOnly ? (
                          <ReadOnlyText value={textAnswers[question.LAQ_ID]} />
                        ) : (
                          <Input.TextArea
                            rows={4}
                            placeholder={question.LAQ_Text}
                            value={textAnswers[question.LAQ_ID] || ""}
                            onChange={(event) =>
                              setTextAnswer(
                                topic.LAC_ID,
                                question.LAQ_ID,
                                event.target.value,
                              )
                            }
                          />
                        )}
                        {missingAnswerKeys.includes(
                          getValidationKey(topic.LAC_ID, question.LAQ_ID),
                        ) ? (
                          <Typography.Text className="assessment-required-message">
                            กรุณากรอกคำตอบ
                          </Typography.Text>
                        ) : null}
                      </div>
                    ))}
                  </Space>
                ) : null}

                {topic.LAC_Type !== "checkbox" && topic.LAC_Type !== "textarea" ? (
                  isReadOnly ? (
                    <ReadOnlyRatingTable
                      topicIndex={topicIndex}
                      questions={topic.questions}
                      ratingAnswers={ratingAnswers}
                    />
                  ) : (
                    <>
                      <div className="assessment-score-header">
                        <Typography.Text type="secondary">รายการประเมิน</Typography.Text>
                        <div className="assessment-score-levels is-compact">
                          {scoreLevels.map((level) => (
                            <div
                              className="assessment-score-column-label"
                              key={level.score}
                            >
                              <span className="assessment-score-column-head">
                                <span className="assessment-score-column-icon">
                                  {level.icon}
                                </span>
                                <Typography.Text strong>{level.score}</Typography.Text>
                              </span>
                              <Typography.Text type="secondary">
                                {level.label}
                              </Typography.Text>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="assessment-subtopic-list">
                        {topic.questions.map((question, childIndex) => (
                          <div
                            id={getValidationElementId(
                              getValidationKey(topic.LAC_ID, question.LAQ_ID),
                            )}
                            className={`assessment-subtopic-item ${
                              missingAnswerKeys.includes(
                                getValidationKey(topic.LAC_ID, question.LAQ_ID),
                              )
                                ? "has-error"
                                : ""
                            }`}
                            key={question.LAQ_ID}
                          >
                            <div className="assessment-subtopic-copy">
                              <FileTextOutlined className="list-icon" />
                              <div>
                                <Typography.Text strong>
                                  {topicIndex + 1}.{childIndex + 1}{" "}
                                  {question.LAQ_Text}
                                </Typography.Text>
                                <div>
                                  <Typography.Text type="secondary">
                                    เลือกระดับคะแนนที่ตรงกับความคิดเห็นของคุณ
                                  </Typography.Text>
                                </div>
                              </div>
                            </div>
                            <Radio.Group
                              className="assessment-score-group"
                              value={ratingAnswers[question.LAQ_ID]}
                              options={scoreOptions}
                              optionType="button"
                              buttonStyle="solid"
                              onChange={(event) =>
                                setRatingAnswer(
                                  topic.LAC_ID,
                                  question.LAQ_ID,
                                  event.target.value,
                                )
                              }
                            />
                            {missingAnswerKeys.includes(
                              getValidationKey(topic.LAC_ID, question.LAQ_ID),
                            ) ? (
                              <Typography.Text className="assessment-required-message">
                                กรุณาเลือกคะแนน
                              </Typography.Text>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  )
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="clean-card compact-card" variant="outlined">
            <Empty description="ไม่พบหัวข้อประเมินในรอบนี้" />
          </Card>
        )}
      </Skeleton>

      <Card
        id={getValidationElementId("final-comment")}
        className={`clean-card compact-card assessment-required-field ${
          missingAnswerKeys.includes("final-comment") ? "has-error" : ""
        }`}
        variant="outlined"
      >
        <Space orientation="vertical" size={14} className="full-width">
          <div>
            <Typography.Text strong>คอมเม้นเพิ่มเติม</Typography.Text>
            {!isReadOnly ? <Typography.Text type="danger"> *</Typography.Text> : null}
          </div>
          {isReadOnly ? (
            <ReadOnlyText value={finalComment} />
          ) : (
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="กรุณาระบุความคิดเห็นเพิ่มเติมก่อนส่งแบบประเมิน"
              value={finalComment}
              onChange={(event) => {
                setFinalComment(event.target.value);
                if (event.target.value.trim()) clearMissingAnswer("final-comment");
              }}
            />
          )}
          {missingAnswerKeys.includes("final-comment") ? (
            <Typography.Text className="assessment-required-message">
              กรุณากรอกความคิดเห็นเพิ่มเติม
            </Typography.Text>
          ) : null}
        </Space>
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space className="assessment-form-actions" wrap>
          {isReadOnly ? (
            <Button onClick={() => navigate(getSafeBackPath(location.pathname, location.search))}>
              กลับ
            </Button>
          ) : (
            <>
              {/* <Button icon={<StarOutlined />}>บันทึกร่าง</Button> */}
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                disabled={!topics.length || loadingForm}
                onClick={handleSubmit}
              >
                ส่งแบบประเมิน
              </Button>
            </>
          )}
        </Space>
      </Card>
      <Modal
        centered
        title="ยืนยันการส่งแบบประเมิน"
        open={Boolean(pendingSubmission)}
        onCancel={() => { if (!submitInFlight.current) setPendingSubmission(null); }}
        onOk={confirmSubmit}
        okText="ยืนยันส่งแบบประเมิน"
        okButtonProps={{ disabled: !submissionConfirmed }}
        cancelText="กลับไปแก้ไข"
        confirmLoading={submitting}
        cancelButtonProps={{ disabled: submitting }}
        closable={!submitting}
        mask={{ closable: !submitting }}
        keyboard={!submitting}
        width="min(640px, calc(100vw - 32px))"
      >
        {pendingSubmission ? (
          <Space orientation="vertical" size={18} className="full-width" style={{ padding: "12px 0" }}>
            <div>
              <Typography.Text type="secondary">ผู้ถูกประเมิน</Typography.Text>
              <Typography.Title level={5} style={{ margin: "4px 0" }}>
                {pendingSubmission.payload.EVP_TargetName}
              </Typography.Title>
              <Typography.Text type="secondary">รอบ {roundPeriod || roundCode}</Typography.Text>
            </div>
            <div style={{ padding: 24, textAlign: "center", background: "#f2f7f6", border: "1px solid #dfeae6", borderRadius: 12, width: "100%" }}>
              <Typography.Text>คะแนนรวมที่ประเมิน</Typography.Text>
              <Typography.Title level={2} style={{ margin: "8px 0", color: "#326f70" }}>
                {formatAssessmentScore(pendingSubmission.totalScore)} คะแนน
              </Typography.Title>
              <Typography.Text type="secondary">จากข้อให้คะแนนที่ตอบ {pendingSubmission.answeredCount} ข้อ</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>ความคิดเห็นเพิ่มเติม</Typography.Text>
              <Typography.Paragraph style={{ marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 160, overflowY: "auto" }}>
                {expandedConfirmComment
                  ? pendingSubmission.payload.comment
                  : Array.from(pendingSubmission.payload.comment).slice(0, 100).join("")}
                {Array.from(pendingSubmission.payload.comment).length > 100 ? (
                  <>
                    {!expandedConfirmComment ? "… " : " "}
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: "0 4px", height: "auto" }}
                      aria-expanded={expandedConfirmComment}
                      onClick={() => setExpandedConfirmComment((current) => !current)}
                    >
                      {expandedConfirmComment ? "ย่อข้อความ" : "ดูเพิ่มเติม"}
                    </Button>
                  </>
                ) : null}
              </Typography.Paragraph>
            </div>
            <Alert
              type="warning"
              showIcon
              title="เมื่อส่งผลประเมินแล้ว จะไม่สามารถกลับมาแก้ไขได้"
              description="โปรดตรวจสอบคะแนนและความคิดเห็นอีกครั้งก่อนยืนยันการส่ง"
            />
            <Checkbox
              checked={submissionConfirmed}
              disabled={submitting}
              onChange={(event) => setSubmissionConfirmed(event.target.checked)}
            >
              ข้าพเจ้าตรวจสอบผลประเมินแล้ว ยืนยันการส่ง และรับทราบว่าไม่สามารถกลับมาแก้ไขได้
            </Checkbox>
          </Space>
        ) : null}
      </Modal>
    </PagePanel>
  );
}
