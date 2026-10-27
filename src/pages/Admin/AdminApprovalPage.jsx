import { CheckCircleOutlined, CopyOutlined, DownOutlined, EditOutlined, EyeOutlined, RobotOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Collapse, Empty, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient, { getInitialUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import { refreshApprovalCount } from "../../stores/approvalNotifications";
import PagePanel, { MetricCard } from "../components/PagePanel";
import AiAnalysisSummary from "../components/AiAnalysisSummary";

const scoreColumns = [5, 4, 3, 2, 1];
const commentPreviewLength = 100;
const geminiAnalysisApi = "/api/insurances/analyzeEvaluationComments";

function getCommentPreview(comment, expanded) {
  const text = String(comment || "").trim();
  if (!text) return "-";
  if (expanded || text.length <= commentPreviewLength) return text;
  return `${text.slice(0, commentPreviewLength)}...`;
}

function mapAnswerRows(rows = []) {
  const topicMap = new Map();

  rows.forEach((row) => {
    const topicId = String(row.LAC_ID ?? "");
    const questionId = String(row.LAQ_ID ?? "");

    if (!topicId || !questionId) return;

    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        LAC_ID: topicId,
        LAC_Name: row.LAC_Name || `หัวข้อ ${topicId}`,
        questions: [],
      });
    }

    topicMap.get(topicId).questions.push({
      LAQ_ID: questionId,
      LAQ_Text: row.LAQ_Text,
      score: Number(row.score ?? row.answer_value ?? 0),
      answer_type: row.answer_type || "checkbox",
      answer_value: row.answer_value,
    });
  });

  return Array.from(topicMap.values());
}

const emptyFilters = { name: "", employeeCode: "", workplace: "", assessmentType: "", year: "", status: "pending" };
function getRows(data) {
  const result = data?.result || data || [];

  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result.answers)) return result.answers;
  if (Array.isArray(result.data)) return result.data;

  return [];
}

function getEmployeePhotoUrl(photo) {
  const fileName = String(photo || "").trim();
  if (!fileName || fileName === "-") return undefined;
  return `https://apimb.sakerp.org/file_photoEMP/${encodeURIComponent(fileName)}`;
}

function approved(item) {
  return String(item.status_chkHr) === "1";
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function calculateTotalScore(answers = []) {
  return answers.reduce((sum, answer) => {
    const score = Number(answer.score);
    return sum + (Number.isFinite(score) && score > 0 ? score : 0);
  }, 0);
}

function mapApprovalRow(row = {}) {
  return {
    ...row,
    submissions: Array.isArray(row.submissions) ? row.submissions : [],
    submittedCount: Number(row.submittedCount || 0),
    expectedCount: Number(row.expectedCount || 0),
    isClosed: Boolean(row.isClosed),
  };
}

async function writeClipboardText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) throw new Error("เบราว์เซอร์ไม่อนุญาตให้คัดลอกข้อความ");
}

// แยกการเรียก Gemini API ออกจากการจัดการสถานะของหน้าจอ
async function requestGeminiAnalysis(comment) {
  const { data } = await apiClient.post(geminiAnalysisApi, {
    combined_comment: comment,
  });
  const analysis = String(
    data?.result?.analysis ?? data?.analysis ?? data?.result ?? "",
  ).trim();

  if (!analysis) {
    throw new Error("Gemini ไม่ได้ส่งผลวิเคราะห์กลับมา");
  }

  return analysis;
}

export default function AdminApprovalPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [userDetail] = useState(() => getInitialUserDetail() || {});
  const [approvalList, setApprovalList] = useState([]);
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [loadingAssessmentTypes, setLoadingAssessmentTypes] = useState(true);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState(emptyFilters);
  const [tablePage, setTablePage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [details, setDetails] = useState([]);
  const [editedComments, setEditedComments] = useState({});
  const [combinedComment, setCombinedComment] = useState("");
  const [aiAnalysisText, setAiAnalysisText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [editingAiAnalysis, setEditingAiAnalysis] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedApprovalEditors, setExpandedApprovalEditors] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const analysisRequestId = useRef(0);

  const summary = useMemo(
    () => ({
      total: approvalList.length,
      pending: approvalList.filter((item) => !approved(item)).length,
      approved: approvalList.filter(approved).length,
    }),
    [approvalList],
  );

  const loadApprovalList = useCallback(async () => {
    setLoadingList(true);

    try {
      const { data } = await apiClient.get(
        "/api/insurances/getEvaluationApprovalList",
        { params: { status: "all" } },
      );

      setApprovalList(
        getRows(data)
          .map(mapApprovalRow)
          .sort((a, b) => Number(approved(a)) - Number(approved(b))),
      );
    } catch (error) {
      console.error(error);
      setApprovalList([]);
      messageApi.error(errorMessage(error, "โหลดรายการอนุมัติไม่สำเร็จ"));
    } finally {
      setLoadingList(false);
    }
  }, [messageApi]);

  useEffect(() => {
    // The initial request uses the same loader as refresh after approval.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApprovalList();
    return () => { requestId.current += 1; };
  }, [loadApprovalList]);

  useEffect(() => {
    let active = true;

    apiClient.get("/api/insurances/getAssessmentType")
      .then(({ data }) => {
        if (active) setAssessmentTypes(getRows(data));
      })
      .catch((error) => {
        if (active) messageApi.error(errorMessage(error, "โหลดประเภทการประเมินไม่สำเร็จ"));
      })
      .finally(() => {
        if (active) setLoadingAssessmentTypes(false);
      });

    return () => { active = false; };
  }, [messageApi]);

  const assessmentTypeOptions = useMemo(() => {
    const types = new Map();

    // รวมประเภทในรายการด้วย เพื่อให้กรองประวัติของประเภทที่ปิดใช้งานได้
    [...approvalList, ...assessmentTypes].forEach((item) => {
      const value = String(item.EVT_ID ?? "");
      if (value) types.set(value, { value, label: item.EVT_Name || `ประเภท ${value}` });
    });

    return [{ value: "", label: "ทุกประเภทการประเมิน" }, ...types.values()];
  }, [approvalList, assessmentTypes]);

  const assessmentYearOptions = useMemo(() => {
    const years = [...new Set(approvalList
      .map((item) => String(item.EVC_Year ?? "").trim())
      .filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a));

    return [
      { value: "", label: "ทุกปีที่ประเมิน" },
      ...years.map((year) => ({ value: year, label: `ปี ${year}` })),
    ];
  }, [approvalList]);

  const filteredApprovalList = useMemo(() => approvalList.filter((group) => {
    const matches = (value, query) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());
    return matches([group.EVP_TargetName, ...group.submissions.map((s) => s.EVP_EvaluatorName)].join(" "), activeFilters.name)
      && matches([group.EVP_TargetID, ...group.submissions.map((s) => s.EVP_EvaluatorID)].join(" "), activeFilters.employeeCode)
      && matches(group.EVP_WorkplaceName, activeFilters.workplace)
      && (!activeFilters.assessmentType || String(group.EVT_ID) === activeFilters.assessmentType)
      && (!activeFilters.year || String(group.EVC_Year ?? "").trim() === activeFilters.year)
      && (activeFilters.status === "approved" ? approved(group) : !approved(group));
  }), [approvalList, activeFilters]);

  const openDetail = async (item) => {
    const id = ++requestId.current;
    setSelectedItem(item);
    analysisRequestId.current += 1;
    setDetails([]);
    setEditedComments({});
    setCombinedComment("");
    setAiAnalysisText("");
    setAnalyzing(false);
    setAnalysisError("");
    setEditingAiAnalysis(false);
    setExpandedComments({});
    setExpandedApprovalEditors({});
    setDetailError("");
    setLoadingDetail(true);

    try {
      const submissions = await Promise.all(
        item.submissions.map(async (submission) => {
          const { data } = await apiClient.get(
            "/api/insurances/getEvaluationDetailApproval",
            {
              params: {
                EVC_Code: item.EVC_Code,
                EVP_TargetID: item.EVP_TargetID,
                EVP_EvaluatorID: submission.EVP_EvaluatorID,
                submission_ID: submission.submission_ID,
              },
            },
          );

          const rows = getRows(data);
          const firstRow = rows[0];

          if (!firstRow) {
            throw new Error("ไม่พบรายละเอียดบางรายการ กรุณาเปิดตรวจสอบใหม่");
          }

          return {
            ...submission,
            comment: firstRow.comment ?? submission.comment ?? "",
            comment_HrConfirm: firstRow.comment_HrConfirm ?? submission.comment_HrConfirm,
            ai_analysis: firstRow.ai_analysis ?? firstRow.ai_analysis_result ?? submission.ai_analysis ?? "",
            answers: rows.filter((row) => row.LAQ_ID),
          };
        }),
      );

      if (id !== requestId.current) return;

      const comments = {};
      submissions.forEach((submission) => {
        comments[submission.submission_ID] = approved(submission)
          ? submission.comment_HrConfirm ?? submission.comment ?? ""
          : submission.comment_HrConfirm || submission.comment || "";
      });

      setDetails(submissions);
      setEditedComments(comments);
      setCombinedComment(
        String(item.EVP_CombinedComment || "").trim() || submissions
          .map((submission) => submission.comment_HrConfirm || submission.comment || "")
          .map((comment) => String(comment).trim())
          .filter(Boolean)
          .join(", "),
      );
      setAiAnalysisText(String(
        item.ai_analysis ??
        item.ai_analysis_result ??
        submissions.find((submission) => submission.ai_analysis)?.ai_analysis ??
        "",
      ).trim());
    } catch (error) {
      console.error(error);
      if (id === requestId.current) {
        setDetailError(errorMessage(error, "โหลดรายละเอียดการประเมินไม่สำเร็จ"));
      }
    } finally {
      if (id === requestId.current) setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    if (saving) return;

    requestId.current += 1;
    analysisRequestId.current += 1;
    setSelectedItem(null);
    setCombinedComment("");
    setAiAnalysisText("");
    setAnalyzing(false);
    setAnalysisError("");
    setEditingAiAnalysis(false);
    setExpandedComments({});
    setExpandedApprovalEditors({});
  };

  const analyzeCombinedComment = async () => {
    const comment = combinedComment.trim();

    if (!comment) {
      messageApi.warning("กรุณาระบุความคิดเห็นรวมก่อนวิเคราะห์");
      return;
    }

    setAnalyzing(true);
    setAnalysisError("");
    const id = ++analysisRequestId.current;

    try {
      const analysis = await requestGeminiAnalysis(comment);

      if (id !== analysisRequestId.current) return;
      setAiAnalysisText(analysis);
      setEditingAiAnalysis(false);
      messageApi.success("วิเคราะห์ความคิดเห็นด้วย Gemini เรียบร้อยแล้ว");
    } catch (error) {
      if (id !== analysisRequestId.current) return;
      console.error(error);
      const text = errorMessage(error, "วิเคราะห์ด้วย Gemini ไม่สำเร็จ กรุณาลองอีกครั้ง");
      setAnalysisError(text);
      messageApi.error(text);
    } finally {
      if (id === analysisRequestId.current) setAnalyzing(false);
    }
  };

  const copyAiAnalysis = async () => {
    const analysis = aiAnalysisText.trim();

    if (!analysis) {
      messageApi.warning("ยังไม่มีผลวิเคราะห์จาก Gemini");
      return;
    }

    try {
      await writeClipboardText(analysis);
      messageApi.success("คัดลอกผลวิเคราะห์แล้ว");
    } catch (error) {
      console.error(error);
      messageApi.error(errorMessage(error, "คัดลอกผลวิเคราะห์ไม่สำเร็จ"));
    }
  };

  const saveApproval = async () => {
    if (
      !selectedItem || saving || analyzing || loadingDetail || detailError ||
      details.length !== selectedItem.submissions.length
    ) return;

    const payload = {
      EVC_Code: selectedItem.EVC_Code,
      EVP_TargetID: selectedItem.EVP_TargetID,
      approved_by: readTokenValue(userDetail.PerD),
      combined_comment: combinedComment,
      ai_analysis: aiAnalysisText.trim(),
      submissions: details.map((submission) => ({
        submission_ID: submission.submission_ID,
        approval_comment: editedComments[submission.submission_ID] ?? "",
      })),
    };

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/api/insurances/updateEvaluationApproval",
        payload,
      );

      messageApi.success(data?.message || "บันทึกผลการตรวจทั้งชุดเรียบร้อยแล้ว");
      setSelectedItem(null);
      requestId.current += 1;
      refreshApprovalCount(true);
      await loadApprovalList();
    } catch (error) {
      console.error(error);
      messageApi.error(errorMessage(error, "บันทึกผลการตรวจไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "ผู้ถูกประเมิน",
      key: "target",
      render: (_, row) => (
        <Space size={12}>
          <Avatar size={44} src={getEmployeePhotoUrl(row.targetPhoto)} icon={<UserOutlined />} />
          <div>
            <Typography.Text strong>{row.EVP_TargetName}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                {row.EVP_TargetID} · {row.EVP_PositionName} / {row.EVP_WorkplaceName}
              </Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "รอบประเมิน",
      key: "round",
      render: (_, row) => (
        <div className="round-info">
          <Tag className="round-tag">{row.EVT_Name} {row.EVC_Period}</Tag>
          <Typography.Text type="secondary" className="round-detail">
            {row.EVC_Code}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "ผู้ส่งประเมิน / ทั้งหมด",
      key: "count",
      render: (_, row) => (
        <div>
          <Tag color={row.submittedCount >= row.expectedCount ? "green" : "orange"}>
            {row.submittedCount} / {row.expectedCount} คน
          </Tag>
          <div>{row.isClosed ? "ปิดรอบแล้ว" : "ประเมินครบแล้ว"}</div>
        </div>
      ),
    },
    {
      title: "สถานะ",
      key: "status",
      render: (_, row) => (
        <Tag color={approved(row) ? "success" : "warning"}>
          {approved(row) ? "อนุมัติแล้ว" : "รอตรวจ"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, row) => (
        <Button icon={<EyeOutlined />} onClick={() => openDetail(row)}>
          ตรวจสอบทั้งชุด
        </Button>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Approval Queue"
      title="อนุมัติผลการประเมิน"
      description="ตรวจสอบผลรวมเมื่อประเมินครบ หรือเมื่อเจ้าหน้าที่ปิดรอบ แก้ไขคอมเมนต์รายคนและอนุมัติทั้งชุด"
      showBack={false}
    >
      {contextHolder}

      <Row gutter={[16, 16]} className="approval-summary-row">
        <Col xs={24} md={8}>
          <MetricCard
            label="รายการทั้งหมด"
            value={`${summary.total} ชุด`}
            detail="แยกตามผู้บังคับบัญชาและรอบประเมิน"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="รอตรวจ/แก้ไข"
            value={`${summary.pending} ชุด`}
            detail="ยังไม่อนุมัติ"
          />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard
            label="อนุมัติแล้ว"
            value={`${summary.approved} ชุด`}
            detail="พร้อมแจ้งเตือนพนักงาน"
          />
        </Col>
      </Row>

      <Card
        className="clean-card admin-table-card"
        title="รายการรออนุมัติผลการประเมิน"
        variant="outlined"
      >
        <form className="admin-table-filter-panel approval-filter-panel" onSubmit={(event) => {
          event.preventDefault();
          setActiveFilters({ ...draftFilters });
          setTablePage(1);
        }}>
          <Input allowClear placeholder="ชื่อผู้ประเมิน / ผู้ถูกประเมิน" aria-label="ชื่อผู้ประเมินหรือผู้ถูกประเมิน"
            value={draftFilters.name} onChange={(event) => setDraftFilters((current) => ({ ...current, name: event.target.value }))} />
          <Input allowClear placeholder="รหัสพนักงาน" aria-label="รหัสพนักงาน"
            value={draftFilters.employeeCode} onChange={(event) => setDraftFilters((current) => ({ ...current, employeeCode: event.target.value }))} />
          <Input allowClear placeholder="ฝ่าย / สาขาของผู้ถูกประเมิน" aria-label="ฝ่ายหรือสาขาของผู้ถูกประเมิน"
            value={draftFilters.workplace} onChange={(event) => setDraftFilters((current) => ({ ...current, workplace: event.target.value }))} />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="ทุกประเภทการประเมิน"
            aria-label="ประเภทการประเมิน"
            loading={loadingAssessmentTypes}
            value={draftFilters.assessmentType}
            options={assessmentTypeOptions}
            onChange={(value) => {
              const assessmentType = value ?? "";
              setDraftFilters((current) => ({ ...current, assessmentType }));
              setActiveFilters((current) => ({ ...current, assessmentType }));
              setTablePage(1);
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="ทุกปีที่ประเมิน"
            aria-label="ปีที่ประเมิน"
            value={draftFilters.year}
            options={assessmentYearOptions}
            onChange={(value) => {
              const year = value ?? "";
              setDraftFilters((current) => ({ ...current, year }));
              setActiveFilters((current) => ({ ...current, year }));
              setTablePage(1);
            }}
          />
          <Select placeholder="สถานะการตรวจ" aria-label="สถานะการตรวจ" value={draftFilters.status} options={[{ label: "ยังไม่ตรวจ", value: "pending" }, { label: "ตรวจแล้ว", value: "approved" }]}
            onChange={(status) => {
              setDraftFilters((current) => ({ ...current, status }));
              setActiveFilters((current) => ({ ...current, status }));
              setTablePage(1);
            }} />
          <Button htmlType="submit">ค้นหา</Button>
          <Button onClick={() => {
            setDraftFilters(emptyFilters);
            setActiveFilters(emptyFilters);
            setTablePage(1);
          }}>ล้างตัวกรอง</Button>
        </form>
        <Table
          columns={columns}
          dataSource={filteredApprovalList}
          loading={loadingList}
          locale={{ emptyText: <Empty description="ไม่พบรายการอนุมัติ" /> }}
          pagination={{ current: tablePage, pageSize: 10, showSizeChanger: false, onChange: setTablePage, showTotal: (total) => `ทั้งหมด ${total} ชุด` }}
          rowKey="group_ID"
          scroll={{ x: 980 }}
        />
      </Card>

      <Modal
        centered
        className="approval-detail-modal approval-review-modal"
        footer={
          <div className="approval-review-footer">
            <div className="approval-review-footer-copy">
              <Typography.Text strong>อนุมัติผลการประเมินทั้งชุด</Typography.Text>
              <Typography.Text type="secondary">ตรวจสอบคะแนนและคอมเมนต์ของผู้ประเมิน {details.length} คนก่อนยืนยัน</Typography.Text>
            </div>
            <Space>
              <Button onClick={closeDetail} disabled={saving}>ปิด</Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={saving}
                disabled={!selectedItem || analyzing || loadingDetail || Boolean(detailError) || !details.length || details.length !== selectedItem.submissions.length}
                onClick={saveApproval}
              >
                อนุมัติทั้งหมด {details.length} รายการ
              </Button>
            </Space>
          </div>
        }
        open={Boolean(selectedItem)}
        title={
          <div className="approval-review-heading">
            <span className="approval-review-eyebrow">ตรวจสอบและอนุมัติ</span>
            <span>รายละเอียดผลการประเมิน</span>
          </div>
        }
        width="min(1480px, calc(100vw - 24px))"
        onCancel={closeDetail}
        closable={!saving}
        mask={{ closable: !saving }}
        keyboard={!saving}
      >
        {selectedItem ? (
          <div className="approval-detail">
            <Alert
              title={`ส่งประเมินแล้ว ${selectedItem.submittedCount} จาก ${selectedItem.expectedCount} คน`}
              description={selectedItem.isClosed
                ? "เจ้าหน้าที่ปิดรอบแล้ว ใช้เฉพาะคะแนนของผู้ที่ส่งประเมินจริง"
                : "ได้รับการประเมินครบแล้ว สามารถตรวจสอบและอนุมัติทั้งชุดได้"}
              type="info"
              showIcon
            />

            <Card className="clean-card approval-review-profile" variant="outlined">
              <div className="approval-person-card">
                <Avatar
                  size={64}
                  src={getEmployeePhotoUrl(selectedItem.targetPhoto)}
                  icon={<UserOutlined />}
                />
                <div className="approval-person-copy">
                  <Typography.Text type="secondary">ผู้ถูกประเมิน</Typography.Text>
                  <Typography.Title level={5}>{selectedItem.EVP_TargetName}</Typography.Title>
                  <Typography.Text>
                    {selectedItem.EVP_PositionName} / {selectedItem.EVP_WorkplaceName}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {selectedItem.EVC_Period} ({selectedItem.EVC_Code})
                  </Typography.Text>
                </div>
              </div>
            </Card>

            {detailError ? (
              <Alert
                type="error"
                showIcon
                title={detailError}
                action={<Button onClick={() => openDetail(selectedItem)}>ลองใหม่</Button>}
              />
            ) : null}

            {loadingDetail ? (
              <Card className="clean-card compact-card" variant="outlined">
                <Typography.Text type="secondary">กำลังโหลดรายละเอียด...</Typography.Text>
              </Card>
            ) : null}

            {!loadingDetail && details.length > 0 ? (
              <>
                <div className="approval-score-review-heading">
                  <div>
                    <Typography.Title level={5}>ตรวจสอบคะแนนรายผู้ประเมิน</Typography.Title>
                    <Typography.Text type="secondary">
                      เลือกการ์ดผู้ประเมินเพื่อเปิดดูคะแนนที่ตอบในทุกข้อ
                    </Typography.Text>
                  </div>
                  <Tag className="approval-review-evaluator-count">{details.length} ผู้ประเมิน</Tag>
                </div>

                <Collapse
                  className="approval-review-evaluators"
                  expandIconPlacement="end"
                  accordion
                  items={details.map((submission, index) => ({
                  key: submission.submission_ID,
                  label: (
                    <div className="approval-review-evaluator">
                      <span className="approval-review-index">{String(index + 1).padStart(2, "0")}</span>
                      <Avatar size={34} src={getEmployeePhotoUrl(submission.evaluatorPhoto)} icon={<UserOutlined />} />
                      <div className="approval-review-evaluator-name">
                        <Typography.Text strong>{submission.EVP_EvaluatorName}</Typography.Text>
                        <Typography.Text type="secondary">รหัส {submission.EVP_EvaluatorID}</Typography.Text>
                      </div>
                      <span className="approval-review-score">{calculateTotalScore(submission.answers)} <small>คะแนน</small></span>
                    </div>
                  ),
                  children: (
                <Space orientation="vertical" size={14} className="full-width">
                  {submission.answers.length ? (
                    <div className="approval-answer-list">
                      {mapAnswerRows(submission.answers).map((topic, topicIndex) => (
                        <Card
                          className="clean-card assessment-topic-card"
                          key={topic.LAC_ID}
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
                          <div className="approval-score-table-wrap">
                            <table className="approval-score-table">
                              <thead>
                                <tr>
                                  <th>หัวข้อย่อย</th>
                                  {scoreColumns.map((score) => (
                                    <th key={score}>คะแนน {score}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {topic.questions.map((answer, answerIndex) => (
                                  <tr key={answer.LAQ_ID}>
                                    <td>
                                      {topicIndex + 1}.{answerIndex + 1}{" "}
                                      {answer.LAQ_Text}
                                    </td>
                                    {scoreColumns.map((score) => (
                                      <td key={score}>
                                        {answer.score === score ? (
                                          <CheckCircleOutlined className="approval-score-selected" />
                                        ) : (
                                          <span className="approval-score-empty" />
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty description="ไม่พบคำตอบในรายการนี้" />
                  )}
                </Space>
                  ),
                }))}
                />

                <section className="approval-comment-workbench">

 <div className="approval-combined-comment">
                    <div className="approval-combined-comment-heading">
                      <div>
                        <Typography.Text strong>ความคิดเห็นรวมสำหรับวิเคราะห์</Typography.Text>
                        <Typography.Text type="secondary">
                          รวมความคิดเห็นของผู้ประเมินทุกคนไว้ในข้อความเดียว เจ้าหน้าที่สามารถปรับถ้อยคำก่อนอนุมัติได้
                        </Typography.Text>
                      </div>
                      <Typography.Text type="secondary">
                        {combinedComment.length.toLocaleString("th-TH")} ตัวอักษร
                      </Typography.Text>
                    </div>
                    <Input.TextArea
                      rows={8}
                      className="approval-combined-comment-editor"
                      aria-label="ความคิดเห็นรวมสำหรับวิเคราะห์"
                      value={combinedComment}
                      disabled={saving || analyzing}
                      onChange={(event) => setCombinedComment(event.target.value)}
                      placeholder="ความคิดเห็นของผู้ประเมินทุกคนจะถูกรวมไว้ที่นี่"
                    />

                    <div className="approval-ai-analysis-panel">
                      <div className="approval-ai-analysis-heading">
                        <div className="approval-ai-analysis-title">
                          <span className="approval-ai-analysis-icon" aria-hidden="true">
                            <RobotOutlined />
                          </span>
                          <div>
                            <Typography.Text strong>ผู้ช่วยวิเคราะห์ความคิดเห็น</Typography.Text>
                            <Typography.Text type="secondary">
                              สรุปประเด็นสำคัญและข้อเสนอแนะเป็นภาษาไทย
                            </Typography.Text>
                          </div>
                        </div>
                        <Tag className="approval-ai-model-tag">Gemini 3.5 Flash-Lite</Tag>
                      </div>

                      <div className="approval-ai-analysis-actions">
                        <div className="approval-ai-privacy-note">
                          <SafetyCertificateOutlined />
                          <Typography.Text type="secondary">
                            ส่งเฉพาะความคิดเห็นรวม โปรดลบชื่อและข้อมูลส่วนบุคคลก่อนวิเคราะห์
                          </Typography.Text>
                        </div>
                        <Button
                          type="primary"
                          className="approval-ai-analysis-button"
                          icon={<RobotOutlined />}
                          loading={analyzing}
                          disabled={saving || analyzing || !combinedComment.trim()}
                          onClick={analyzeCombinedComment}
                        >
                          {aiAnalysisText ? "วิเคราะห์ใหม่" : "วิเคราะห์ด้วย Gemini"}
                        </Button>
                      </div>

                      {analysisError ? (
                        <Alert
                          type="error"
                          showIcon
                          title={analysisError}
                          className="approval-ai-analysis-error"
                        />
                      ) : null}

                      <div className="approval-ai-result">
                        <div className="approval-ai-result-heading">
                          <div className="approval-ai-result-title">
                            <span className="approval-ai-result-kicker">AI INSIGHT</span>
                            <div>
                              <Typography.Text strong>ผลการวิเคราะห์</Typography.Text>
                              <Typography.Text type="secondary">ตรวจสอบและแก้ไขได้ก่อนบันทึก</Typography.Text>
                            </div>
                          </div>
                          <span className={`approval-ai-result-status${analyzing ? " is-loading" : aiAnalysisText ? " is-ready" : ""}`}>
                            <span className="approval-ai-result-status-dot" />
                            {analyzing ? "กำลังวิเคราะห์" : aiAnalysisText ? "พร้อมตรวจสอบ" : "รอผลวิเคราะห์"}
                          </span>
                        </div>
                        {aiAnalysisText && !editingAiAnalysis ? (
                          <AiAnalysisSummary value={aiAnalysisText} showHeader={false} />
                        ) : (
                          <Input.TextArea
                            rows={8}
                            className="approval-ai-analysis-editor"
                            aria-label="ผลการวิเคราะห์ด้วย AI"
                            value={aiAnalysisText}
                            disabled={saving || analyzing}
                            onChange={(event) => setAiAnalysisText(event.target.value)}
                            placeholder="ผลจาก Gemini จะแสดงที่นี่..."
                          />
                        )}
                        <div className="approval-ai-analysis-footer">
                          <Typography.Text type="secondary">
                            {aiAnalysisText.length.toLocaleString("th-TH")} ตัวอักษร · บันทึกพร้อมผลการอนุมัติ
                          </Typography.Text>
                          <Space size={8}>
                            <Button
                              size="small"
                              className="approval-ai-edit-button"
                              icon={editingAiAnalysis ? <EyeOutlined /> : <EditOutlined />}
                              disabled={!aiAnalysisText.trim() || saving || analyzing}
                              onClick={() => setEditingAiAnalysis((current) => !current)}
                            >
                              {editingAiAnalysis ? "ดูแบบจัดรูปแบบ" : "แก้ไขข้อความ"}
                            </Button>
                            <Button
                              size="small"
                              className="approval-ai-copy-button"
                              icon={<CopyOutlined />}
                              disabled={!aiAnalysisText.trim()}
                              onClick={copyAiAnalysis}
                            >
                              คัดลอกผล
                            </Button>
                          </Space>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="approval-comment-workbench-heading">
                    <div>
                      <Typography.Title level={5}>ตรวจและแก้ไขความคิดเห็นรวม</Typography.Title>
                      <Typography.Text type="secondary">
                        เปรียบเทียบถ้อยคำของผู้ประเมินทุกคนในจุดเดียว แล้วปรับข้อความก่อนอนุมัติ
                      </Typography.Text>
                    </div>
                    <Tag color="blue">{details.length} ความคิดเห็น</Tag>
                  </div>

                  <div className="approval-comment-workbench-list">
                    {details.map((submission, index) => (
                      <article
                        className="approval-comment-workbench-item"
                        key={submission.submission_ID}
                      >
                        <div className="approval-comment-workbench-person">
                          <span className="approval-review-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Avatar
                            size={38}
                            src={getEmployeePhotoUrl(submission.evaluatorPhoto)}
                            icon={<UserOutlined />}
                          />
                          <div>
                            <Typography.Text strong>{submission.EVP_EvaluatorName}</Typography.Text>
                            <Typography.Text type="secondary">
                              รหัส {submission.EVP_EvaluatorID}
                            </Typography.Text>
                          </div>
                          {submission.comment_HrConfirm ? (
                            <Tag color="cyan">เคยปรับแก้</Tag>
                          ) : null}
                        </div>

                        <div className="approval-comment-original-copy">
                          <Typography.Text strong>ข้อความต้นฉบับ</Typography.Text>
                          <Typography.Paragraph>
                            {getCommentPreview(
                              submission.comment,
                              expandedComments[submission.submission_ID],
                            )}
                          </Typography.Paragraph>
                          {String(submission.comment || "").trim().length > commentPreviewLength ? (
                            <Button
                              type="link"
                              size="small"
                              className="approval-comment-expand-button"
                              aria-expanded={Boolean(expandedComments[submission.submission_ID])}
                              onClick={() => setExpandedComments((current) => ({
                                ...current,
                                [submission.submission_ID]: !current[submission.submission_ID],
                              }))}
                            >
                              {expandedComments[submission.submission_ID]
                                ? "แสดงน้อยลง"
                                : "แสดงเพิ่มเติม"}
                            </Button>
                          ) : null}
                        </div>

                        <div className={`approval-comment-editor-disclosure${expandedApprovalEditors[submission.submission_ID] ? " is-open" : ""}`}>
                          <button
                            type="button"
                            className="approval-comment-editor-toggle"
                            aria-expanded={Boolean(expandedApprovalEditors[submission.submission_ID])}
                            aria-controls={`approval-comment-editor-${submission.submission_ID}`}
                            disabled={saving}
                            onClick={() => setExpandedApprovalEditors((current) => ({
                              ...current,
                              [submission.submission_ID]: !current[submission.submission_ID],
                            }))}
                          >
                            <span className="approval-comment-editor-toggle-copy">
                              <span className="approval-comment-editor-toggle-icon"><EditOutlined /></span>
                              <span>
                                <strong>ข้อความสำหรับอนุมัติ</strong>
                                <small>เปิดเพื่อตรวจสอบหรือปรับถ้อยคำก่อนอนุมัติ</small>
                              </span>
                            </span>
                            <DownOutlined className="approval-comment-editor-chevron" />
                          </button>

                          {expandedApprovalEditors[submission.submission_ID] ? (
                            <div
                              id={`approval-comment-editor-${submission.submission_ID}`}
                              className="approval-comment-editor-body"
                            >
                              <Input.TextArea
                                rows={5}
                                className="approval-review-editor"
                                aria-label={`แก้ไขคอมเมนต์ของ ${submission.EVP_EvaluatorName}`}
                                value={editedComments[submission.submission_ID] ?? ""}
                                disabled={saving}
                                onChange={(event) => setEditedComments((current) => ({
                                  ...current,
                                  [submission.submission_ID]: event.target.value,
                                }))}
                                placeholder="แก้ไขถ้อยคำโดยคงเจตนาของผู้ประเมินไว้"
                              />
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>

                 
                </section>
              </>
            ) : null}


          </div>
        ) : null}
      </Modal>
    </PagePanel>
  );
}
