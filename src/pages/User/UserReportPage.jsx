import {
  CalendarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import PagePanel from "../components/PagePanel";

const EMPLOYEE_PHOTO_URL = "https://apimb.sakerp.org/file_photoEMP";
const HISTORY_UNLOCK_SESSION_PREFIX = "sak-assessment-history-unlocked";

function getEmployeePhotoUrl(photo) {
  const fileName = String(photo || "").trim();

  if (!fileName) return undefined;

  return `${EMPLOYEE_PHOTO_URL}/${encodeURIComponent(fileName)}`;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function toThaiYear(year) {
  const numberYear = Number(year);
  if (!numberYear) return "-";

  return String(numberYear < 2400 ? numberYear + 543 : numberYear);
}

function getApiRows(data) {
  const result = data?.result || [];

  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;

  return [];
}

function getHistoryYear(row = {}) {
  const submittedDate =
    row.submitted_At || row.EVS_SubmittedAt || row.submittedAt || "";
  const submittedYear = submittedDate
    ? new Date(submittedDate).getFullYear()
    : "";

  return toThaiYear(row.EVC_Year || row.year || submittedYear);
}

function mapHistoryItem(row = {}) {
  const targetId = toText(row.EVP_TargetID);

  return {
    submission_ID: toText(row.submission_ID),
    EVC_Code: toText(row.EVC_Code),
    EVC_Period: row.EVC_Period || row.period || "-",
    EVC_Year: getHistoryYear(row),
    LAF_Name: row.LAF_Name || row.form_name || "แบบประเมิน",
    EVT_Name:
      row.EVT_Name || row.assessment_type_name || "ประเมินผู้บังคับบัญชา",
    EVP_TargetID: targetId,
    EVP_TargetName: row.EVP_TargetName || row.target_name || targetId || "-",
    EVP_PositionName: row.EVP_PositionName || "-",
    EVP_WorkplaceName: row.EVP_WorkplaceName || "-",
    EVP_Photo: row.EVP_Photo || "",
    Total_Score: row.Total_Score || row.total_score || "",
    submitted_At:
      row.submitted_At || row.EVS_SubmittedAt || row.submittedAt || "",
    status_submission: toText(row.status_submission || "1"),
  };
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

function getScoreText(score) {
  if (!score) return "อยู่ระหว่างการดำเนินการ";

  return `  ${Number(score).toFixed(0)} คะแนน`;
}

function hasScore(score) {
  return score !== undefined && score !== null && score !== "";
}

export default function UserReportPage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const keepHistoryUnlockRef = useRef(false);
  const PerD = readTokenValue(userDetail.PerD);
  const historyUnlockKey = PerD
    ? `${HISTORY_UNLOCK_SESSION_PREFIX}:${PerD}`
    : "";

  const years = useMemo(
    () =>
      [...new Set(historyItems.map((item) => item.EVC_Year))].filter(Boolean),
    [historyItems],
  );

  const filteredHistoryItems = useMemo(
    () => historyItems.filter((item) => item.EVC_Year === selectedYear),
    [historyItems, selectedYear],
  );

  const averageScore = useMemo(() => {
    const scoreList = filteredHistoryItems
      .map((item) => Number(item.Total_Score))
      .filter((score) => !Number.isNaN(score) && score > 0);

    if (!scoreList.length) return "0.00";

    const total = scoreList.reduce((sum, score) => sum + score, 0);
    return (total / scoreList.length).toFixed(2);
  }, [filteredHistoryItems]);

  const totalHistoryItems = historyItems.length;

  const loadHistory = async () => {
    if (!PerD) {
      setHistoryError("ไม่พบรหัสพนักงานจาก token");
      return;
    }

    setLoadingHistory(true);
    setHistoryError("");

    try {
      const { data } = await apiClient.get(
        "/api/insurances/getEvaluationHistoryUser",
        {
          params: {
            EVP_EvaluatorID: PerD,
          },
        },
      );

      const nextItems = getApiRows(data).map(mapHistoryItem);
      setHistoryItems(nextItems);
      setSelectedYear((current) =>
        nextItems.some((item) => item.EVC_Year === current)
          ? current
          : nextItems[0]?.EVC_Year || "",
      );
    } catch (apiError) {
      setHistoryItems([]);
      setHistoryError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "ดึงประวัติการประเมินไม่สำเร็จ",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) loadHistory();
  }, [isUnlocked]);

  useEffect(() => {
    if (!historyUnlockKey) return;

    if (sessionStorage.getItem(historyUnlockKey) === "1") {
      setIsUnlocked(true);
    }
  }, [historyUnlockKey]);

  useEffect(() => {
    if (!historyUnlockKey) return undefined;

    return () => {
      window.setTimeout(() => {
        const nextPath = window.location.pathname;
        const nextSearch = new URLSearchParams(window.location.search);
        const isHistoryPage = nextPath === "/User_out";
        const isHistoryDetail =
          nextPath.startsWith("/User_Assess_Supervisor_Form") &&
          nextSearch.get("from") === "history";

        if (
          !keepHistoryUnlockRef.current &&
          !isHistoryPage &&
          !isHistoryDetail
        ) {
          sessionStorage.removeItem(historyUnlockKey);
        }
      }, 0);
    };
  }, [historyUnlockKey]);

  const handleUnlock = async () => {
    if (!PerD) {
      setAccessError("ไม่พบรหัสพนักงานจาก token");
      return;
    }

    const nextAccessCode = accessCode.trim();

    if (nextAccessCode.length !== 4) {
      setAccessError("กรุณากรอกเลขท้ายบัตรประชาชน 4 หลัก");
      return;
    }

    setVerifyingAccess(true);
    setAccessError("");

    try {
      const payload = {
        accessCode: nextAccessCode,
        PerD,
      };

      const { data } = await apiClient.post(
        "/api/insurances/verifyEvaluationHistoryAccess",
        payload,
      );

      if (data?.result?.verified === true) {
        if (historyUnlockKey) {
          sessionStorage.setItem(historyUnlockKey, "1");
        }
        setAccessCode("");
        setIsUnlocked(true);
      } else {
        setAccessError(
          data?.message ||
            "เลขท้ายบัตรประชาชนไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        );
      }
    } catch (apiError) {
      setAccessError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "ตรวจสอบเลขท้ายบัตรประชาชนไม่สำเร็จ",
      );
    } finally {
      setVerifyingAccess(false);
    }
  };

  const handleOpenDetail = (item) => {
    keepHistoryUnlockRef.current = true;

    const query = new URLSearchParams();
    query.set("EVC_Code", item.EVC_Code);
    query.set("submission_ID", item.submission_ID);
    query.set("from", "history");

    navigate(
      `/User_Assess_Supervisor_Form/${item.EVP_TargetID}?${query.toString()}`,
      {
        state: {
          EVC_Code: item.EVC_Code,
          EVC_Period: item.EVC_Period,
          submission_ID: item.submission_ID,
          isReadOnly: true,
          supervisor: {
            EVP_TargetID: item.EVP_TargetID,
            EVP_TargetName: item.EVP_TargetName,
            EVP_PositionName: item.EVP_PositionName,
            EVP_WorkplaceName: item.EVP_WorkplaceName,
            EVP_Photo: item.EVP_Photo,
          },
        },
      },
    );
  };

  if (!isUnlocked) {
    return (
      <PagePanel
        eyebrow="Assessment History"
        title="ประวัติการประเมิน"
        description="กรอกเลขท้ายบัตรประชาชน 4 หลักเพื่อเข้าดูรายการประเมินที่เคยส่งแล้ว"
        showBack={false}
        className="user-history-page"
      >
        <Card className="clean-card history-lock-card" variant="outlined">
          <Space orientation="vertical" size={18} className="full-width">
            <div className="history-lock-icon">
              <LockOutlined />
            </div>
            <div>
              <Typography.Title level={4}>
                ยืนยันเลขท้ายบัตรประชาชนก่อนเข้าดูประวัติ
              </Typography.Title>
              <Typography.Paragraph>
                เพื่อความเป็นส่วนตัว ระบบจะแสดงรายการประเมินหลังกรอกเลขท้ายบัตรประชาชนถูกต้อง
              </Typography.Paragraph>
            </div>
            {accessError ? (
              <Alert title={accessError} type="error" showIcon />
            ) : null}
            <Space.Compact className="history-lock-input">
              <Input.Password
                prefix={<SafetyCertificateOutlined />}
                placeholder="เลขท้ายบัตรประชาชน 4 หลัก"
                maxLength={4}
                value={accessCode}
                onChange={(event) =>
                  setAccessCode(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                onPressEnter={handleUnlock}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={verifyingAccess}
                onClick={handleUnlock}
              >
                เข้าดู
              </Button>
            </Space.Compact>
          </Space>
        </Card>
      </PagePanel>
    );
  }

  return (
    <PagePanel
      eyebrow="Assessment History"
      title="ประวัติการประเมิน"
      description="รายการประเมินที่ส่งแล้ว แยกตามปีและรอบประเมิน"
      showBack={false}
      className="user-history-page"
    >
      {historyError ? (
        <Alert
          className="assessment-success-alert"
          title="โหลดข้อมูลประวัติไม่สำเร็จ"
          description={historyError}
          type="warning"
          showIcon
        />
      ) : null}

      <Card className="history-hero-card" variant="outlined">
        <div className="history-hero-content">
          <div className="history-hero-copy">
            <div className="history-hero-icon">
              <HistoryOutlined />
            </div>
            <div>
              <Typography.Text className="access-eyebrow">
                My Assessment Record
              </Typography.Text>
              <Typography.Title level={3}>
                ข้อมูลการประเมินย้อนหลัง
              </Typography.Title>
              <Typography.Paragraph>
                ตรวจสอบรายการที่คุณเคยส่งประเมิน แยกตามรอบและปีประเมิน
              </Typography.Paragraph>
            </div>
          </div>

          <div className="history-hero-stats">
            <div>
              <Typography.Text type="secondary">ปีที่เลือก</Typography.Text>
              <Typography.Title level={4}>
                {selectedYear || "-"}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">ส่งแล้ว</Typography.Text>
              <Typography.Title level={4}>
                {filteredHistoryItems.length}
              </Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">คะแนนเฉลี่ย</Typography.Text>
              <Typography.Title level={4}>{averageScore}</Typography.Title>
            </div>
            <div>
              <Typography.Text type="secondary">ทั้งหมด</Typography.Text>
              <Typography.Title level={4}>{totalHistoryItems}</Typography.Title>
            </div>
          </div>
        </div>
      </Card>

      <Card
        className="clean-card history-card"
        title={
          <Space size={10}>
            <CheckCircleOutlined />
            <span>รายการที่ประเมินแล้ว</span>
          </Space>
        }
        extra={
          <Select
            className="history-year-select"
            value={selectedYear || undefined}
            options={years.map((year) => ({
              label: `ปี ${year}`,
              value: year,
            }))}
            placeholder="เลือกปี"
            onChange={setSelectedYear}
          />
        }
        variant="outlined"
      >
        <Skeleton active loading={loadingHistory}>
          {filteredHistoryItems.length ? (
            <div className="history-list">
              {filteredHistoryItems.map((item) => (
                <div className="history-list-item" key={item.submission_ID}>
                  <div className="history-list-main">
                    <Avatar
                      className="history-avatar"
                      size={62}
                      src={getEmployeePhotoUrl(item.EVP_Photo)}
                      icon={<UserOutlined />}
                    />
                    <div className="history-list-copy">
                      <div className="history-title-row">
                        <Typography.Title level={5}>
                          {item.EVP_TargetName}
                        </Typography.Title>
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          ส่งแล้ว
                        </Tag>
                      </div>
                      <Typography.Text type="secondary">
                        {item.EVP_PositionName}
                      </Typography.Text>
                      <div className="history-list-meta">
                        <span className="history-meta-pill">
                          <SafetyCertificateOutlined />
                          {item.EVT_Name}
                        </span>
                        <span className="history-meta-pill">
                          <CalendarOutlined />
                          {item.EVC_Period}
                        </span>
                        <span className="history-meta-pill">
                          <SafetyCertificateOutlined />
                          {item.EVC_Code || "-"}
                        </span>
                      </div>
                      <Typography.Text
                        className="history-submit-date"
                        type="secondary"
                      >
                        ส่งเมื่อ {formatSubmitDate(item.submitted_At)}
                      </Typography.Text>
                    </div>
                  </div>

                  <Space className="history-list-actions" wrap>
                    <Tag
                      color={hasScore(item.Total_Score) ? "blue" : "warning"}
                      className={`summary-tag ${hasScore(item.Total_Score) ? "" : "pending-score-tag"}`}
                    >
                      {getScoreText(item.Total_Score)}
                    </Tag>
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => handleOpenDetail(item)}
                    >
                      ดูรายละเอียด
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="ไม่พบประวัติการประเมินในปีที่เลือก" />
          )}
        </Skeleton>
      </Card>
    </PagePanel>
  );
}
