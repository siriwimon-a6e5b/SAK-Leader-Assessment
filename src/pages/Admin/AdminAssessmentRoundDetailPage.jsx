import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient from "../../recoilstore/userStores";

const SUPERVISOR_PAGE_SIZE = 50;
const initialSupervisorFilters = {
  employeeCode: "",
  employeeName: "",
  workplaceCode: "",
  workplaceName: "",
};

function getCleanSupervisorFilters(filters = {}) {
  return {
    employeeCode: String(filters.employeeCode || "").trim(),
    employeeName: String(filters.employeeName || "").trim(),
    workplaceCode: String(filters.workplaceCode || "").trim(),
    workplaceName: String(filters.workplaceName || "").trim(),
  };
}

function formatDateThai(date) {
  if (!date) return "-";

  const dateValue = new Date(date);
  if (Number.isNaN(dateValue.getTime())) return "-";

  return dateValue.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPercent(value, total) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

function getApiRoundData(data) {
  const result = data?.result ?? data;

  if (result?.round) return result.round;
  if (result?.detail) return result.detail;
  if (result?.cycle) return result.cycle;
  if (Array.isArray(result)) return result[0] || null;
  if (Array.isArray(result?.data)) return result.data[0] || null;

  return result || null;
}

function getApiPermissionRows(data) {
  const result = data?.result ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.permissions)) return result.permissions;
  if (Array.isArray(result?.targets)) return result.targets;
  if (Array.isArray(result?.supervisors)) return result.supervisors;
  if (Array.isArray(result?.evaluators)) return result.evaluators;
  if (Array.isArray(result?.data)) return result.data;

  return [];
}

function getApiPermissionTotal(data, rows = []) {
  const result = data?.result ?? data;
  const total =
    result?.total ||
    result?.totalRows ||
    result?.total_count ||
    result?.totalCount ||
    result?.recordsTotal ||
    data?.total ||
    data?.totalRows ||
    data?.total_count ||
    data?.totalCount ||
    data?.recordsTotal;

  return Number(total || rows.length || 0);
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

function mapApiRoundDetail(row = {}, roundId) {
  return {
    EVC_ID: row.EVC_ID || roundId,
    EVC_Code: row.EVC_Code || roundId,
    EVC_Period: row.EVC_Period || "-",
    EVC_detail: row.EVC_detail || "",
    EVC_Year: row.EVC_Year || "",
    EVC_StartDate: row.EVC_StartDate || "",
    EVC_EndDate: row.EVC_EndDate || "",
    EVC_Status: row.EVC_Status,
    EVT_ID: row.EVT_ID || "",
    EVT_Name: row.EVT_Name || "",
    LAF_ID: row.LAF_ID || "",
    LAF_Name: row.LAF_Name || "",
    target_count: Number(row.target_count || 0),
    ...getRoundStatusFromApi(row.EVC_Status),
  };
}

function getTargetId(row = {}) {
  return row.EVP_TargetID || row.target_id || row.supervisor_id || row.id || "";
}

function normalizeEmployeeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isSameEmployee(row = {}, employeeCode) {
  const targetCode = normalizeEmployeeCode(
    row.id || row.EVP_TargetID || row.employeeCode,
  );

  return targetCode === normalizeEmployeeCode(employeeCode);
}

function getPermissionStatus(row = {}) {
  return String(row.EVP_Status ?? row.permission_status ?? row.status ?? 1);
}

function isPermissionOpen(status) {
  return String(status) === "1" || status === true;
}

function getSubmittedStatus(row = {}) {
  return String(
    row.EVP_AssessmentStatus ?? row.assessment_status ?? row.submitted ?? 0,
  );
}

function getStartWorkDate(row = {}) {
  return (
    row.EVP_startworkdate_PSN ||
    row.EVP_StartWorkDate_PSN ||
    row.startworkdate_PSN ||
    row.startWorkDate ||
    row.start_work_date ||
    ""
  );
}

function parseWorkDate(value) {
  if (!value || value === "0000-00-00") return null;

  const cleanValue = String(value).split(" ")[0];
  const thaiDateParts = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (thaiDateParts) {
    const [, day, month, year] = thaiDateParts;
    const numericYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);

    return new Date(numericYear, Number(month) - 1, Number(day));
  }

  const startDate = new Date(cleanValue);

  return Number.isNaN(startDate.getTime()) ? null : startDate;
}

function getWorkAge(startWorkDate) {
  if (!startWorkDate) return "-";

  const startDate = parseWorkDate(startWorkDate);
  if (!startDate) return "-";

  const today = new Date();
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();

  if (today.getDate() < startDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return "น้อยกว่า 1 เดือน";
  if (years <= 0) return `${months} เดือน`;
  if (months <= 0) return `${years} ปี`;

  return `${years} ปี ${months} เดือน`;
}

function getApiEmployeeData(data) {
  const result = data?.result ?? data;

  if (Array.isArray(result)) return result[0] || null;
  if (Array.isArray(result?.data)) return result.data[0] || null;

  return result || null;
}

function isEmptyApiObject(value) {
  return (
    !value ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  );
}

function mapEmployeePreview(row = {}) {
  return {
    employeeCode: row.ID_personnel || row.employeeCode || "",

    employeeName:
      `${row.title_name || ""}${row.firstname_PSN || ""} ${row.lastname_PSN || ""}`.trim() ||
      row.employeeName ||
      "-",
    positionCode: row.PST_code || "",
    positionName: row.position_PSN || "-",
    departmentName: row.department_PSN || "-",
    workplaceCode: row.WP_code || "",
    startWorkDate: row.startworkdate_PSN || null,
  };
}

function mapPermissionRowsToSupervisors(rows = []) {
  const supervisorMap = new Map();

  rows.forEach((row) => {
    const targetId = getTargetId(row);
    if (!targetId) return;
    const rowPermissionStatus = getPermissionStatus(row);

    const current = supervisorMap.get(targetId) || {
      id: targetId,
      employeeCode: targetId,
      EVP_ID: row.EVP_ID || "",
      EVP_Status: rowPermissionStatus,
      name: row.EVP_TargetName || row.target_name || row.supervisor_name || "-",
      position:
        row.EVP_PositionName || row.position_name || row.position || "-",
      department:
        row.EVP_WorkplaceName || row.workplace_name || row.department || "-",
      workArea:
        row.EVP_WorkplaceCode || row.workplace_code || row.workArea || "-",
      startWorkDate: getStartWorkDate(row),
      totalEvaluators: 0,
      submitted: 0,
      pending: 0,
      status: "ยังไม่เริ่ม",
      statusColor: "default",
    };

    if (!current.startWorkDate) {
      current.startWorkDate = getStartWorkDate(row);
    }

    if (!isPermissionOpen(rowPermissionStatus)) {
      current.EVP_Status = "0";
    }

    current.totalEvaluators += Number(row.totalEvaluators || 1);
    current.submitted += getSubmittedStatus(row) === "1" ? 1 : 0;
    current.pending = Math.max(current.totalEvaluators - current.submitted, 0);

    if (current.submitted === current.totalEvaluators) {
      current.status = "ประเมินครบ";
      current.statusColor = "success";
    } else if (current.submitted > 0) {
      current.status = "กำลังประเมิน";
      current.statusColor = "processing";
    }

    current.permissionStatusText = isPermissionOpen(current.EVP_Status)
      ? "เปิดใช้งาน"
      : "ปิดใช้งาน";
    current.permissionStatusColor = isPermissionOpen(current.EVP_Status)
      ? "success"
      : "default";

    supervisorMap.set(targetId, current);
  });

  return Array.from(supervisorMap.values());
}

export default function AdminAssessmentRoundDetailPage() {
  const navigate = useNavigate();
  const { roundId: roundCode } = useParams();
  const [addEmployeeForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundSupervisors, setRoundSupervisors] = useState([]);
  const [supervisorTotal, setSupervisorTotal] = useState(0);
  const [supervisorPage, setSupervisorPage] = useState(1);
  const [supervisorFilters, setSupervisorFilters] = useState(
    initialSupervisorFilters,
  );
  const [activeSupervisorFilters, setActiveSupervisorFilters] = useState(
    initialSupervisorFilters,
  );
  const [filterRequestKey, setFilterRequestKey] = useState(0);
  const [openAddEmployee, setOpenAddEmployee] = useState(false);
  const [employeePreview, setEmployeePreview] = useState(null);
  const [employeeNotFound, setEmployeeNotFound] = useState(false);
  const [checkedEmployeeCode, setCheckedEmployeeCode] = useState("");
  const [loadingRound, setLoadingRound] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [updatingPermissionId, setUpdatingPermissionId] = useState(null);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [loadingEmployeePreview, setLoadingEmployeePreview] = useState(false);

  const fetchRoundDetail = useCallback(async () => {
    setLoadingRound(true);

    try {
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundDetailSub",
        {
          params: {
            EVC_Code: roundCode,
          },
        },
      );
      const apiRound = getApiRoundData(response.data);

      setSelectedRound(mapApiRoundDetail(apiRound || {}, roundCode));
    } catch (error) {
      console.error(error);
      setSelectedRound(mapApiRoundDetail({}, roundCode));
      messageApi.warning("ดึงรายละเอียดรอบประเมินไม่สำเร็จ");
    } finally {
      setLoadingRound(false);
    }
  }, [messageApi, roundCode]);

  const fetchRoundSupervisors = useCallback(async () => {
    setLoadingSupervisors(true);

    try {
      const filters = getCleanSupervisorFilters(activeSupervisorFilters);
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundPermission",
        {
          params: {
            EVC_Code: roundCode,
            page: supervisorPage,
            limit: SUPERVISOR_PAGE_SIZE,
            ...(filters.employeeCode
              ? { EVP_TargetID: filters.employeeCode }
              : {}),
            ...(filters.employeeName
              ? { EVP_TargetName: filters.employeeName }
              : {}),
            ...(filters.workplaceCode
              ? { EVP_WorkplaceCode: filters.workplaceCode }
              : {}),
            ...(filters.workplaceName
              ? { EVP_WorkplaceName: filters.workplaceName }
              : {}),
          },
        },
      );
      const permissionRows = getApiPermissionRows(response.data);

      setRoundSupervisors(mapPermissionRowsToSupervisors(permissionRows));
      setSupervisorTotal(getApiPermissionTotal(response.data, permissionRows));
    } catch (error) {
      console.error(error);
      setRoundSupervisors([]);
      setSupervisorTotal(0);
      messageApi.warning("ดึงรายชื่อหัวหน้าที่ถูกดึงเข้ารอบไม่สำเร็จ");
    } finally {
      setLoadingSupervisors(false);
    }
  }, [
    activeSupervisorFilters,
    filterRequestKey,
    messageApi,
    roundCode,
    supervisorPage,
  ]);

  useEffect(() => {
    fetchRoundDetail();
  }, [fetchRoundDetail]);

  useEffect(() => {
    setSupervisorPage(1);
  }, [roundCode]);

  useEffect(() => {
    fetchRoundSupervisors();
  }, [fetchRoundSupervisors]);

  const handleSupervisorTableChange = (pagination) => {
    setSupervisorPage(pagination.current || 1);
  };

  const handleSupervisorFilterChange = (field, value) => {
    setSupervisorFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSearchSupervisors = () => {
    const nextFilters = getCleanSupervisorFilters(supervisorFilters);

    setSupervisorPage(1);
    setSupervisorFilters(nextFilters);
    setActiveSupervisorFilters(nextFilters);
    setFilterRequestKey((current) => current + 1);
  };

  const handleClearSupervisorFilters = () => {
    setSupervisorPage(1);
    setSupervisorFilters(initialSupervisorFilters);
    setActiveSupervisorFilters(initialSupervisorFilters);
    setFilterRequestKey((current) => current + 1);
  };

  const handleCloseAddEmployee = () => {
    setOpenAddEmployee(false);
    setEmployeePreview(null);
    setEmployeeNotFound(false);
    setCheckedEmployeeCode("");
    addEmployeeForm.resetFields();
  };

  const handleFindEmployee = async () => {
    try {
      const values = await addEmployeeForm.validateFields(["employeeCode"]);
      const employeeCode = values.employeeCode?.trim();

      // alert(employeeCode);
      // return;

      setEmployeePreview(null);
      setEmployeeNotFound(false);
      setCheckedEmployeeCode("");
      setLoadingEmployeePreview(true);

      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundPermissionEmployee",
        {
          params: {
            employeeCode,
          },
        },
      );
      const employeeData = getApiEmployeeData(response.data);

      if (isEmptyApiObject(employeeData)) {
        setEmployeePreview(null);
        setEmployeeNotFound(true);
        setCheckedEmployeeCode("");
        addEmployeeForm.setFields([
          {
            name: "employeeCode",
            errors: ["ไม่พบข้อมูลพนักงาน"],
          },
        ]);
        messageApi.warning("ไม่พบข้อมูลพนักงาน");
        return;
      }

      addEmployeeForm.setFields([
        {
          name: "employeeCode",
          errors: [],
        },
      ]);
      setEmployeePreview(mapEmployeePreview(employeeData));
      setCheckedEmployeeCode(normalizeEmployeeCode(employeeCode));
    } catch (error) {
      if (error?.errorFields) return;

      console.error(error);
      setEmployeePreview(null);
      setEmployeeNotFound(true);
      setCheckedEmployeeCode("");
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "ดึงข้อมูลพนักงานไม่สำเร็จ",
      );
    } finally {
      setLoadingEmployeePreview(false);
    }
  };

  const checkEmployeeExistsInRound = useCallback(
    async (employeeCode) => {
      if (roundSupervisors.some((row) => isSameEmployee(row, employeeCode))) {
        return true;
      }

      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundPermission",
        {
          params: {
            EVC_Code: roundCode,
            employeeCode,
            EVP_TargetID: employeeCode,
            page: 1,
            limit: 1,
          },
        },
      );
      const permissionRows = getApiPermissionRows(response.data);

      return permissionRows.some((row) => isSameEmployee(row, employeeCode));
    },
    [roundCode, roundSupervisors],
  );

  const handleTogglePermissionStatus = async (row, checked) => {
    const nextStatus = checked ? "1" : "0";
    const permissionKey = row.EVP_ID || row.id;

    setUpdatingPermissionId(permissionKey);

    try {
      const payload = {
       
        EVC_Code: roundCode,
        EVP_TargetID: row.id,
        EVP_Status: nextStatus,
      };

      // console.log(payload);
      // return


      const response = await apiClient.post(
        "/api/insurances/updateAssessmentRoundPermissionStatus",
        payload,
      );
      const { status, message } = response.data || {};

      if (String(status) !== "200" && status !== true) {
        throw new Error(message || "อัปเดตสถานะพนักงานไม่สำเร็จ");
      }

      messageApi.success(message || "อัปเดตสถานะพนักงานเรียบร้อยแล้ว");
      fetchRoundSupervisors();
    } catch (error) {
      console.error(error);
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "อัปเดตสถานะพนักงานไม่สำเร็จ",
      );
    } finally {
      setUpdatingPermissionId(null);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const values = await addEmployeeForm.validateFields();
      const employeeCode = values.employeeCode?.trim();
      const normalizedEmployeeCode = normalizeEmployeeCode(employeeCode);

      if (
        !employeePreview ||
        employeeNotFound ||
        checkedEmployeeCode !== normalizedEmployeeCode
      ) {
        messageApi.warning("กรุณากดตรวจสอบข้อมูลพนักงานก่อนเพิ่มเข้ารอบ");
        return;
      }

      const employeeExists = await checkEmployeeExistsInRound(employeeCode);

      if (employeeExists) {
        messageApi.warning("พนักงานคนนี้อยู่ในรอบประเมินนี้แล้ว");
        return;
      }

      const payload = {
        EVC_ID: selectedRound?.EVC_ID,
        EVC_Code: roundCode,
        EVC_Period: selectedRound?.EVC_Period,
        LAF_ID: selectedRound?.LAF_ID,
        EVP_TargetID: employeeCode,
        EVP_TargetName: employeePreview?.employeeName,
        EVP_PositionCode: employeePreview?.positionCode,
        EVP_PositionName: employeePreview?.positionName,
        EVP_WorkplaceCode: employeePreview?.workplaceCode,
        EVP_WorkplaceName: employeePreview?.departmentName,
        EVP_startworkdate_PSN: employeePreview?.startWorkDate,
        EVP_Status: "1",
      };

      // console.log(payload);
      // return;

      setAddingEmployee(true);

      const response = await apiClient.post(
        "/api/insurances/createAssessmentRoundPermissionEmployee",
        payload,
      );
      const { status, message } = response.data || {};

      if (String(status) !== "200" && status !== true) {
        throw new Error(message || "เพิ่มพนักงานเข้ารอบไม่สำเร็จ");
      }

      messageApi.success(message || "เพิ่มพนักงานเข้ารอบเรียบร้อยแล้ว");
      handleCloseAddEmployee();
      fetchRoundSupervisors();
    } catch (error) {
      if (error?.errorFields) return;

      console.error(error);
      messageApi.error(
        error?.response?.data?.message ||
          error?.message ||
          "เพิ่มพนักงานเข้ารอบไม่สำเร็จ",
      );
    } finally {
      setAddingEmployee(false);
    }
  };

  const totalEvaluators = roundSupervisors.reduce(
    (sum, item) => sum + item.totalEvaluators,
    0,
  );
  const totalSubmitted = roundSupervisors.reduce(
    (sum, item) => sum + item.submitted,
    0,
  );
  const percent = totalEvaluators
    ? getPercent(totalSubmitted, totalEvaluators)
    : 0;
  const completed = roundSupervisors.filter(
    (item) => item.pending === 0,
  ).length;

  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      align: "center",
      width: 80,
      render: (_, row, index) => (
        <Typography.Text>
          {(supervisorPage - 1) * SUPERVISOR_PAGE_SIZE + index + 1}
        </Typography.Text>
      ),
    },
    {
      title: "หัวหน้าที่ถูกประเมิน",
      key: "supervisor",
      render: (_, row) => (
        <Space size={12}>
          <Avatar className="supervisor-avatar" icon={<UserOutlined />} />
          <div>
            <Typography.Text strong>{row.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                รหัสพนักงาน {row.employeeCode || row.id || "-"}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text type="secondary">{row.position}</Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },

    {
      title: "ฝ่าย/พื้นที่ ณ รอบนี้",
      key: "area",
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
      title: "อายุงาน",
      key: "workAge",
      width: 140,
      render: (_, row) => (
        <Typography.Text>{getWorkAge(row.startWorkDate)}</Typography.Text>
      ),
    },
    {
      title: "ผู้มีสิทธิ์",
      dataIndex: "totalEvaluators",
      key: "totalEvaluators",
      align: "center",
      render: (total) => <Typography.Text>{total} คน</Typography.Text>,
    },
    {
      title: "ส่งแล้ว",
      dataIndex: "submitted",
      key: "submitted",
      align: "center",
      render: (submitted) => <Typography.Text>{submitted} คน</Typography.Text>,
    },
    {
      title: "ความคืบหน้า",
      key: "progress",
      render: (_, row) => {
        const rowPercent = row.totalEvaluators
          ? getPercent(row.submitted, row.totalEvaluators)
          : 0;

        return (
          <div className="admin-progress-cell">
            <Progress percent={rowPercent} size="small" />
            <Typography.Text type="secondary">
              คงเหลือ {row.pending} คน
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: "สถานะการประเมิน",
      key: "status",
      render: (_, row) => <Tag color={row.statusColor}>{row.status}</Tag>,
    },
    {
      title: "สถานะสิทธิ์",
      key: "permissionStatus",
      align: "center",
      width: 130,
      render: (_, row) => (
        <Tag color={row.permissionStatusColor}>
          {row.permissionStatusText}
        </Tag>
      ),
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center",
      width: 150,
      render: (_, row) => (
        <Switch
          checked={isPermissionOpen(row.EVP_Status)}
          checkedChildren="เปิด"
          loading={updatingPermissionId === (row.EVP_ID || row.id)}
          unCheckedChildren="ปิด"
          onChange={(checked) => handleTogglePermissionStatus(row, checked)}
        />
      ),
    },
  ];

  return (
    <PagePanel
      className="round-detail-full-panel"
      eyebrow="Round Detail"
      title={selectedRound?.EVC_Period || "รายละเอียดรอบประเมิน"}
      description={`รายละเอียดรอบประเมิน ช่วงวันที่ ${formatDateThai(
        selectedRound?.EVC_StartDate,
      )} - ${formatDateThai(selectedRound?.EVC_EndDate)}`}
    >
      {contextHolder}
      <Card className="clean-card round-detail-hero" variant="outlined">
        <div className="round-detail-main">
          <div className="round-detail-icon">
            <FileTextOutlined />
          </div>
          <div>
            <Typography.Text className="access-eyebrow">
              Assessment Form
            </Typography.Text>
            <Typography.Title level={3}>
              {selectedRound?.LAF_Name || "-"}
            </Typography.Title>
            <Typography.Paragraph>
              {selectedRound?.EVC_detail || "ยังไม่ได้ระบุแบบประเมิน"}
            </Typography.Paragraph>
          </div>
          <Tag color={selectedRound?.statusColor || "default"}>
            {selectedRound?.statusText || "-"}
          </Tag>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard
            label="หัวหน้าถูกประเมิน"
            value={`${supervisorTotal} คน`}
            detail="snapshot ในรอบนี้"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="ผู้มีสิทธิ์ประเมิน"
            value={`${totalEvaluators} คน`}
            detail="รวมทุกหัวหน้า"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="ส่งแล้ว"
            value={`${totalSubmitted} รายการ`}
            detail={`ความคืบหน้า ${percent}%`}
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="ประเมินครบ"
            value={`${completed} คน`}
            detail="หัวหน้าที่ได้รับครบแล้ว"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="page-grid">
        <Col xs={24}>
          <Card
            className="clean-card admin-table-card round-detail-table-card"
            title="รายชื่อหัวหน้าที่ถูกดึงเข้ารอบ"
            extra={
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setOpenAddEmployee(true)}
              >
                เพิ่มพนักงาน
              </Button>
            }
            variant="outlined"
          >
            <Row gutter={[12, 12]} className="round-detail-filter-row">
              <Col xs={24} sm={12} lg={3}>
                <Input
                  allowClear
                  placeholder="ค้นหารหัสพนักงาน"
                  value={supervisorFilters.employeeCode}
                  onChange={(event) =>
                    handleSupervisorFilterChange(
                      "employeeCode",
                      event.target.value,
                    )
                  }
                  onPressEnter={handleSearchSupervisors}
                />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Input
                  allowClear
                  placeholder="ค้นหาชื่อ"
                  value={supervisorFilters.employeeName}
                  onChange={(event) =>
                    handleSupervisorFilterChange(
                      "employeeName",
                      event.target.value,
                    )
                  }
                  onPressEnter={handleSearchSupervisors}
                />
              </Col>
              {/* <Col xs={24} sm={12} lg={4}>
                <Input
                  allowClear
                  placeholder="ค้นหาพื้นที่"
                  value={supervisorFilters.workplaceCode}
                  onChange={(event) =>
                    handleSupervisorFilterChange(
                      "workplaceCode",
                      event.target.value,
                    )
                  }
                  onPressEnter={handleSearchSupervisors}
                />
              </Col> */}
              <Col xs={24} sm={12} lg={4}>
                <Input
                  allowClear
                  placeholder="ค้นหาพื้นที่"
                  value={supervisorFilters.workplaceName}
                  onChange={(event) =>
                    handleSupervisorFilterChange(
                      "workplaceName",
                      event.target.value,
                    )
                  }
                  onPressEnter={handleSearchSupervisors}
                />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Space wrap>
                  <Button type="primary" onClick={handleSearchSupervisors}>
                    ค้นหา
                  </Button>
                  <Button onClick={handleClearSupervisorFilters}>
                    ล้างตัวกรอง
                  </Button>
                </Space>
              </Col>
            </Row>
            <Table
              columns={columns}
              dataSource={roundSupervisors}
              loading={loadingSupervisors}
              locale={{ emptyText: "ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา" }}
              pagination={{
                current: supervisorPage,
                pageSize: SUPERVISOR_PAGE_SIZE,
                total: supervisorTotal,
                showSizeChanger: false,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} จาก ${total} คน`,
              }}
              onChange={handleSupervisorTableChange}
              rowKey={(row) => row.id}
              scroll={{ x: 1160 }}
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            className="clean-card round-guide-card"
            title="การจัดการรอบ"
            variant="outlined"
          >
            <div className="round-guide-list">
              <div>
                <TeamOutlined className="admin-detail-icon" />
                <Typography.Text strong>
                  รายชื่อหัวหน้าเป็น snapshot
                </Typography.Text>
                <Typography.Text type="secondary">
                  ตำแหน่งและพื้นที่ไม่เปลี่ยนตามข้อมูลล่าสุด
                </Typography.Text>
              </div>
              <div>
                <ClockCircleOutlined className="admin-detail-icon" />
                <Typography.Text strong>เปิด/ปิดตามช่วงเวลา</Typography.Text>
                <Typography.Text type="secondary">
                  พนักงานจะเห็นเฉพาะรอบที่เปิดใช้งาน
                </Typography.Text>
              </div>
              <div>
                <CheckCircleOutlined className="admin-detail-icon" />
                <Typography.Text strong>ปิดรอบแล้วส่งตรวจผล</Typography.Text>
                <Typography.Text type="secondary">
                  เจ้าหน้าที่ตรวจคำตอบและอนุมัติผลต่อไป
                </Typography.Text>
              </div>
            </div>
            <Button
              className="round-guide-action"
              block
              onClick={() => navigate("/Admin_Check")}
            >
              ไปหน้าติดตามการประเมิน
            </Button>
          </Card>
        </Col>
      </Row>
      <Modal
        title="เพิ่มพนักงานเข้ารอบประเมิน"
        open={openAddEmployee}
        onCancel={handleCloseAddEmployee}
        onOk={handleAddEmployee}
        confirmLoading={addingEmployee}
        okButtonProps={{
          disabled:
            !employeePreview ||
            employeeNotFound ||
            !checkedEmployeeCode ||
            loadingEmployeePreview,
        }}
        okText="เพิ่มพนักงาน"
        cancelText="ยกเลิก"
        width={520}
        centered
      >
        <Form form={addEmployeeForm} layout="vertical">
          <Row gutter={[14, 0]}>
            <Col xs={24}>
              <Form.Item
                label="รหัสพนักงาน"
                name="employeeCode"
                rules={[{ required: true, message: "กรุณากรอกรหัสพนักงาน" }]}
              >
                <Input.Search
                  enterButton="ตรวจสอบ"
                  loading={loadingEmployeePreview}
                  onChange={() => {
                    setEmployeePreview(null);
                    setEmployeeNotFound(false);
                    setCheckedEmployeeCode("");
                  }}
                  onSearch={handleFindEmployee}
                  placeholder="กรุณาระบุ"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {employeeNotFound ? (
          <Typography.Text type="danger">ไม่พบข้อมูลพนักงาน</Typography.Text>
        ) : null}
        {employeePreview ? (
          <Card className="clean-card" size="small" variant="outlined">
            <Descriptions column={1} size="small">
              {/* <Descriptions.Item label="รหัสพนักงาน">
                {employeePreview.employeeCode || "-"}
              </Descriptions.Item> */}
              <Descriptions.Item label="ชื่อพนักงาน">
                {employeePreview.employeeName}
              </Descriptions.Item>
              <Descriptions.Item label="ตำแหน่ง">
                {employeePreview.positionName}
              </Descriptions.Item>
              <Descriptions.Item label="พื้นที่/หน่วยงาน">
                {employeePreview.departmentName}
              </Descriptions.Item>
              <Descriptions.Item label="วันที่เริ่มงาน">
                {formatDateThai(employeePreview.startWorkDate)}
              </Descriptions.Item>
              <Descriptions.Item label="อายุงาน">
                {getWorkAge(employeePreview.startWorkDate)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : null}
      </Modal>
    </PagePanel>
  );
}
