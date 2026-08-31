import {
  CalendarOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import thTH from "antd/es/date-picker/locale/th_TH";
import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import "dayjs/locale/th";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { buildAdminTokenPayload } from "../../utils/tokenUtils";
import { supervisorRows } from "./adminAssessmentData";

dayjs.extend(buddhistEra);
dayjs.locale("th");

const THAI_DATE_FORMAT = "DD MMM BBBB";

const formatDateThai = (date) => {
  if (!date) return "-";

  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const [year, month, day] = date.split("-");

  return `${parseInt(day)} ${thaiMonths[parseInt(month) - 1]} ${parseInt(year) + 543}`;
};
function getFormName(formId, forms) {
  const form = forms.find(
    (item) => String(item.LAF_ID || item.id) === String(formId),
  );

  return form?.LAF_Name || form?.name || "-";
}

const assessmentTypeFallbackLabels = {
  1: "ประเมินผู้บังคับบัญชา",
  2: "ประเมินการอยู่ร่วมกัน",
  3: "ประเมินพนักงานประจำปี",
  4: "Successor Assessment",
  supervisor: "ประเมินผู้บังคับบัญชา",
  collaboration: "ประเมินการอยู่ร่วมกัน",
  annual_employee: "ประเมินพนักงานประจำปี",
};

function normalizeAssessmentType(value) {
  const type = String(value || "");

  if (type === "1") return "supervisor";
  if (type === "2") return "collaboration";
  if (type === "3") return "annual_employee";

  return type;
}

function getAssessmentTypeLabel(type, options = []) {
  const value = String(type || "");
  const option = options.find((item) => item.value === value);

  return option?.label || assessmentTypeFallbackLabels[value] || "-";
}

function getFormAssessmentType(form) {
  return normalizeAssessmentType(
    form.LAF_assessmentType || form.assessmentType || "supervisor",
  );
}

function getAssessmentTypeOptionValue(type, options = []) {
  const value = String(type || "");

  if (options.some((item) => item.value === value)) return value;

  const normalizedValue = normalizeAssessmentType(value);
  const option = options.find(
    (item) => normalizeAssessmentType(item.value) === normalizedValue,
  );

  return option?.value || value;
}

function getNumberOptionValue(value) {
  const numericValue = Number(value);

  return Number.isNaN(numericValue) ? value : numericValue;
}

function getRawSelectValue(value) {
  return value && typeof value === "object" && "value" in value
    ? value.value
    : value;
}

function formatDateForApi(value) {
  if (!value) return "";
  if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");

  return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "";
}

function getDatePickerValue(value) {
  if (!value) return null;

  const dateValue = dayjs(value);

  return dateValue.isValid() ? dateValue : null;
}

function getRoundDetailCode(row = {}) {
  return row.code || row.EVC_Code || row.id || row.EVC_ID || row.LAR_ID || row.round_id || "";
}

function getRoundId(row = {}) {
  return row.EVC_ID || row.id || row.LAR_ID || row.round_id || "";
}

function getRoundCode(row = {}) {
  return row.EVC_Code || row.code || row.EVC_ID || row.id || row.LAR_ID || row.round_id || "";
}

function getFormOptionValue(formId, forms = []) {
  const form = forms.find((item) => String(item.LAF_ID) === String(formId));

  return form
    ? getNumberOptionValue(form.LAF_ID)
    : getNumberOptionValue(formId);
}

function getEditFormLabel(form, editingRound) {
  if (
    String(form.LAF_ID) === String(editingRound?.formId) &&
    editingRound?.formName
  ) {
    return editingRound.formName;
  }

  return form.LAF_Name || String(form.LAF_ID || "");
}

function getRoundSummary(roundId) {
  const rows = supervisorRows.filter((item) => item.roundId === roundId);
  const totalEvaluators = rows.reduce(
    (sum, item) => sum + item.totalEvaluators,
    0,
  );
  const submitted = rows.reduce((sum, item) => sum + item.submitted, 0);

  return {
    supervisors: rows.length,
    totalEvaluators,
    submitted,
  };
}

// function countFormQuestions(form) {
//   if (form.questionCount || form.question_count) {
//     return Number(form.questionCount || form.question_count);
//   }

//   return (
//     form.topics?.reduce(
//       (sum, topic) => sum + (topic.questions?.length || 0),
//       0,
//     ) || 0
//   );
// }

function getRoundOrderValue(round) {
  if (round.activatedAt) return new Date(round.activatedAt).getTime();
  if (round.createdAt) return new Date(round.createdAt).getTime();

  const year = Number(round.year || round.label?.match(/\d{4}/)?.[0] || 0);
  const month = Number(round.label?.match(/เดือน\s*(\d+)/)?.[1] || 12);

  return year * 100 + month;
}

function getRoundStatusFromApi(status) {
  if (String(status) === "1" || status === true || status === "open") {
    return {
      status: "open",
      statusText: "เปิดใช้งาน",
      statusColor: "processing",
    };
  }

  if (String(status) === "0" || status === "closed") {
    return { status: "closed", statusText: "ปิดรอบ", statusColor: "default" };
  }

  return { status: "draft", statusText: "ร่าง", statusColor: "default" };
}

function getRoundStatus(checked) {
  return checked
    ? { status: "open", statusText: "เปิดใช้งาน", statusColor: "processing" }
    : { status: "closed", statusText: "ปิดรอบ", statusColor: "default" };
}

function buildCreateRoundPayload(
  values,
  adminToken,
  assessmentTypeOptions,
  forms,
) {
  const selectedAssessmentType = assessmentTypeOptions.find(
    (item) => String(item.value) === String(values.assessmentType),
  );
  const selectedForm = forms.find(
    (item) => String(item.LAF_ID) === String(getRawSelectValue(values.formId)),
  );

  return {
    EVC_Period: values.label?.trim(),
    EVC_detail: values.detail?.trim(),
    EVC_Year: convertBuddhistYearToAD(values.year),
    EVT_ID: values.assessmentType,
    EVT_Name: selectedAssessmentType?.label || "",
    LAF_ID: getRawSelectValue(values.formId),
    LAF_Name: selectedForm?.LAF_Name || "",
    EVC_StartDate: formatDateForApi(values.startDate),
    EVC_EndDate: formatDateForApi(values.endDate),
    EVC_IdPerCreatedBy: adminToken.PerD,
  };
}

function buildUpdateRoundPayload(
  values,
  editingRound,
  adminToken,
  assessmentTypeOptions,
  forms,
) {
  const selectedAssessmentType = assessmentTypeOptions.find(
    (item) => String(item.value) === String(values.assessmentType),
  );
  const selectedForm = forms.find(
    (item) => String(item.LAF_ID) === String(getRawSelectValue(values.formId)),
  );

  return {
    EVC_ID: getRoundId(editingRound),
    EVC_Code: getRoundCode(editingRound),
    EVC_Period: values.label?.trim(),
    EVC_detail: values.detail?.trim(),
    EVC_Year: convertBuddhistYearToAD(values.year),
    EVT_ID: values.assessmentType,
    EVT_Name: selectedAssessmentType?.label || "",
    LAF_ID: getRawSelectValue(values.formId),
    LAF_Name: selectedForm?.LAF_Name || "",
    EVC_StartDate: formatDateForApi(values.startDate),
    EVC_EndDate: formatDateForApi(values.endDate),
    EVC_IdPerUpdatedBy: adminToken.PerD,
  };
}

function getDisplayMessage(value, fallback) {
  if (typeof value === "string") return value;
  if (value?.message && typeof value.message === "string") return value.message;

  return fallback;
}

function getErrorMessage(error, fallback) {
  return getDisplayMessage(
    error?.response?.data?.message || error?.message,
    fallback,
  );
}

function getCurrentBuddhistYear() {
  return String(new Date().getFullYear() + 543);
}

function convertBuddhistYearToAD(year) {
  const numericYear = Number(String(year || "").replace(/\D/g, ""));

  if (!numericYear) return "";
  if (numericYear > 2400) return String(numericYear - 543);

  return String(numericYear);
}

function convertADYearToBuddhist(year) {
  const numericYear = Number(String(year || "").replace(/\D/g, ""));

  if (!numericYear) return "";
  if (numericYear < 2400) return String(numericYear + 543);

  return String(numericYear);
}

function getApiAssessmentTypeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result?.data)) return data.result.data;

  return [];
}

function mapApiAssessmentType(item = {}) {
  return {
    label:
      item.EVT_Name ||
      item.assessment_type_name ||
      item.assessmentTypeName ||
      item.name ||
      item.label ||
      "-",
    value: String(
      item.EVT_ID ||
        item.assessment_type_id ||
        item.assessmentTypeId ||
        item.id ||
        item.EVC_Code ||
        item.value ||
        "",
    ),
  };
}

function formatRoundLabel(value, year) {
  const roundNumber = String(value || "")
    .split("/")[0]
    .replace(/\D/g, "");
  const assessmentYear = String(year || "").replace(/\D/g, "");

  if (!roundNumber) return "";
  if (!assessmentYear) return roundNumber;

  return `${roundNumber}/${assessmentYear}`;
}

function mapCreatedRoundFromApi(result = {}, values = {}) {
  const round = Array.isArray(result) ? result[0] || {} : result;

  return {
    id: round.EVC_ID || round.LAR_ID || round.round_id || values.id,
    EVC_ID: round.EVC_ID || values.EVC_ID || values.id || "",
    code: getRoundCode(round) || getRoundCode(values),
    EVC_Code: getRoundCode(round) || getRoundCode(values),
    label:
      round.EVC_Period || round.LAR_Name || round.round_name || values.label,
    detail:
      round.EVC_detail ||
      round.LAR_Description ||
      round.round_detail ||
      values.detail ||
      "รอบประเมินที่สร้างใหม่",
    year: round.EVC_Year || round.LAR_Year || round.round_year || values.year,
    startDate:
      round.EVC_StartDate ||
      round.LAR_StartDate ||
      round.start_date ||
      values.startDate,
    endDate:
      round.EVC_EndDate ||
      round.LAR_EndDate ||
      round.end_date ||
      values.endDate,
    ...getRoundStatusFromApi(round.EVC_Status ?? round.LAR_Status),
    assessmentType:
      round.EVT_ID ||
      round.EVC_Code ||
      round.LAR_AssessmentType ||
      round.assessment_type ||
      values.assessmentType ||
      "supervisor",
    assessmentTypeName: round.EVT_Name || "",

    formId: round.LAF_ID || round.form_id || values.formId,
    formName: round.LAF_Name || "",
    createdAt:
      round.EVC_CreatedAt ||
      round.LAR_CreatedAt ||
      round.created_at ||
      new Date().toISOString(),
    snapshotSupervisorCount: Number(round.target_count || 0),
  };
}

function getApiRoundList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result?.data)) return data.result.data;

  return [];
}

export default function AdminAssessmentRoundsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [openCreate, setOpenCreate] = useState(false);
  const [creatingRound, setCreatingRound] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [assessmentTypeOptions, setAssessmentTypeOptions] = useState([]);
  const [loadingAssessmentTypes, setLoadingAssessmentTypes] = useState(false);
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [updatingRoundId, setUpdatingRoundId] = useState(null);
  const [loadingEditRoundId, setLoadingEditRoundId] = useState(null);
  const [savingEditRound, setSavingEditRound] = useState(false);
  const adminToken = useMemo(
    () => buildAdminTokenPayload(getInitialUserDetail() || {}),
    [],
  );
  const selectableForms = forms.filter(
    (item) => String(item.LAF_Status) === "1",
  );
  const watchedAssessmentType = Form.useWatch("assessmentType", form);
  const watchedEditAssessmentType = Form.useWatch("assessmentType", editForm);
  const watchedStartDate = Form.useWatch("startDate", form);
  const watchedEditStartDate = Form.useWatch("startDate", editForm);
  const selectedAssessmentType = watchedAssessmentType
    ? normalizeAssessmentType(watchedAssessmentType)
    : "";
  const selectedEditAssessmentType = normalizeAssessmentType(
    watchedEditAssessmentType || editingRound?.assessmentType || "supervisor",
  );
  const selectableFormsByType = selectableForms.filter(
    (item) => getFormAssessmentType(item) === selectedAssessmentType,
  );
  const editableFormsByType = selectableForms.filter(
    (item) => getFormAssessmentType(item) === selectedEditAssessmentType,
  );
  const editFormOptions = useMemo(() => {
    const currentApiForm = forms.find(
      (item) => String(item.LAF_ID) === String(editingRound?.formId),
    );
    const currentForm = editingRound?.formId
      ? {
          ...(currentApiForm || {}),
          LAF_ID: editingRound.formId,
          LAF_Name:
            editingRound.formName ||
            currentApiForm?.LAF_Name ||
            String(editingRound.formId),
          LAF_Status: currentApiForm?.LAF_Status || "1",
          LAF_assessmentType:
            currentApiForm?.LAF_assessmentType || editingRound.assessmentType,
        }
      : null;
    const baseForms = editableFormsByType.length ? editableFormsByType : forms;

    if (!currentForm) return baseForms;

    return [
      currentForm,
      ...baseForms.filter(
        (item) => String(item.LAF_ID) !== String(currentForm.LAF_ID),
      ),
    ];
  }, [
    editableFormsByType,
    editingRound?.assessmentType,
    editingRound?.formId,
    editingRound?.formName,
    forms,
  ]);
  const sortedRounds = useMemo(
    () =>
      [...rounds].sort((left, right) => {
        const statusWeight =
          Number(right.status === "open") - Number(left.status === "open");
        if (statusWeight !== 0) return statusWeight;

        return getRoundOrderValue(right) - getRoundOrderValue(left);
      }),
    [rounds],
  );
  const latestRoundId = sortedRounds[0]?.id;

  const fetchAssessmentTypes = useCallback(async () => {
    setLoadingAssessmentTypes(true);

    try {
      const response = await apiClient.get("/api/insurances/getAssessmentType");
      const typeList = getApiAssessmentTypeList(response.data);
      const options = typeList
        .map(mapApiAssessmentType)
        .filter((item) => item.value);

      setAssessmentTypeOptions(options);
    } catch (error) {
      console.error(error);
      setAssessmentTypeOptions([]);
      messageApi.error("โหลดประเภทการประเมินไม่สำเร็จ");
    } finally {
      setLoadingAssessmentTypes(false);
    }
  }, [messageApi]);

  const fetchAssessmentForms = useCallback(async () => {
    setLoadingForms(true);

    try {
      const response = await apiClient.get("/api/insurances/getFormSub");
      const { result = [] } = response.data || {};
      const apiForms = Array.isArray(result) ? result : [];
      // console.log(result)
      setForms(apiForms);
    } catch (error) {
      console.error(error);
      setForms([]);
      messageApi.error("โหลดแบบฟอร์มประเมินไม่สำเร็จ");
    } finally {
      setLoadingForms(false);
    }
  }, [messageApi]);

  const fetchAssessmentRounds = useCallback(async () => {
    setLoadingRounds(true);

    try {
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRound",
      );
      const roundList = getApiRoundList(response.data);
      const apiRounds = roundList.map((item) => mapCreatedRoundFromApi(item));

      setRounds(apiRounds);
    } catch (error) {
      console.error(error);
      setRounds([]);
      messageApi.error("โหลดรายการรอบประเมินไม่สำเร็จ");
    } finally {
      setLoadingRounds(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchAssessmentTypes();
    fetchAssessmentForms();
    fetchAssessmentRounds();
  }, [fetchAssessmentForms, fetchAssessmentRounds, fetchAssessmentTypes]);

  const summary = useMemo(() => {
    const openRounds = rounds.filter((item) => item.status === "open").length;
    const draftRounds = rounds.filter((item) => item.status === "draft").length;

    return {
      totalRounds: rounds.length,
      openRounds,
      draftRounds,
      availableForms: selectableForms.length,
    };
  }, [rounds, selectableForms.length]);

  const updateRounds = (updater) => {
    setRounds((current) => updater(current));
  };

  const handleCreateRound = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildCreateRoundPayload(
        values,
        adminToken,
        assessmentTypeOptions,
        forms,
      );

      // console.log(payload);
      // return;
      setCreatingRound(true);

      const response = await apiClient.post(
        "/api/insurances/createAssessmentRound",
        payload,
      );

      const { status, result, message } = response.data || {};

      // if(status){
      //   console.log(result);
      //   return
      // }

      if (String(status) !== "200" && status !== true) {
        throw new Error(getDisplayMessage(message, "สร้างรอบประเมินไม่สำเร็จ"));
      }

      await fetchAssessmentRounds();
      setOpenCreate(false);
      form.resetFields();
      messageApi.success(
        getDisplayMessage(message, "สร้างรอบประเมินเรียบร้อยแล้ว"),
      );
    } catch (error) {
      if (error?.errorFields) return;

      console.error(error);
      messageApi.error(getErrorMessage(error, "สร้างรอบประเมินไม่สำเร็จ"));
    } finally {
      setCreatingRound(false);
    }
  };

  const handleCreateRoundLabelChange = (event) => {
    const year = form.getFieldValue("year");
    const label = formatRoundLabel(event.target.value, year);

    form.setFieldsValue({ label });
  };

  const handleCreateRoundYearChange = (event) => {
    const year = event.target.value;
    const label = form.getFieldValue("label");

    form.setFieldsValue({
      year,
      label: formatRoundLabel(label, year),
    });
  };

  const handleToggleRound = async (roundId, checked) => {
    const nextStatus = checked ? "1" : "0";
    const targetRound = rounds.find((item) => item.id === roundId);

    updateRounds((current) =>
      current.map((round) =>
        round.id === roundId
          ? {
              ...round,
              ...getRoundStatus(checked),
              activatedAt: checked
                ? new Date().toISOString()
                : round.activatedAt,
            }
          : round,
      ),
    );

    setUpdatingRoundId(roundId);

    try {
      const payload = {
        EVC_ID: roundId,
        EVC_Status: nextStatus,
        EVC_IdPerUpdatedBy: adminToken.PerD,
      };

      // console.log(payload);
      const response = await apiClient.post(
        "/api/insurances/updateAssessmentRoundStatus",
        payload,
      );
      const { status, message } = response.data || {};

      if (String(status) !== "200" && status !== true) {
        throw new Error(
          getDisplayMessage(message, "อัปเดตสถานะรอบประเมินไม่สำเร็จ"),
        );
      }

      messageApi.success(
        getDisplayMessage(message, "อัปเดตสถานะรอบประเมินเรียบร้อยแล้ว"),
      );
      await fetchAssessmentRounds();
    } catch (error) {
      if (targetRound) {
        updateRounds((current) =>
          current.map((round) => (round.id === roundId ? targetRound : round)),
        );
      } else {
        await fetchAssessmentRounds();
      }

      console.error(error);
      messageApi.error(
        getErrorMessage(error, "อัปเดตสถานะรอบประเมินไม่สำเร็จ"),
      );
    } finally {
      setUpdatingRoundId(null);
    }
  };

  const setEditRoundFormValues = (round) => {
    editForm.setFieldsValue({
      label: round.label,
      year: convertADYearToBuddhist(round.year),
      detail: round.detail,
      assessmentType: getAssessmentTypeOptionValue(
        round.assessmentType,
        assessmentTypeOptions,
      ),
      formId: getFormOptionValue(round.formId, forms),
      startDate: getDatePickerValue(round.startDate),
      endDate: getDatePickerValue(round.endDate),
    });
  };

  const handleOpenEdit = async (round) => {
    setLoadingEditRoundId(round.id);
    // console.log(round);
    // return;
    try {
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundDetail",
        {
          params: {
            EVC_ID: getRoundId(round),
          },
        },
      );

      const roundList = getApiRoundList(response.data.result);
      const apiRound = roundList[0] || response.data?.result || round;
      const editRound = mapCreatedRoundFromApi(apiRound, round);

      setEditingRound(editRound);
      setEditRoundFormValues(editRound);
    } catch (error) {
      console.error(error);
      setEditingRound(round);
      setEditRoundFormValues(round);
      messageApi.warning(
        "ดึงข้อมูลแก้ไขจาก API ไม่สำเร็จ ระบบแสดงข้อมูลจากตารางแทน",
      );
    } finally {
      setLoadingEditRoundId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRound) return;

    try {
      const values = await editForm.validateFields();
      const payload = buildUpdateRoundPayload(
        values,
        editingRound,
        adminToken,
        assessmentTypeOptions,
        forms,
      );


        // console.log(payload);
        // return;

      setSavingEditRound(true);

      const response = await apiClient.post(
        "/api/insurances/updateAssessmentRound",
        payload,
      );
      const { status, message, result } = response.data || {};

      // if (status) {
      //   console.log(result);
      // }

      if (String(status) !== "200" && status !== true) {
        throw new Error(getDisplayMessage(message, "แก้ไขรอบประเมินไม่สำเร็จ"));
      }

      await fetchAssessmentRounds();
      setEditingRound(null);
      editForm.resetFields();
      messageApi.success(
        getDisplayMessage(message, "แก้ไขรอบประเมินเรียบร้อยแล้ว"),
      );
    } catch (error) {
      if (error?.errorFields) return;

      console.error(error);
      messageApi.error(getErrorMessage(error, "แก้ไขรอบประเมินไม่สำเร็จ"));
    } finally {
      setSavingEditRound(false);
    }
  };

  const handleOpenRoundDetail = (row) => {
    const roundCode = getRoundDetailCode(row);

    if (!roundCode) {
      messageApi.warning("ไม่พบรหัสรอบประเมิน");
      return;
    }

    navigate(`/Admin_Assessment_Rounds/${roundCode}`);
  };

  const columns = [
    {
      title: "รอบประเมิน",
      key: "round",
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
      title: "แบบประเมินที่ใช้",
      key: "form",
      width: 230,
      render: (_, row) => (
        <Space orientation="vertical" size={2}>
          <Tag color="blue">
            {row.assessmentTypeName ||
              getAssessmentTypeLabel(row.assessmentType, assessmentTypeOptions)}
          </Tag>
          <Space size={8}>
            <FileTextOutlined className="round-table-icon" />
            <Typography.Text>
              {row.formName || getFormName(row.formId, forms)}
            </Typography.Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "ช่วงเวลา",
      key: "period",
      width: 200,
      render: (_, row) => (
        <Typography.Text>
          {formatDateThai(row.startDate)} - {formatDateThai(row.endDate)}
        </Typography.Text>
      ),
    },
    {
      title: "หัวหน้า",
      key: "supervisors",
      align: "center",
      render: (_, row) => {
        const roundSummary = getRoundSummary(row.id);
        const supervisorCount =
          roundSummary.supervisors ||
          row.snapshotTargets?.length ||
          row.snapshotSupervisorCount ||
          0;

        return <Typography.Text>{supervisorCount} คน</Typography.Text>;
      },
    },
    {
      title: "ส่งแล้ว",
      key: "submitted",
      align: "center",
      width: 100,
      render: (_, row) => {
        const roundSummary = getRoundSummary(row.id);

        return (
          <Typography.Text>
            {roundSummary.submitted}/{roundSummary.totalEvaluators || 0}
          </Typography.Text>
        );
      },
    },
    {
      title: "สถานะ",
      key: "status",
      width: 150,
      render: (_, row) => (
        <Space wrap>
          <Tag color={row.statusColor}>{row.statusText}</Tag>
          {row.id === latestRoundId ? <Tag color="blue">ล่าสุด</Tag> : null}
        </Space>
      ),
    },
    {
      title: "เปิดใช้งาน",
      key: "toggleStatus",
      align: "center",
      width: 140,
      render: (_, row) => (
        <Switch
          checked={row.status === "open"}
          checkedChildren="เปิด"
          loading={updatingRoundId === row.id}
          unCheckedChildren="ปิด"
          onChange={(checked) => handleToggleRound(row.id, checked)}
        />
      ),
    },
    {
      title: "การจัดการ",
      key: "action",
      align: "center",
      width: 140,
      render: (_, row) => (
        <Space wrap>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleOpenRoundDetail(row)}
          >
            ดูรายละเอียด
          </Button>
          <Button
            // disabled={row.id !== latestRoundId}
            icon={<EditOutlined />}
            loading={loadingEditRoundId === row.id}
            onClick={() => handleOpenEdit(row)}
          >
            แก้ไข
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Assessment Rounds"
      title="จัดการรอบประเมิน"
      description="เปิดรอบประเมินใหม่ เลือกแบบฟอร์มที่จะใช้ และตรวจสอบหัวหน้าที่ถูกดึงเข้ารอบประเมิน"
      action={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpenCreate(true)}
        >
          เปิดรอบประเมินใหม่
        </Button>
      }
      showBack={false}
    >
      {contextHolder}
      {/* <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard label="รอบทั้งหมด" value={`${summary.totalRounds} รอบ`} detail="รวมทุกสถานะ" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="เปิดใช้งาน" value={`${summary.openRounds} รอบ`} detail="พนักงานเข้าไปประเมินได้" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="ร่าง" value={`${summary.draftRounds} รอบ`} detail="รอตรวจสอบก่อนเปิดใช้" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="แบบฟอร์มพร้อมใช้" value={`${summary.availableForms} แบบ`} detail="เลือกใช้ตอนเปิดรอบ" />
        </Col>
      </Row> */}

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24}>
          <Card
            className="clean-card admin-table-card"
            title="รายการรอบประเมิน"
            variant="outlined"
          >
            <Table
              columns={columns}
              dataSource={sortedRounds}
              loading={loadingRounds}
              pagination={false}
              rowKey={(row) => getRoundDetailCode(row)}
              scroll={{ x: 1120 }}
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            className="clean-card round-guide-card"
            title="ขั้นตอนเปิดรอบ"
            variant="outlined"
          >
            <div className="round-guide-list">
              <div>
                <CalendarOutlined className="admin-detail-icon" />
                <Typography.Text strong>สร้างรอบประเมิน</Typography.Text>
                <Typography.Text type="secondary">
                  กำหนดปี ชื่อรอบ และช่วงวันที่
                </Typography.Text>
              </div>
              <div>
                <FileTextOutlined className="admin-detail-icon" />
                <Typography.Text strong>เลือกแบบประเมิน</Typography.Text>
                <Typography.Text type="secondary">
                  ระบบผูกฟอร์มกับรอบนั้นทันที
                </Typography.Text>
              </div>
              <div>
                <TeamOutlined className="admin-detail-icon" />
                <Typography.Text strong>ดึงรายชื่อหัวหน้า</Typography.Text>
                <Typography.Text type="secondary">
                  snapshot หัวหน้าที่เข้าเกณฑ์ไว้ในรอบ
                </Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="เปิดรอบประเมินใหม่"
        open={openCreate}
        onCancel={() => setOpenCreate(false)}
        onOk={handleCreateRound}
        confirmLoading={creatingRound}
        okText="สร้างรอบ"
        cancelText="ยกเลิก"
        width={720}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          className="round-create-form"
          initialValues={{
            year: getCurrentBuddhistYear(),
          }}
        >
          <Row gutter={[14, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="ปีประเมิน"
                name="year"
                rules={[{ required: true, message: "กรุณากรอกปีประเมิน" }]}
              >
                <Input
                  inputMode="numeric"
                  placeholder="พิมพ์ปี พ.ศ.เช่น 2569"
                  onChange={handleCreateRoundYearChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="รอบประเมิน"
                name="label"
                rules={[{ required: true, message: "กรุณากรอกชื่อรอบประเมิน" }]}
              >
                <Input
                  inputMode="numeric"
                  placeholder={`เช่น 1/${getCurrentBuddhistYear()}`}
                  onChange={handleCreateRoundLabelChange}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="รายละเอียดรอบ ( ถ้ามี )" name="detail">
                <Input placeholder="เช่น รอบปลายปี 2569" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="ประเภทการประเมิน"
                name="assessmentType"
                rules={[
                  { required: true, message: "กรุณาเลือกประเภทการประเมิน" },
                ]}
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
                  onChange={(value) => {
                    const selectedType = normalizeAssessmentType(value);
                    const firstForm = selectableForms.find(
                      (item) => getFormAssessmentType(item) === selectedType,
                    );

                    form.setFieldsValue({
                      formId: firstForm
                        ? getNumberOptionValue(firstForm.LAF_ID)
                        : undefined,
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="แบบฟอร์มประเมินที่ใช้ในรอบนี้"
                name="formId"
                rules={[{ required: true, message: "กรุณาเลือกแบบประเมิน" }]}
              >
                <Select
                  loading={loadingForms}
                  notFoundContent={
                    loadingForms
                      ? "กำลังโหลดแบบฟอร์มประเมิน..."
                      : "ไม่พบแบบฟอร์มประเมิน"
                  }
                  placeholder="เลือกแบบประเมินตามประเภทที่เลือก"
                  options={forms.map((item) => ({
                    label: `${item.LAF_Name}`,
                    value: getNumberOptionValue(item.LAF_ID),
                  }))}
                />
              </Form.Item>
              {!selectableFormsByType.length ? (
                <Typography.Text type="secondary">
                  ประเภทนี้ยังไม่มีแบบประเมินพร้อมใช้
                  ตอนนี้เปิดใช้งานหลักคือประเมินผู้บังคับบัญชา
                </Typography.Text>
              ) : null}
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันที่เริ่ม"
                name="startDate"
                rules={[{ required: true, message: "กรุณาระบุวันที่เริ่ม" }]}
              >
                <DatePicker
                  format={THAI_DATE_FORMAT}
                  locale={thTH}
                  placeholder="เลือกวันที่เริ่ม"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันที่สิ้นสุด"
                name="endDate"
                rules={[{ required: true, message: "กรุณาระบุวันที่สิ้นสุด" }]}
              >
                <DatePicker
                  defaultPickerValue={watchedStartDate || undefined}
                  format={THAI_DATE_FORMAT}
                  locale={thTH}
                  placeholder="เลือกวันที่สิ้นสุด"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      <Modal
        title="แก้ไขรอบประเมินล่าสุด"
        open={Boolean(editingRound)}
        onCancel={() => setEditingRound(null)}
        onOk={handleSaveEdit}
        confirmLoading={savingEditRound}
        okText="บันทึกการแก้ไข"
        cancelText="ยกเลิก"
        width={720}
        centered
      >
        <Form form={editForm} layout="vertical" className="round-create-form">
          <Row gutter={[14, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="ชื่อรอบประเมิน"
                name="label"
                rules={[{ required: true, message: "กรุณากรอกชื่อรอบประเมิน" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="ปีประเมิน"
                name="year"
                rules={[{ required: true, message: "กรุณากรอกปีประเมิน" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="รายละเอียดรอบ" name="detail">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="ประเภทการประเมิน"
                name="assessmentType"
                rules={[
                  { required: true, message: "กรุณาเลือกประเภทการประเมิน" },
                ]}
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
                  onChange={(value) => {
                    const selectedType = normalizeAssessmentType(value);
                    const firstForm = selectableForms.find(
                      (item) => getFormAssessmentType(item) === selectedType,
                    );

                    editForm.setFieldsValue({
                      formId: firstForm
                        ? getNumberOptionValue(firstForm.LAF_ID)
                        : undefined,
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="แบบฟอร์มประเมินที่ใช้ในรอบนี้"
                name="formId"
                rules={[{ required: true, message: "กรุณาเลือกแบบประเมิน" }]}
              >
                <Select
                  loading={loadingForms}
                  notFoundContent={
                    loadingForms
                      ? "กำลังโหลดแบบฟอร์มประเมิน..."
                      : "ไม่พบแบบฟอร์มประเมิน"
                  }
                  placeholder="เลือกแบบประเมินตามประเภทที่เลือก"
                  options={editFormOptions.map((item) => ({
                    label: getEditFormLabel(item, editingRound),
                    value: getNumberOptionValue(item.LAF_ID),
                  }))}
                />
              </Form.Item>
              {!editFormOptions.length ? (
                <Typography.Text type="secondary">
                  ประเภทนี้ยังไม่มีแบบประเมินพร้อมใช้
                  ตอนนี้เปิดใช้งานหลักคือประเมินผู้บังคับบัญชา
                </Typography.Text>
              ) : null}
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันที่เริ่ม"
                name="startDate"
                rules={[{ required: true, message: "กรุณาระบุวันที่เริ่ม" }]}
              >
                <DatePicker
                  format={THAI_DATE_FORMAT}
                  locale={thTH}
                  placeholder="เลือกวันที่เริ่ม"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="วันที่สิ้นสุด"
                name="endDate"
                rules={[{ required: true, message: "กรุณาระบุวันที่สิ้นสุด" }]}
              >
                <DatePicker
                  defaultPickerValue={watchedEditStartDate || undefined}
                  format={THAI_DATE_FORMAT}
                  locale={thTH}
                  placeholder="เลือกวันที่สิ้นสุด"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PagePanel>
  );
}
