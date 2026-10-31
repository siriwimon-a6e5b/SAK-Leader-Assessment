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
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Radio,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";


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

function normalizeType(type) {
  return String(type || "rating").trim().toLowerCase();
}

function normalizeId(value) {
  return value === undefined || value === null ? "" : String(value);
}

function mapQuestion(row = {}) {
  if (!row.LAQ_ID && !row.LAQ_Text && !row.LAQ_Name) return null;
  if (String(row.LAQ_Status ?? "1") !== "1") return null;

  return {
    LAQ_ID: normalizeId(row.LAQ_ID || row.LAQ_Text || row.LAQ_Name),
    LAQ_Text: row.LAQ_Text || row.LAQ_Name || "",
    LAQ_Type: normalizeType(row.LAQ_Type),
  };
}

function mapTopic(row = {}) {
  if (String(row.LAC_Status ?? "1") !== "1") return null;

  return {
    LAC_ID: normalizeId(row.LAC_ID),
    LAC_Name: row.LAC_Name || "-",
    LAC_Description: row.LAC_Description || "",
    LAC_Type: normalizeType(row.LAC_Type || row.LAQ_Type),
    questions: [],
  };
}

function mapFormDetailRows(rows = []) {
  const topicMap = new Map();
  const firstRow = rows[0] || {};

  rows.forEach((row) => {
    if (!row.LAC_ID) return;
    const topicId = normalizeId(row.LAC_ID);

    if (!topicMap.has(topicId)) {
      const topic = mapTopic(row);
      if (topic) topicMap.set(topicId, topic);
    }

    const question = mapQuestion(row);
    if (question && topicMap.has(topicId)) {
      topicMap.get(topicId).questions.push(question);
    }
  });

  return {
    LAF_ID: firstRow.LAF_ID,
    LAF_Name: firstRow.LAF_Name || "แบบประเมิน",
    topics: Array.from(topicMap.values()),
  };
}

function mapFormDetail(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return mapFormDetailRows(result);
  if (Array.isArray(result?.rows)) return mapFormDetailRows(result.rows);

  return {
    LAF_ID: result?.LAF_ID,
    LAF_Name: result?.LAF_Name || "แบบประเมิน",
    topics: (result?.topics || [])
      .map((topic) => {
        if (String(topic.LAC_Status ?? "1") !== "1") return null;

        return {
          LAC_ID: normalizeId(topic.LAC_ID),
          LAC_Name: topic.LAC_Name || "-",
          LAC_Description: topic.LAC_Description || "",
          LAC_Type: normalizeType(topic.LAC_Type),
          questions: (topic.questions || []).map(mapQuestion).filter(Boolean),
        };
      })
      .filter(Boolean),
  };
}

function getSupervisorDetail(supervisor, supervisorId) {
  return {
    id: supervisor?.EVP_TargetID || supervisorId,
    name: supervisor?.EVP_TargetName || supervisor?.name || supervisorId || "-",
    position: supervisor?.EVP_PositionName || supervisor?.position || "-",
    department: supervisor?.EVP_WorkplaceName || supervisor?.department || "-",
    workplaceCode: supervisor?.EVP_WorkplaceCode || "",
  };
}

function buildAnswerRows(topics, ratingAnswers, checkboxAnswers, textAnswers) {
  return topics.flatMap((topic) => {
    if (topic.LAC_Type === "checkbox") {
      const selectedValues = checkboxAnswers[topic.LAC_ID] || [];

      return topic.questions.map((question) => ({
        LAC_ID: topic.LAC_ID,
        LAQ_ID: question.LAQ_ID,
        answer_type: "checkbox",
        answer_value: selectedValues.includes(question.LAQ_ID) ? "1" : "0",
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

function buildSubmitPayload({
  assessmentForm,
  topics,
  roundCode,
  supervisorId,
  supervisor,
  evaluator,
  ratingAnswers,
  checkboxAnswers,
  textAnswers,
  finalComment,
}) {
  return {
    EVC_Code: roundCode,
    LAF_ID: assessmentForm?.LAF_ID,
    EVP_TargetID: supervisorId,
    EVP_TargetName: supervisor.name,
    EVP_EvaluatorID: evaluator.PerD,
    EVP_EvaluatorName: evaluator.PerFuNas,
    comment: finalComment.trim(),
    answers: buildAnswerRows(
      topics,
      ratingAnswers,
      checkboxAnswers,
      textAnswers,
    ),
  };
}

function getEvaluationResult(data) {
  return data?.result ?? data?.data ?? data ?? {};
}

function getEvaluationAnswers(data) {
  const result = getEvaluationResult(data);

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.answers)) return result.answers;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.detail)) return result.detail;

  return [];
}

function getEvaluationComment(data) {
  const result = getEvaluationResult(data);
  const commentKeys = [
    "comment",
    "coment",
    "commet",
    "Comment",
    "Submission_Comment",
    "submission_comment",
    "EVH_Comment",
    "EVA_Comment",
    "EVP_Remark",
  ];

  const findComment = (source = {}) => {
    for (const key of commentKeys) {
      if (source[key]) return source[key];
    }

    return "";
  };

  if (Array.isArray(result)) return findComment(result[0]);

  return (
    findComment(result) ||
    findComment(result?.submission) ||
    findComment(result?.rows?.[0]) ||
    findComment(result?.detail?.[0]) ||
    findComment(result?.answers?.[0]) ||
    ""
  );
}

function getEvaluationTargetId(data) {
  const result = getEvaluationResult(data);

  if (Array.isArray(result)) return "";

  return normalizeId(result.EVP_TargetID || result.target_id || result.TargetID);
}

function getEvaluationSubmissionId(data) {
  const result = getEvaluationResult(data);

  if (Array.isArray(result)) return normalizeId(result[0]?.submission_ID);

  return normalizeId(
    result.submission_ID ||
      result.Submission_ID ||
      result.EVS_SubmissionID ||
      result.EVP_SubmissionID,
  );
}

function getAnswerType(answer = {}) {
  return normalizeType(answer.answer_type || answer.LAQ_Type || answer.LAC_Type);
}

function getAnswerValue(answer = {}) {
  return answer.answer_value ?? answer.EVA_Value ?? answer.value ?? "";
}

function getAnswerScore(answer = {}) {
  return answer.score ?? answer.EVA_Score ?? answer.answer_score ?? null;
}

function toScoreNumber(value) {
  const score = Number(value);
  return Number.isNaN(score) ? undefined : score;
}

function hydrateAnswersFromEvaluation(data, selectedSubmissionId = "") {
  const nextRatingAnswers = {};
  const nextCheckboxAnswers = {};
  const nextTextAnswers = {};

  getEvaluationAnswers(data).forEach((answer) => {
    const answerSubmissionId = normalizeId(answer.submission_ID);
    if (
      selectedSubmissionId &&
      answerSubmissionId &&
      answerSubmissionId !== selectedSubmissionId
    ) {
      return;
    }

    const questionId = normalizeId(answer.LAQ_ID);
    const topicId = normalizeId(answer.LAC_ID);
    const answerType = getAnswerType(answer);
    const answerValue = getAnswerValue(answer);
    const answerScore = getAnswerScore(answer);

    if (!questionId) return;

    if (answerType === "checkbox") {
      if (String(answerValue) === "1") {
        nextCheckboxAnswers[topicId] = [
          ...(nextCheckboxAnswers[topicId] || []),
          questionId,
        ];
      }
      return;
    }

    if (answerType === "textarea") {
      nextTextAnswers[questionId] = answerValue || "";
      return;
    }

    const score = toScoreNumber(answerScore || answerValue);
    if (score !== undefined) {
      nextRatingAnswers[questionId] = score;
    }
  });

  return {
    ratingAnswers: nextRatingAnswers,
    checkboxAnswers: nextCheckboxAnswers,
    textAnswers: nextTextAnswers,
    finalComment: getEvaluationComment(data),
  };
}

function getScoreLabel(score) {
  const level = scoreLevels.find((item) => Number(item.score) === Number(score));
  return level?.label || "ยังไม่ได้เลือกคะแนน";
}

function ReadOnlyScore({ score }) {
  if (!score) {
    return (
      <div className="assessment-readonly-empty">
        ยังไม่มีข้อมูลคะแนนของข้อนี้
      </div>
    );
  }

  return (
    <div className="assessment-readonly-score">
      <span className="assessment-readonly-score-number">{score}</span>
      <span>
        <Typography.Text strong>คะแนนที่เลือก</Typography.Text>
        <Typography.Text type="secondary">{getScoreLabel(score)}</Typography.Text>
      </span>
    </div>
  );
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
          {questions.map((question, childIndex) => {
            const selectedScore = Number(ratingAnswers[question.LAQ_ID]);

            return (
              <tr key={question.LAQ_ID}>
                <td>
                  <Typography.Text strong>
                    {topicIndex + 1}.{childIndex + 1} {question.LAQ_Text}
                  </Typography.Text>
                </td>
                {scoreOptions.map((score) => {
                  const isSelected = Number(score.value) === selectedScore;

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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SupervisorAssessmentFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supervisorId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const roundCode = location.state?.EVC_Code || searchParams.get("EVC_Code") || "";
  const submissionId =
    location.state?.submission_ID || searchParams.get("submission_ID") || "";
  const roundPeriod = location.state?.EVC_Period || "";
  const supervisor = getSupervisorDetail(location.state?.supervisor, supervisorId);
  const isReadOnly = Boolean(location.state?.isReadOnly);
  const evaluationDetail = location.state?.evaluationDetail;
  const [messageApi, contextHolder] = message.useMessage();
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const evaluator = useMemo(
    () => ({
      PerD: readTokenValue(userDetail.PerD),
      PerFuNas: readTokenValue(userDetail.PerFuNas),
    }),
    [userDetail],
  );

  const [assessmentForm, setAssessmentForm] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [ratingAnswers, setRatingAnswers] = useState({});
  const [checkboxAnswers, setCheckboxAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({});
  const [finalComment, setFinalComment] = useState("");

  const topics = useMemo(() => assessmentForm?.topics || [], [assessmentForm]);

  const setRatingAnswer = (questionId, score) => {
    setRatingAnswers((current) => ({
      ...current,
      [questionId]: score,
    }));
  };

  const setCheckboxAnswer = (topicId, values) => {
    setCheckboxAnswers((current) => ({
      ...current,
      [topicId]: values,
    }));
  };

  const setTextAnswer = (questionId, value) => {
    setTextAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const fetchAssessmentFormDetail = useCallback(async () => {
    if (!roundCode) {
      setLoadError("ไม่พบรหัสรอบประเมิน");
      setAssessmentForm(null);
      return;
    }

    setLoadingForm(true);
    setLoadError("");

    try {
      // alert(supervisorId);
      const response = await apiClient.get("/getFormDetailUser", {
        params: {
          EVC_Code: roundCode,
          supervisor_id: supervisorId,
        },
      });

      setAssessmentForm(mapFormDetail(response.data));
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
  }, [roundCode, supervisorId]);

  useEffect(() => {
    fetchAssessmentFormDetail();
  }, [fetchAssessmentFormDetail]);

  useEffect(() => {
    setRatingAnswers({});
    setCheckboxAnswers({});
    setTextAnswers({});
    setFinalComment("");
    setLoadError("");

    if (!evaluationDetail) return;

    const detailTargetId = getEvaluationTargetId(evaluationDetail);
    if (detailTargetId && detailTargetId !== normalizeId(supervisorId)) {
      setLoadError("ข้อมูลคำตอบที่โหลดมาไม่ตรงกับผู้ถูกประเมินที่เลือก");
      return;
    }

    const detailSubmissionId = getEvaluationSubmissionId(evaluationDetail);
    if (
      submissionId &&
      detailSubmissionId &&
      detailSubmissionId !== normalizeId(submissionId)
    ) {
      setLoadError("ข้อมูลคำตอบที่โหลดมาไม่ตรงกับรายการประเมินที่เลือก");
      return;
    }

    const hydratedAnswers = hydrateAnswersFromEvaluation(
      evaluationDetail,
      normalizeId(submissionId || detailSubmissionId),
    );

    setRatingAnswers(hydratedAnswers.ratingAnswers);
    setCheckboxAnswers(hydratedAnswers.checkboxAnswers);
    setTextAnswers(hydratedAnswers.textAnswers);
    setFinalComment(hydratedAnswers.finalComment);
  }, [evaluationDetail, supervisorId, roundCode, submissionId]);

  const handleSubmit = async () => {
    if (isReadOnly) return;

    if (!finalComment.trim()) {
      messageApi.warning("กรุณากรอกคอมเม้นก่อนส่งแบบประเมิน"); 
      return;
    }

    const payload = buildSubmitPayload({
      assessmentForm,
      topics,
      roundCode,
      supervisorId,
      supervisor,
      evaluator,
      ratingAnswers,
      checkboxAnswers,
      textAnswers,
      finalComment,
    });

    // console.log(payload);
    // return


    setSubmitting(true);

    try {
      await apiClient.post("/InsertEvaluation", payload);
      messageApi.success("ส่งแบบประเมินเรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "ส่งแบบประเมินไม่สำเร็จ",
      );
      setSubmitting(false);
      return;
    }

    const nextPath = roundCode
      ? `/User_Assess_Supervisor?EVC_Code=${encodeURIComponent(roundCode)}`
      : "/User_Assess_Supervisor";

    navigate(nextPath, {
      replace: true,
      state: {
        EVC_Code: roundCode,
        EVC_Period: roundPeriod,
        submittedSupervisorId: supervisorId,
        submittedSupervisorName: supervisor.name,
      },
    });
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

      <Row gutter={[16, 16]}>
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
            value={supervisor.department}
            detail={supervisor.workplaceCode || "จากข้อมูลสิทธิ์ประเมิน"}
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="รอบประเมิน"
            value={roundPeriod || "-"}
            detail={
              submissionId
                ? `Submission ${submissionId}`
                : roundCode
                  ? `รหัสรอบ ${roundCode}`
                  : "-"
            }
          />
        </Col>
      </Row>

      <Card className="clean-card assessment-form-card" variant="outlined">
        <div className="assessment-form-profile">
          <div className="assessment-form-profile-icon">
            <UserOutlined />
          </div>
          <div>
            <Typography.Text strong>{supervisor.name}</Typography.Text>
            <div>
              <Space size={8} wrap>
                <Typography.Text type="secondary">
                  {supervisor.position}
                </Typography.Text>
                <Tag color="blue">{supervisor.department}</Tag>
              </Space>
            </div>
          </div>
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
                key={topic.LAC_ID || topic.LAC_Name}
                title={
                  <Space align="start" size={10}>
                    <span className="assessment-topic-number">
                      {topicIndex + 1}
                    </span>
                    <span>{topic.LAC_Name}</span>
                  </Space>
                }
                variant="outlined"
              >
                {topic.LAC_Description ? (
                  <Typography.Paragraph>
                    {topic.LAC_Description}
                  </Typography.Paragraph>
                ) : null}

                {topic.LAC_Type === "checkbox" ? (
                  isReadOnly ? (
                    <div className="assessment-readonly-choice-grid">
                      {topic.questions.map((question) => {
                        const isChecked = (
                          checkboxAnswers[topic.LAC_ID] || []
                        ).includes(question.LAQ_ID);

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
                    <Checkbox.Group
                      className="assessment-checkbox-grid"
                      value={checkboxAnswers[topic.LAC_ID] || []}
                      options={topic.questions.map((question) => ({
                        label: question.LAQ_Text,
                        value: question.LAQ_ID,
                      }))}
                      onChange={(values) =>
                        setCheckboxAnswer(topic.LAC_ID, values)
                      }
                    />
                  )
                ) : null}

                {topic.LAC_Type === "textarea" ? (
                  <Space orientation="vertical" size={12} className="full-width">
                    {topic.questions.length ? (
                      topic.questions.map((question) => (
                        <div key={question.LAQ_ID}>
                          <Typography.Text strong>
                            {question.LAQ_Text}
                          </Typography.Text>
                          {isReadOnly ? (
                            <ReadOnlyText value={textAnswers[question.LAQ_ID]} />
                          ) : (
                            <Input.TextArea
                              rows={4}
                              placeholder={question.LAQ_Text}
                              value={textAnswers[question.LAQ_ID] || ""}
                              onChange={(event) =>
                                setTextAnswer(
                                  question.LAQ_ID,
                                  event.target.value,
                                )
                              }
                            />
                          )}
                        </div>
                      ))
                    ) : (
                      <Input.TextArea
                        rows={4}
                        placeholder="ระบุความคิดเห็นเพิ่มเติม"
                      />
                    )}
                  </Space>
                ) : null}

                {topic.LAC_Type !== "checkbox" && topic.LAC_Type !== "textarea" ? (
                  <>
                    {isReadOnly ? (
                      <ReadOnlyRatingTable
                        topicIndex={topicIndex}
                        questions={topic.questions}
                        ratingAnswers={ratingAnswers}
                      />
                    ) : (
                      <>
                        <div className="assessment-score-header">
                          <Typography.Text type="secondary">
                            รายการประเมิน
                          </Typography.Text>
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
                                  <Typography.Text strong>
                                    {level.score}
                                  </Typography.Text>
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
                              className="assessment-subtopic-item"
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
                                    question.LAQ_ID,
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
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

      <Card className="clean-card compact-card" variant="outlined">
        <Space orientation="vertical" size={14} className="full-width">
          <div>
            <Typography.Text strong>คอมเม้นเพิ่มเติม</Typography.Text>
            <Typography.Text type="danger"> *</Typography.Text>
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
              onChange={(event) => setFinalComment(event.target.value)}
            />
          )}
        </Space>
      </Card>

      <Card className="clean-card compact-card" variant="outlined">
        <Space className="assessment-form-actions" wrap>
          {isReadOnly ? (
            <Button onClick={() => navigate(-1)}>กลับ</Button>
          ) : (
            <>
              <Button icon={<StarOutlined />}>บันทึกร่าง</Button>
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
    </PagePanel>
  );
}
