import {
  ApartmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import { formatThaiProfileDateShort } from "../../utils/thaiProfileDates";

const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";

function getEmployeePhotoUrl(photo) {
  const fileName = String(photo || "").trim();

  if (!fileName) return undefined;

  return `${EMPLOYEE_PHOTO_URL}/${encodeURIComponent(fileName)}`;
}

function getWorkAge(startWorkDate) {
  if (!startWorkDate || startWorkDate === "0000-00-00") return "-";

  const startDate = new Date(String(startWorkDate).split(" ")[0]);
  if (Number.isNaN(startDate.getTime())) return "-";

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

function getSupervisorRowKey(supervisor, index) {
  return [
    supervisor.EVP_ID,
    supervisor.EVC_ID,
    supervisor.submission_ID,
    supervisor.EVP_EvaluatorID,
    supervisor.EVP_TargetID,
    index,
  ]
    .filter((item) => item !== undefined && item !== null && item !== "")
    .join("-");
}

function isSupervisorSubmitted(supervisor, submittedSupervisorId) {
  return (
    supervisor.EVP_TargetID === submittedSupervisorId ||
    String(supervisor.status_submission || "") === "1"
  );
}

function getSubmissionId(supervisor = {}) {
  return (
    supervisor.submission_ID ||
    supervisor.Submission_ID ||
    supervisor.EVS_SubmissionID ||
    supervisor.EVP_SubmissionID ||
    ""
  );
}

function getSupervisorLoadingKey(supervisor = {}) {
  return `${supervisor.EVP_TargetID || ""}-${getSubmissionId(supervisor)}`;
}

export default function SupervisorAssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roundCode =
    location.state?.EVC_Code || searchParams.get("EVC_Code") || "";
  const roundPeriod = location.state?.EVC_Period || "";
  const roundDetail = location.state?.EVC_detail || "";
  const assessmentTypeId =
    location.state?.EVT_ID || searchParams.get("EVT_ID") || "";
  const submittedSupervisorId = location.state?.submittedSupervisorId;
  const [highlightedSupervisorId, setHighlightedSupervisorId] = useState(
    submittedSupervisorId || "",
  );
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const PerD = readTokenValue(userDetail.PerD);
  const PerPST = readTokenValue(userDetail.PerPST);
  const PerPST_LV = readTokenValue(userDetail.PerPST_LV);
  const PerWP = readTokenValue(userDetail.PerWP);
  const PerWP_N = readTokenValue(userDetail.PerWP_N);

  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!highlightedSupervisorId) return undefined;

    const timer = window.setTimeout(() => {
      setHighlightedSupervisorId("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [highlightedSupervisorId]);
  const hasNoSupervisor = supervisors.length === 0 && !loadingSupervisors;
  const dueDate =
    supervisors.find((supervisor) => supervisor.EVC_EndDate)?.EVC_EndDate || "";
  const pageTitle =
    roundDetail ||
    supervisors.find((supervisor) => supervisor.EVC_detail)?.EVC_detail ||
    "เลือกผู้บังคับบัญชาที่ต้องการประเมิน";

  const getEvaluationDetail = async (supervisor) => {
    const submissionId = getSubmissionId(supervisor);

    // console.log(submissionId);
    // return;
    
    const { data } = await apiClient.get(
      "/api/insurances/getEvaluationDetail",
      {
        params: {
          EVC_Code: roundCode,
          submission_ID: submissionId || undefined,
          EVP_EvaluatorID: PerD,
          EVP_TargetID: supervisor.EVP_TargetID,
        },
      },
    );

    if (!data?.result) {
      throw new Error(data?.message || "ไม่พบข้อมูลการประเมิน");
    }

    return data;
  };

  const handleOpenAssessmentForm = async (supervisor, isSubmitted) => {
    const supervisorId = supervisor.EVP_TargetID;
    const submissionId = getSubmissionId(supervisor);
    const loadingKey = getSupervisorLoadingKey(supervisor);

    // console.log(loadingKey);
    // return;


    let evaluationDetail = null;
    const queryParams = new URLSearchParams();
    if (roundCode) queryParams.set("EVC_Code", roundCode);
    if (assessmentTypeId) queryParams.set("EVT_ID", assessmentTypeId);
    if (submissionId) queryParams.set("submission_ID", submissionId);

    const nextPath = queryParams.toString()
      ? `/User_Assess_Supervisor_Form/${supervisorId}?${queryParams.toString()}`
      : `/User_Assess_Supervisor_Form/${supervisorId}`;

    if (isSubmitted) {
      setLoadingDetailId(loadingKey);

      try {
        evaluationDetail = await getEvaluationDetail(supervisor);
      } catch (error) {
        console.error(error);
        setLoadError(
          error?.response?.data?.message ||
            error?.message ||
            "โหลดรายละเอียดการประเมินไม่สำเร็จ",
        );
        setLoadingDetailId("");
        return;
      }

      setLoadingDetailId("");
    }

    navigate(nextPath, {
      state: {
        EVC_Code: roundCode,
        EVC_Period: roundPeriod,
        EVC_detail: pageTitle,
        EVT_ID: assessmentTypeId,
        submission_ID: submissionId,
        supervisor,
        isReadOnly: isSubmitted,
        evaluationDetail,
      },
    });
  };

  const fetchSupervisors = async () => {
    if (!PerD) {
      setLoadError("ไม่พบข้อมูล token ผู้ใช้งาน");
      return;
    }

    setLoadingSupervisors(true);
    setLoadError("");

    const payload = {
      PerD,
      PerPST,
      PerPST_LV,
      PerWP,
      EVC_Code: roundCode,
      EVT_ID: assessmentTypeId,
    };

    // console.log("payload:", payload);

    try {
      const response = await apiClient.get(
        "/api/insurances/getAssessmentRoundPermissionUser",
        {
          params: payload,
        },
      );

      // console.log("response:", response.data);

      if (Array.isArray(response.data.result)) {
        setSupervisors(response.data.result);
        // console.log(response.data.result);
      } else {
        setSupervisors([]);
      }
    } catch (error) {
      console.error("GET Supervisor Assessment Error:", error);
      setSupervisors([]);

      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "ดึงรายชื่อผู้บังคับบัญชาไม่สำเร็จ",
      );
    } finally {
      setLoadingSupervisors(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, [roundCode, assessmentTypeId]);

  return (
    <PagePanel
      // className="supervisor-assessment-page"
      eyebrow="Supervisor Assessment"
      title={pageTitle}
      description="ระบบแสดงรายชื่อหัวหน้าที่อยู่ในพื้นที่ทำงานหรือฝ่ายเดียวกัน เลือกรายชื่อเพื่อเข้าสู่แบบประเมิน"
    >
      <Row gutter={[16, 16]} className="supervisor-summary-row">
        <Col xs={24} md={8}>
          <MetricCard
            label="ฝ่าย/พื้นที่"
             value={<span style={{ fontSize: 28 }}>{PerWP_N || "-"}</span>}
            // detail={`ตำแหน่ง ${PerPST || "-"}`}
             style={{ fontSize: 1 }}
          /> 
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="รายชื่อที่ประเมินได้"
            value={`${supervisors.length} คน`}
            detail="จากสิทธิ์ในรอบประเมิน"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="สิ้นสุดการประเมิน"
            value={dueDate ? formatThaiProfileDateShort(dueDate) : "-"}
            detail={roundCode ? `รหัสรอบ ${roundCode}` : roundPeriod || "รอบปัจจุบัน"}
          />
        </Col>
      </Row>

      {loadError ? (
        <Alert
          className="assessment-success-alert"
          title="โหลดข้อมูลจาก API ไม่สำเร็จ"
          description={loadError}
          type="warning"
          showIcon
        />
      ) : null}

      <Card
        className="clean-card supervisor-list-card"
        title={
          <Space size={10} wrap>
            <TeamOutlined />
            <span>รายชื่อผู้บังคับบัญชาในฝ่ายเดียวกัน</span>
          </Space>
        }
        extra={
          roundCode ? (
            <Tag color="blue">รอบ {roundCode}</Tag>
          ) : null
        }
        loading={loadingSupervisors}
        variant="outlined"
      >
        <div className="supervisor-list">
          {hasNoSupervisor ? (
            <div className="supervisor-empty-state">
              <UserOutlined />
              <Typography.Text type="secondary">
                ไม่พบรายชื่อผู้บังคับบัญชาที่ต้องประเมิน
              </Typography.Text>
            </div>
          ) : null}
          {supervisors.map((supervisor, index) => {
            const isSubmitted = isSupervisorSubmitted(
              supervisor,
              submittedSupervisorId,
            );
            const isJustSubmitted =
              String(supervisor.EVP_TargetID || "") ===
              String(highlightedSupervisorId || "");
            const photoUrl = getEmployeePhotoUrl(
              supervisor.EVP_Photo || supervisor.photo_PSN,
            );

            return (
              <div
                className={`supervisor-list-item ${
                  isJustSubmitted ? "is-just-submitted" : ""
                }`}
                key={getSupervisorRowKey(supervisor, index)}
              >
                <div className="supervisor-profile">
                  <Avatar
                    className="supervisor-avatar"
                    size={48}
                    src={photoUrl}
                    icon={!photoUrl ? <UserOutlined /> : undefined}
                  />
                  <div className="supervisor-copy">
                    <div className="supervisor-title-row">
                      <Typography.Title level={5}>
                        {supervisor.EVP_TargetName}
                      </Typography.Title>
                      <Tag
                        className={isSubmitted ? "status-tag-done" : "status-tag-ready"}
                        color={isSubmitted ? "success" : "processing"}
                        icon={<CheckCircleOutlined />}
                      >
                        {isSubmitted ? "ส่งแล้ว" : "พร้อมประเมิน"}
                      </Tag>
                      {supervisor.is_previous_workplace_supervisor === true && (
                        <Tag color="orange" style={{ whiteSpace: "normal" }}>
                          ผู้บังคับบัญชา พื้นที่ปฏิบัติงานเดิม
                        </Tag>
                      )}
                    </div>
                    <Typography.Text type="secondary">
                      <SafetyCertificateOutlined /> {supervisor.EVP_PositionName || "-"}
                    </Typography.Text>

                    <div className="supervisor-detail-grid">
                      {/* <div className="supervisor-detail-pill">
                        <SafetyCertificateOutlined />
                        <span>ประเมินผู้บังคับบัญชา</span>
                      </div> */}
                    
                      <div className="supervisor-detail-pill">
                        <ApartmentOutlined />
                        <span>
                          {supervisor.EVP_WorkplaceName || "-"} /{" "}
                          {supervisor.EVP_WorkplaceCode || "-"}
                        </span>
                      </div>
                       <div className="supervisor-detail-pill">
                        {index === 0 ? <CrownOutlined /> : <TeamOutlined />}
                        <span>อายุงาน {getWorkAge(supervisor.EVP_startworkdate_PSN)}</span>
                      </div>
                        <div className="supervisor-detail-pill">
                        <SafetyCertificateOutlined />
                        <span>{roundCode || "-"}</span>
                      </div>
                      <div className="supervisor-detail-pill">
                        <CalendarOutlined />
                        <span>{roundPeriod || "รอบปัจจุบัน"}</span>
                      </div>
                      
                     
                    </div>
                  </div>
                </div>

                <Button
                  type="primary"
                  className={isSubmitted ? "supervisor-view-button" : "supervisor-assess-button"}
                  icon={isSubmitted ? <EyeOutlined /> : <CheckCircleOutlined />}
                  loading={loadingDetailId === getSupervisorLoadingKey(supervisor)}
                  onClick={() =>
                    handleOpenAssessmentForm(supervisor, isSubmitted)
                  }
                >
                  {isSubmitted ? "ดูผลการประเมิน" : "เข้าทำแบบประเมิน"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </PagePanel>
  );
}
