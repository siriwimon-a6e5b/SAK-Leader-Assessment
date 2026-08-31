import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { buildAdminTokenPayload } from "../../utils/tokenUtils";

function countQuestions(form) {
  return (
    form.topics?.reduce(
      (sum, topic) => sum + (topic.questions?.length || 0),
      0,
    ) || 0
  );
}

function getTopicType(topic = {}) {
  return topic.LAC_Type || topic.type || "rating";
}

function countQuestionsByType(form) {
  return (form.topics || []).reduce(
    (summary, topic) => {
      const questionCount = topic.questions?.length || 0;
      const type = getTopicType(topic);

      return {
        ...summary,
        [type]: (summary[type] || 0) + questionCount,
      };
    },
    { rating: 0, checkbox: 0, textarea: 0 },
  );
}

function getTopicTypeLabel(topic) {
  const type = getTopicType(topic);

  if (type === "checkbox")
    return `Checkbox เลือกได้ไม่เกิน ${topic.maxSelections || 3} ข้อ`;
  if (type === "textarea") return "ข้อความยาว";

  return `Radio คะแนน ${topic.scoreMax || 5}-${topic.scoreMin || 1}`;
}

const topicTypeOptions = [
  { label: "Radio คะแนน 5-1", value: "rating" },
  { label: "Checkbox เลือกได้หลายข้อ", value: "checkbox" },
  { label: "ข้อความยาว", value: "textarea" },
];

const ratingScores = [4, 3, 2, 1];

const supervisorAssessmentType = "1";
const supervisorAssessmentYear = "2569";

function buildCreateFormPayload(values, adminToken) {
  return {
    assessment_type: values.assessmentType || "",
    form_name: values.name?.trim(),
    form_description: values.description?.trim() || "แบบประเมินที่สร้างใหม่",
    idAdminNew: adminToken.PerD,
    // create_position: adminToken.PerPST_N,
    // create_workplace: adminToken.PerWP_N,
    // is_selectable: false,
  };
}

function getQuestionText(question) {
  if (typeof question === "string") return question;

  return (
    question?.LAQ_Text ||
    question?.LAQ_Name ||
    question?.question_name ||
    question?.title ||
    question?.text ||
    ""
  );
}

function buildSaveFormDetailPayload(form, adminToken) {
  return {
    LAF_ID: form.LAF_ID,
    idAdminNew: adminToken.PerD,
    topics: (form.topics || []).map((topic, topicIndex) => {
      const topicType = getTopicType(topic);

      return {
        action: topic.LAC_ID ? "update" : "insert",
        LAC_ID: topic.LAC_ID,
        LAC_Type: topicType,
        topic_order: topicIndex + 1,
        topic_name: topic.title,
        topic_type: topicType,
        score_min: topicType === "rating" ? topic.scoreMin || 1 : null,
        score_max: topicType === "rating" ? topic.scoreMax || 5 : null,
        max_selections:
          topicType === "checkbox" ? topic.maxSelections || 3 : null,
        questions: (topic.questions || []).map((question, questionIndex) => ({
          action: question?.LAQ_ID ? "update" : "insert",
          LAQ_ID: question?.LAQ_ID,
          question_order: questionIndex + 1,
          question_name: getQuestionText(question),
          question_type: topicType,
        })),
      };
    }),
  };
}

function getApiFormDetail(responseData) {
  const detail =
    responseData?.result?.data ||
    responseData?.data ||
    responseData?.result ||
    responseData ||
    {};

  if (Array.isArray(detail)) return mapJoinedFormDetailRows(detail);

  return detail;
}

function mapJoinedFormDetailRows(rows = []) {
  const firstRow = rows[0] || {};
  const topicMap = new Map();

  rows.forEach((row) => {
    if (!row.LAC_ID) return;

    if (!topicMap.has(row.LAC_ID)) {
      topicMap.set(row.LAC_ID, {
        LAC_ID: row.LAC_ID,
        LAC_Name: row.LAC_Name,
        LAC_Description: row.LAC_Description,
        LAC_Type: row.LAC_Type,
        LAC_Status: row.LAC_Status,
        questions: [],
      });
    }

    if (row.LAQ_ID) {
      topicMap.get(row.LAC_ID).questions.push({
        LAQ_ID: row.LAQ_ID,
        LAQ_Text: row.LAQ_Text,
        LAQ_Type: row.LAQ_Type,
        LAQ_Status: row.LAQ_Status,
      });
    }
  });

  return {
    LAF_ID: firstRow.LAF_ID,
    LAF_Name: firstRow.LAF_Name,
    LAF_Description: firstRow.LAF_Description,
    LAF_Status: firstRow.LAF_Status,
    LAF_CreatedAt: firstRow.LAF_CreatedAt,
    LAF_assessmentType: firstRow.LAF_assessmentType,
    topics: Array.from(topicMap.values()),
  };
}

function mapApiQuestion(question = {}) {
  if (typeof question === "string") {
    return {
      LAQ_Text: question,
    };
  }

  return {
    LAQ_ID: question.LAQ_ID || question.question_id || question.id,
    LAQ_Text:
      question.LAQ_Text ||
      question.LAQ_Name ||
      question.question_name ||
      question.title ||
      question.text ||
      "",
    LAQ_Type: question.LAQ_Type || question.question_type || question.type,
    LAQ_Status: question.LAQ_Status || question.status,
  };
}

function getTopicTypeFromQuestions(topic = {}, questions = []) {
  const firstQuestion = questions[0];

  if (topic.LAC_Type) return topic.LAC_Type;
  if (topic.type) return topic.type;
  if (topic.topic_type) return topic.topic_type;
  if (topic.LAT_Type) return topic.LAT_Type;
  if (typeof firstQuestion === "object" && firstQuestion?.LAQ_Type) {
    return firstQuestion.LAQ_Type;
  }

  return "rating";
}

function mapApiTopic(topic = {}) {
  const questions = topic.questions || topic.items || topic.children || [];
  const topicType = getTopicTypeFromQuestions(topic, questions);

  return {
    LAC_ID: topic.LAC_ID || topic.LAT_ID || topic.topic_id || topic.id,
    title:
      topic.LAC_Name ||
      topic.LAT_Name ||
      topic.topic_name ||
      topic.title ||
      "-",
    description:
      topic.LAC_Description || topic.LAT_Description || topic.description || "",
    LAC_Type: topicType,
    type: topicType,
    scoreMin: Number(
      topic.LAC_ScoreMin || topic.LAT_ScoreMin || topic.score_min || 1,
    ),
    scoreMax: Number(
      topic.LAC_ScoreMax || topic.LAT_ScoreMax || topic.score_max || 5,
    ),
    maxSelections: Number(
      topic.LAC_MaxSelections ||
        topic.LAT_MaxSelections ||
        topic.max_selections ||
        3,
    ),
    questions: questions.map(mapApiQuestion).filter(getQuestionText),
  };
}

function mapApiAssessmentForm(item = {}) {
  const topics = item.topics || item.sections || [];

  return {
    LAF_ID: item.LAF_ID,
    LAF_Name: item.LAF_Name || "-",
    LAF_Description: item.LAF_Description || "-",
    LAF_Status: item.LAF_Status || "-",
    LAF_CreatedAt: item.LAF_CreatedAt || "-",
    LAF_assessmentType: item.LAF_assessmentType || "-",
    topics: topics.map(mapApiTopic),
  };
}

function getApiFormList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.result)) return responseData.result;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.result?.data))
    return responseData.result.data;

  return [];
}

function getApiAssessmentTypeList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.result)) return responseData.result;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.result?.data))
    return responseData.result.data;

  return [];
}

function mapApiAssessmentType(item = {}) {
  return {
    label: item.EVT_Name || "-",
    value: String(item.EVT_ID || ""),
    status: item.EVT_Status || "0",
    createdAt: item.EVT_CreatedAt || null,
  };
}

function AssessmentDetailLoading() {
  return (
    <div className="assessment-detail-loading">
      <div className="assessment-loading-head">
        <Skeleton.Input
          active
          size="small"
          className="assessment-loading-title"
        />
        <Skeleton.Button active size="small" />
      </div>
      {[1, 2, 3].map((item) => (
        <div className="assessment-loading-topic" key={item}>
          <Skeleton.Input
            active
            size="small"
            className="assessment-loading-topic-title"
          />
          <div className="assessment-loading-lines">
            <Skeleton.Input active size="small" />
            <Skeleton.Input active size="small" />
            <Skeleton.Input active size="small" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAssessmentFormsPage() {
  const [createForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState();
  const [openCreate, setOpenCreate] = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicType, setTopicType] = useState("rating");
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [savingForm, setSavingForm] = useState(false);
  const [loadingFormDetail, setLoadingFormDetail] = useState(false);
  const [assessmentTypeOptions, setAssessmentTypeOptions] = useState([]);
  const [loadingAssessmentTypes, setLoadingAssessmentTypes] = useState(false);
  const formDetailRequestRef = useRef(0);
  const adminToken = useMemo(
    () => buildAdminTokenPayload(getInitialUserDetail() || {}),
    [],
  );

  const selectedForm =
    forms.find((item) => item.LAF_ID === selectedFormId) || forms[0];

  const fetchAssessmentForms = useCallback(async () => {
    setLoadingForms(true);

    try {
      const response = await apiClient.get("/api/insurances/getForm");
      const apiForms = getApiFormList(response.data).map(mapApiAssessmentForm);

      setForms(apiForms);
      setSelectedFormId((currentId) =>
        apiForms.some((item) => item.LAF_ID === currentId)
          ? currentId
          : apiForms[0]?.LAF_ID,
      );
    } catch (error) {
      console.error(error);
      setForms([]);
      setSelectedFormId(undefined);
      messageApi.error(
        error?.response?.data?.message || "โหลดรายการแบบประเมินไม่สำเร็จ",
      );
    } finally {
      setLoadingForms(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchAssessmentForms();
  }, [fetchAssessmentForms]);

  const fetchAssessmentTypes = useCallback(async () => {
    setLoadingAssessmentTypes(true);

    try {
      const response = await apiClient.get("/api/insurances/getAssessmentType");
      const responseData = response.data;
      const typeList = getApiAssessmentTypeList(responseData);
      const options = typeList.map(mapApiAssessmentType);
      const validOptions = options.filter((item) => item.value);

      setAssessmentTypeOptions(validOptions);
    } catch (error) {
      console.error(error);
      setAssessmentTypeOptions([]);
    } finally {
      setLoadingAssessmentTypes(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessmentTypes();
  }, [fetchAssessmentTypes]);

  const fetchAssessmentFormDetail = useCallback(async () => {
    if (!selectedFormId) return;

    const requestId = formDetailRequestRef.current + 1;
    formDetailRequestRef.current = requestId;

    setLoadingFormDetail(true);

    try {
      const response = await apiClient.get("/api/insurances/getFormDetail", {
        params: {
          LAF_ID: selectedFormId,
          // assessment_type: supervisorAssessmentType,
          // assessment_year: supervisorAssessmentYear,
        },
      });

      const { status, message, result } = response.data || {};

      if (status) {
        console.log(result);
        const detail = getApiFormDetail(response.data);
        const topics = (detail.topics || detail.sections || []).map(
          mapApiTopic,
        );

        setForms((current) =>
          current.map((item) =>
            item.LAF_ID === selectedFormId
              ? {
                  ...item,
                  LAC_Name: detail.LAC_Name || item.LAC_Name,
                  LAF_Description:
                    detail.LAF_Description || item.LAF_Description,
                  topics,
                }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (formDetailRequestRef.current === requestId) {
        setLoadingFormDetail(false);
      }
    }
  }, [selectedFormId]);

  useEffect(() => {
    fetchAssessmentFormDetail();
  }, [fetchAssessmentFormDetail]);

  const summary = useMemo(() => {
    const selectable = forms.filter((item) => item.LAF_Status === "1").length;
    const draft = forms.filter((item) => item.LAF_Status !== "1").length;
    const questionCount = forms.reduce(
      (sum, item) => sum + countQuestions(item),
      0,
    );

    return {
      totalForms: forms.length,
      selectable,
      draft,
      questionCount,
    };
  }, [forms]);

  const updateForms = (updater) => {
    setForms((current) => updater(current));
  };

  const handleSelectForm = (formId) => {
    if (formId === selectedFormId) return;

    formDetailRequestRef.current += 1;
    setQuestionDrafts({});
    setLoadingFormDetail(true);
    setSelectedFormId(formId);
  };

  const handleSaveForm = async () => {
    if (!selectedForm?.LAF_ID) {
      messageApi.warning("กรุณาเลือกแบบประเมินก่อนบันทึก");
      return;
    }

    const payload = buildSaveFormDetailPayload(selectedForm, adminToken);

    if (!payload.topics.length) {
      messageApi.warning("กรุณาเพิ่มหัวข้อใหญ่ก่อนบันทึก");
      return;
    }

    // console.log(payload);
    // return;

    setSavingForm(true);

    try {
      const response = await apiClient.post(
        "/api/insurances/createFormDetail",
        payload,
      );
      const { status, message } = response.data || {};

      // console.log(message);

      if (!status) {
        throw new Error(message || "บันทึกหัวข้อแบบประเมินไม่สำเร็จ");
      }

      messageApi.success(message || "บันทึกหัวข้อแบบประเมินเรียบร้อยแล้ว");
      // await fetchAssessmentForms();
    } catch (error) {
      console.error(error);
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "บันทึกหัวข้อแบบประเมินไม่สำเร็จ",
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleToggleSelectable = async (formId, checked) => {
    const nextStatus = checked ? "1" : "0";
    const targetForm = forms.find((item) => item.LAF_ID === formId);
    const previousStatus = targetForm?.LAF_Status || "0";

    updateForms((current) =>
      current.map((item) =>
        item.LAF_ID === formId
          ? {
              ...item,
              LAF_Status: nextStatus,
            }
          : item,
      ),
    );

    try {
      const payload = {
        LAF_ID: formId,
        LAF_Status: nextStatus,
        idAdminNew: adminToken.PerD,
      };
      const response = await apiClient.post(
        "/api/insurances/updateFormStatus",
        payload,
      );
      const { status, message, data } = response.data || {};

      if (!status) {
        throw new Error(message || "อัปเดตสถานะแบบประเมินไม่สำเร็จ");
      }

      messageApi.success(message || "อัปเดตสถานะแบบประเมินเรียบร้อยแล้ว");

      await fetchAssessmentForms();
    } catch (error) {
      updateForms((current) =>
        current.map((item) =>
          item.LAF_ID === formId
            ? {
                ...item,
                LAF_Status: previousStatus,
              }
            : item,
        ),
      );
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "อัปเดตสถานะแบบประเมินไม่สำเร็จ",
      );
    }
  };

  const handleDeleteForm = (formId) => {
    const targetForm = forms.find((item) => item.LAF_ID === formId);
    if (!targetForm) return;

    modalApi.confirm({
      title: "ลบแบบประเมินนี้?",
      content: `ต้องการลบ "${targetForm.LAF_Name}" ใช่ไหม`,
      okText: "ลบ",
      okButtonProps: { danger: true },
      cancelText: "ยกเลิก",
      centered: true,
      onOk: async () => {
        const previousForms = forms;
        const nextForms = previousForms.filter(
          (item) => item.LAF_ID !== formId,
        );

        updateForms((current) => {
          if (selectedFormId === formId) {
            setSelectedFormId(nextForms[0]?.LAF_ID);
          }

          return nextForms;
        });

        try {
          const payload = {
            LAF_ID: formId,
            idAdminNew: adminToken.PerD,
          };
          const response = await apiClient.post(
            "/api/insurances/deleteForm",
            payload,
          );
          const { status, message } = response.data || {};

          if (!status) {
            throw new Error(message || "ลบแบบประเมินไม่สำเร็จ");
          }

          messageApi.success(message || "ลบแบบประเมินเรียบร้อยแล้ว");
          await fetchAssessmentForms();
        } catch (error) {
          setForms(previousForms);
          setSelectedFormId(formId);
          messageApi.error(
            error?.response?.data?.message ||
              error?.message ||
              "ลบแบบประเมินไม่สำเร็จ",
          );
        }
      },
    });
  };

  const handleDeleteTopic = (topicIndex) => {
    if (!selectedForm) return;

    const targetTopic = selectedForm.topics[topicIndex];
    if (!targetTopic) return;

    modalApi.confirm({
      title: "ลบหัวข้อใหญ่นี้?",
      content: `ต้องการลบ "${targetTopic.title}" และข้อย่อยทั้งหมดในหัวข้อนี้ใช่ไหม`,
      okText: "ลบ",
      okButtonProps: { danger: true },
      cancelText: "ยกเลิก",
      centered: true,
      onOk: async () => {
        const previousForms = forms;

        updateForms((current) =>
          current.map((item) =>
            item.LAF_ID === selectedForm.LAF_ID
              ? {
                  ...item,
                  topics: item.topics.filter(
                    (_, index) => index !== topicIndex,
                  ),
                }
              : item,
          ),
        );

        if (!targetTopic.LAC_ID) {
          messageApi.success("ลบหัวข้อใหญ่เรียบร้อยแล้ว");
          return;
        }

        try {
          const payload = {
            LAF_ID: selectedForm.LAF_ID,
            LAC_ID: targetTopic.LAC_ID,
            idAdminNew: adminToken.PerD,
          };

          // console.log(payload)

          const response = await apiClient.post(
            "/api/insurances/deleteFormTopic",
            payload,
          );
          const { status, message } = response.data || {};

          if (!status) {
            throw new Error(message || "ลบหัวข้อใหญ่ไม่สำเร็จ");
          }

          messageApi.success(message || "ลบหัวข้อใหญ่เรียบร้อยแล้ว");
          await fetchAssessmentFormDetail();
        } catch (error) {
          setForms(previousForms);
          messageApi.error(
            error?.response?.data?.message ||
              error?.message ||
              "ลบหัวข้อใหญ่ไม่สำเร็จ",
          );
        }
      },
    });
  };

  const handleDeleteQuestion = (topicIndex, questionIndex) => {
    if (!selectedForm) return;

    const targetTopic = selectedForm.topics[topicIndex];
    const targetQuestion = targetTopic?.questions[questionIndex];
    if (!targetTopic || !targetQuestion) return;

    modalApi.confirm({
      title: "ลบหัวข้อย่อยนี้?",
      content: `ต้องการลบ "${getQuestionText(targetQuestion)}" ใช่ไหม`,
      okText: "ลบ",
      okButtonProps: { danger: true },
      cancelText: "ยกเลิก",
      centered: true,
      onOk: async () => {
        const previousForms = forms;

        updateForms((current) =>
          current.map((item) =>
            item.LAF_ID === selectedForm.LAF_ID
              ? {
                  ...item,
                  topics: item.topics.map((topic, index) =>
                    index === topicIndex
                      ? {
                          ...topic,
                          questions: topic.questions.filter(
                            (_, childIndex) => childIndex !== questionIndex,
                          ),
                        }
                      : topic,
                  ),
                }
              : item,
          ),
        );

        if (!targetQuestion.LAQ_ID) {
          messageApi.success("ลบหัวข้อย่อยเรียบร้อยแล้ว");
          return;
        }

        try {
          const payload = {
            LAF_ID: selectedForm.LAF_ID,
            LAC_ID: targetTopic.LAC_ID,
            LAQ_ID: targetQuestion.LAQ_ID,
            idAdminNew: adminToken.PerD,
          };

          const response = await apiClient.post(
            "/api/insurances/deleteFormQuestion",
            payload,
          );
          const { status, message } = response.data || {};

          if (!status) {
            throw new Error(message || "ลบหัวข้อย่อยไม่สำเร็จ");
          }

          messageApi.success(message || "ลบหัวข้อย่อยเรียบร้อยแล้ว");
          await fetchAssessmentFormDetail();
        } catch (error) {
          setForms(previousForms);
          messageApi.error(
            error?.response?.data?.message ||
              error?.message ||
              "ลบหัวข้อย่อยไม่สำเร็จ",
          );
        }
      },
    });
  };

  const addCreatedFormToPage = (createdForm) => {
    updateForms((current) => [createdForm, ...current]);
    setSelectedFormId(createdForm.id);
    setOpenCreate(false);
    createForm.resetFields();
  };

  const handleCreateForm = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = buildCreateFormPayload(values, adminToken);

      setCreatingForm(true);
      // console.log(payload);
      // return;

      try {
        const response = await apiClient.post(
          "/api/insurances/createForm",
          payload,
        );

        const { status, result, message } = response.data || {};

        if (status) {
          console.log(result);
          messageApi.success("สร้างแบบประเมินผ่าน API เรียบร้อยแล้ว");
          setOpenCreate(false);
          createForm.resetFields();
          await fetchAssessmentForms();
        } else {
          console.error("Error: Status is not true. Received data:", message);
          messageApi.error("สร้างแบบประเมินไม่สำเร็จ");
        }
      } catch (apiError) {
        const apiMessage =
          apiError?.response?.data?.message ||
          apiError?.message ||
          "API ยังไม่พร้อม ระบบสร้างข้อมูลตัวอย่างให้ทดสอบในหน้าแล้ว";

        console.error(apiError);
        messageApi.warning(apiMessage);
      }
    } catch (error) {
      if (error?.errorFields) return;

      console.error(error);
      messageApi.error("สร้างแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setCreatingForm(false);
    }
  };

  const handleAddTopic = () => {
    const nextTopic = topicDraft.trim();
    if (!nextTopic || !selectedForm) return;

    updateForms((current) =>
      current.map((item) =>
        item.LAF_ID === selectedForm.LAF_ID
          ? {
              ...item,
              topics: [
                ...(item.topics || []),
                {
                  title: nextTopic,
                  LAC_Type: topicType,
                  type: topicType,
                  scoreMin: topicType === "rating" ? 1 : undefined,
                  scoreMax: topicType === "rating" ? 5 : undefined,
                  maxSelections: topicType === "checkbox" ? 3 : undefined,
                  questions: [],
                },
              ],
            }
          : item,
      ),
    );
    setTopicDraft("");
    setTopicType("rating");
  };

  const handleAddQuestion = (topicIndex) => {
    const questionText = questionDrafts[topicIndex]?.trim();
    if (!questionText || !selectedForm) return;

    updateForms((current) =>
      current.map((item) =>
        item.LAF_ID === selectedForm.LAF_ID
          ? {
              ...item,
              topics: item.topics.map((topic, index) =>
                index === topicIndex
                  ? {
                      ...topic,
                      questions: [
                        ...topic.questions,
                        {
                          LAQ_Text: questionText,
                          LAQ_Type: getTopicType(topic),
                        },
                      ],
                    }
                  : topic,
              ),
            }
          : item,
      ),
    );
    setQuestionDrafts((current) => ({ ...current, [topicIndex]: "" }));
  };

  const columns = [
    {
      title: "ชื่อแบบประเมิน",
      key: "name",
      render: (_, row) => (
        <button
          className={`form-row-button ${
            selectedFormId === row.LAF_ID ? "is-active" : ""
          }`}
          type="button"
          onClick={() => handleSelectForm(row.LAF_ID)}
        >
          <FileTextOutlined />
          <span>
            <Typography.Text strong>{row.LAF_Name}</Typography.Text>
            <Typography.Text type="secondary">
              {row.LAF_Description}
            </Typography.Text>
          </span>
        </button>
      ),
    },
    {
      title: "หัวข้อ",
      key: "topicCount",
      align: "center",
      render: (_, row) => (
        <Typography.Text>{row.topics?.length || 0}</Typography.Text>
      ),
    },

    {
      title: "ข้อย่อย",
      key: "questionCount",
      align: "center",
      render: (_, row) => (
        <Typography.Text>{countQuestions(row)}</Typography.Text>
      ),
    },
    {
      title: "ประเภทข้อ",
      key: "questionTypes",
      render: (_, row) => {
        const typeSummary = countQuestionsByType(row);

        return (
          <Space wrap size={[6, 6]}>
            <Tag color="blue">Radio {typeSummary.rating} ข้อ</Tag>
            <Tag color="green">Checkbox {typeSummary.checkbox} ข้อ</Tag>
            {typeSummary.textarea > 0 ? (
              <Tag color="purple">ข้อความ {typeSummary.textarea} ข้อ</Tag>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "สถานะ",
      key: "status",
      render: (_, row) => (
        <Tag
          color={
            row.LAF_Status === "1"
              ? "success"
              : row.LAF_Status === "0"
                ? "default"
                : "warning"
          }
        >
          {row.LAF_Status === "1" ? "พร้อมใช้งาน" : "ร่าง"}
        </Tag>
      ),
    },
    {
      title: "ให้เลือกใช้ตอนเปิดรอบ",
      key: "selectable",
      align: "center",
      render: (_, row) => (
        <Switch
          checked={row.LAF_Status === "1"}
          checkedChildren="เปิด"
          unCheckedChildren="ปิด"
          onChange={(checked) => handleToggleSelectable(row.LAF_ID, checked)}
        />
      ),
    },
    {
      title: "",
      key: "delete",
      align: "right",
      render: (_, row) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteForm(row.LAF_ID)}
        />
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Assessment Forms"
      title="จัดการแบบประเมิน"
      description="สร้างแบบประเมิน กำหนดหัวข้อใหญ่ หัวข้อย่อย และเปิด/ปิดฟอร์มที่จะใช้ตอนเปิดรอบประเมิน"
      action={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpenCreate(true)}
        >
          สร้างแบบประเมินใหม่
        </Button>
      }
      showBack={false}
    >
      {contextHolder}
      {modalContextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard
            label="แบบประเมินทั้งหมด"
            value={`${summary.totalForms} แบบ`}
            detail="รวมทุกสถานะ"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="เปิดให้เลือกใช้"
            value={`${summary.selectable} แบบ`}
            detail="ใช้ตอนเปิดรอบได้"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="ร่าง"
            value={`${summary.draft} แบบ`}
            detail="ยังไม่เปิดใช้งาน"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="ข้อประเมินรวม"
            value={`${summary.questionCount} ข้อ`}
            detail="ทุกแบบประเมิน"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24}>
          <Card
            className="clean-card admin-table-card"
            title="รายการแบบประเมิน"
            variant="outlined"
          >
            <Table
              columns={columns}
              dataSource={forms}
              loading={loadingForms}
              pagination={false}
              rowKey="LAF_ID"
              scroll={{ x: 920 }}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            className="clean-card assessment-builder-card"
            title={
              <Space>
                <EditOutlined />
                <span>{selectedForm?.LAF_Name || "รายละเอียดแบบประเมิน"}</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingForm}
                onClick={handleSaveForm}
              >
                บันทึกแบบประเมิน
              </Button>
            }
            variant="outlined"
          >
            {loadingFormDetail ? (
              <AssessmentDetailLoading />
            ) : selectedForm ? (
              <div className="assessment-builder">
                <div className="builder-selected-form">
                  <div>
                    <Typography.Text type="secondary">
                      รายละเอียดแบบประเมิน
                    </Typography.Text>
                    <Typography.Paragraph>
                      {selectedForm.LAF_Description}
                    </Typography.Paragraph>
                  </div>
                  <Space wrap>
                    <Tag
                      color={
                        selectedForm.LAF_Status === "1" ? "success" : "default"
                      }
                    >
                      {selectedForm.LAF_Status === "1" ? "พร้อมใช้งาน" : "ร่าง"}
                    </Tag>
                    <Tag color="blue">
                      {selectedForm.topics?.length || 0} หัวข้อใหญ่
                    </Tag>
                    <Tag color="geekblue">
                      {countQuestions(selectedForm)} ข้อย่อย
                    </Tag>
                    <Tag color="cyan">
                      Radio {countQuestionsByType(selectedForm).rating} ข้อ
                    </Tag>
                    <Tag color="green">
                      Checkbox {countQuestionsByType(selectedForm).checkbox} ข้อ
                    </Tag>
                    {countQuestionsByType(selectedForm).textarea > 0 ? (
                      <Tag color="purple">
                        ข้อความ {countQuestionsByType(selectedForm).textarea}{" "}
                        ข้อ
                      </Tag>
                    ) : null}
                  </Space>
                </div>
                <div className="builder-toolbar builder-topic-toolbar">
                  <Input
                    value={topicDraft}
                    placeholder="เพิ่มหัวข้อใหญ่ เช่น ภาวะผู้นำ"
                    onChange={(event) => setTopicDraft(event.target.value)}
                    onPressEnter={handleAddTopic}
                  />
                  <Select
                    value={topicType}
                    options={topicTypeOptions}
                    onChange={setTopicType}
                  />
                  <Button icon={<PlusOutlined />} onClick={handleAddTopic}>
                    เพิ่มหัวข้อ
                  </Button>
                </div>

                <div className="builder-topic-list">
                  {selectedForm.topics?.length ? (
                    selectedForm.topics.map((topic, topicIndex) => (
                      <Card
                        className="clean-card builder-topic-card"
                        key={`${topic.title}-${topicIndex}`}
                        title={
                          <div className="builder-topic-title">
                            <Space>
                              <span className="assessment-topic-number">
                                {topicIndex + 1}
                              </span>
                              <span>{topic.title}</span>
                              <Tag
                                color={
                                  getTopicType(topic) === "checkbox"
                                    ? "green"
                                    : "blue"
                                }
                              >
                                {getTopicTypeLabel(topic)}
                              </Tag>
                            </Space>
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              onClick={() => handleDeleteTopic(topicIndex)}
                            >
                              ลบหัวข้อ
                            </Button>
                          </div>
                        }
                        variant="outlined"
                      >
                        {getTopicType(topic) === "checkbox" ? (
                          <div className="builder-checkbox-list">
                            {topic.questions.map((question, questionIndex) => (
                              <div
                                className="builder-question-item"
                                key={`${question.LAQ_ID || getQuestionText(question)}-${questionIndex}`}
                              >
                                <Checkbox disabled />
                                <Typography.Text>
                                  {questionIndex + 1}.{" "}
                                  {getQuestionText(question)}
                                </Typography.Text>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() =>
                                    handleDeleteQuestion(
                                      topicIndex,
                                      questionIndex,
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className="builder-rating-header">
                              <Typography.Text type="secondary">
                                รายการประเมิน
                              </Typography.Text>
                              <div>
                                {ratingScores.map((score) => (
                                  <Typography.Text strong key={score}>
                                    {score}
                                  </Typography.Text>
                                ))}
                              </div>
                            </div>
                            <div className="builder-question-list">
                              {topic.questions.map(
                                (question, questionIndex) => (
                                  <div
                                    className="builder-rating-item"
                                    key={`${question.LAQ_ID || getQuestionText(question)}-${questionIndex}`}
                                  >
                                    <div className="builder-question-copy">
                                      <UnorderedListOutlined />
                                      <Typography.Text>
                                        {topicIndex + 1}.{questionIndex + 1}{" "}
                                        {getQuestionText(question)}
                                      </Typography.Text>
                                    </div>
                                    <Radio.Group
                                      disabled
                                      options={ratingScores.map((score) => ({
                                        label: String(score),
                                        value: score,
                                      }))}
                                      optionType="button"
                                    />
                                    <Button
                                      danger
                                      icon={<DeleteOutlined />}
                                      size="small"
                                      type="text"
                                      onClick={() =>
                                        handleDeleteQuestion(
                                          topicIndex,
                                          questionIndex,
                                        )
                                      }
                                    />
                                  </div>
                                ),
                              )}
                            </div>
                          </>
                        )}
                        <div className="builder-add-question">
                          <Input
                            value={questionDrafts[topicIndex] || ""}
                            placeholder={
                              getTopicType(topic) === "checkbox"
                                ? "เพิ่มตัวเลือก checkbox"
                                : "เพิ่มหัวข้อย่อย/ข้อคำถาม"
                            }
                            onChange={(event) =>
                              setQuestionDrafts((current) => ({
                                ...current,
                                [topicIndex]: event.target.value,
                              }))
                            }
                            onPressEnter={() => handleAddQuestion(topicIndex)}
                          />
                          <Button onClick={() => handleAddQuestion(topicIndex)}>
                            เพิ่มข้อย่อย
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="builder-empty">
                      <FileTextOutlined />
                      <Typography.Text type="secondary">
                        ยังไม่มีหัวข้อใหญ่
                        เริ่มจากเพิ่มหัวข้อแรกของแบบประเมินนี้
                      </Typography.Text>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>

      <Modal
        title="สร้างแบบประเมินใหม่"
        open={openCreate}
        onCancel={() => setOpenCreate(false)}
        onOk={handleCreateForm}
        confirmLoading={creatingForm}
        okText="สร้างแบบประเมิน"
        cancelText="ยกเลิก"
        centered
      >
        <Form
          form={createForm}
          layout="vertical"
          className="round-create-form"
        >
          <Form.Item
            label="ประเภทการประเมิน"

            name="assessmentType"
            rules={[{ required: true, message: "กรุณาเลือกประเภทการประเมิน" }]}
          >
            <Select
              loading={loadingAssessmentTypes}
              notFoundContent={
                loadingAssessmentTypes
                  ? "กำลังโหลดประเภทการประเมิน..."
                  : "ไม่พบประเภทการประเมิน"
              }
              options={assessmentTypeOptions}
              placeholder="เลือกประเภทการประเมิน"
            />
          </Form.Item>
          <Form.Item
            label="ชื่อแบบประเมิน"
            name="name"
            rules={[{ required: true, message: "กรุณากรอกชื่อแบบประเมิน" }]}
          >
            <Input placeholder="เช่น แบบประเมินหัวหน้าสาขา" />
          </Form.Item>
          <Form.Item label="รายละเอียด" name="description">
            <Input.TextArea
              rows={3}
              placeholder="อธิบายวัตถุประสงค์ของแบบประเมิน"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PagePanel>
  );
}
