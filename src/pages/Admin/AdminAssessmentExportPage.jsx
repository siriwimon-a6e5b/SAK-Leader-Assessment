import {
  DownloadOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient, { readCurrentUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import PagePanel from "../components/PagePanel";
import AiAnalysisSummary from "../components/AiAnalysisSummary";

const ROUNDS_API = "/getAssessmentDashboardRounds";
const EXPORT_REPORT_API = "/getAssessmentExportReport";

function getApiRows(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.rounds)) return result.rounds;
  if (Array.isArray(result?.data)) return result.data;

  return [];
}

function getApiResult(data) {
  return data?.result ?? data?.data ?? data ?? {};
}

function toNumber(value, fallback = null) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatScore(value) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "-";

  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
}

function formatPercent(value) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "-";

  const displayValue = Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);

  return `${displayValue}%`;
}

function text(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function plainText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function toBuddhistYear(value) {
  const yearText = plainText(value);
  const yearNumber = Number(yearText);

  if (!Number.isFinite(yearNumber)) return yearText;
  if (yearNumber >= 2400) return String(yearNumber);

  return String(yearNumber + 543);
}

function sanitizeFileName(value) {
  return plainText(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRoundCode(round = {}) {
  return round.EVC_Code || round.code || "";
}

function getRoundYear(round = {}) {
  return String(round.EVC_Year || round.year || "");
}

function getRoundDisplayName(round = {}) {
  return [
    round.EVC_Period,
    round.EVC_detail || round.EVT_Name,
  ]
    .map(plainText)
    .filter(Boolean)
    .join(" - ");
}

function mapRound(row = {}) {
  return {
    EVC_ID: row.EVC_ID || "",
    EVC_Code: getRoundCode(row),
    EVC_Period: row.EVC_Period || "-",
    EVC_detail: row.EVC_detail || "",
    EVC_Year: getRoundYear(row),
    EVT_Name: row.EVT_Name || "-",
  };
}

function getTopicValue(row, topicId) {
  const topic = row.topicScores?.find((item) => String(item.LAC_ID) === String(topicId));

  if (!topic || topic.averageScore === null || topic.averageScore === undefined) return "-";

  return `${formatScore(topic.averageScore)} (${topic.answerCount || 0})`;
}

function getAreaKey(row = {}, type) {
  if (type === "belong") return plainText(row.belongId || row.belong);
  if (type === "branch") return plainText(row.branchCode || row.branchName);
  if (type === "workplace") {
    return plainText(row.workplaceCode || row.workplace || row.department);
  }

  return "";
}

function makeAreaValue(type, key) {
  return `${type}:${key}`;
}

function getWorkplaceAreaOptions(rows = []) {
  const groups = {
    belong: new Map(),
    branch: new Map(),
    workplace: new Map(),
  };

  rows.forEach((row) => {
    const belongKey = getAreaKey(row, "belong");
    const belongLabel = plainText(row.belong);
    const branchKey = getAreaKey(row, "branch");
    const branchLabel = plainText(row.branchName);
    const workplaceKey = getAreaKey(row, "workplace");
    const workplaceLabel = plainText(row.workplace || row.department);

    if (belongKey && belongLabel) groups.belong.set(belongKey, belongLabel);
    if (branchKey && branchKey !== "0" && branchLabel) {
      groups.branch.set(branchKey, branchLabel);
    }
    if (workplaceKey && workplaceLabel) {
      groups.workplace.set(workplaceKey, workplaceLabel);
    }
  });

  const makeOptions = (type) => Array.from(groups[type], ([key, label]) => ({
    label,
    value: makeAreaValue(type, key),
  })).sort((a, b) => a.label.localeCompare(b.label, "th"));
  const optionGroups = [
    { label: "เขต / ฝ่าย", options: makeOptions("belong") },
    { label: "สาขา", options: makeOptions("branch") },
    { label: "หน่วย", options: makeOptions("workplace") },
  ];

  return optionGroups.filter((group) => group.options.length);
}

function matchesWorkplaceArea(row = {}, selectedArea = "") {
  const separatorIndex = selectedArea.indexOf(":");
  if (separatorIndex < 1) return true;

  const type = selectedArea.slice(0, separatorIndex);
  const key = selectedArea.slice(separatorIndex + 1);

  return getAreaKey(row, type) === key;
}

function getBusinessRegion(row = {}) {
  const regionId = plainText(row.regionId || row.region_id || row.regionID);

  if (["1", "2", "3", "4", "5", "6"].includes(regionId)) return regionId;

  const value = plainText(row.belong || row.businessRegion || row.region);

  if (!value) return "";
  if (value.includes("สำนักงานใหญ่") || value.includes("สํานักงานใหญ่")) return "6";
  if (value.toLowerCase().includes("region 6")) return "6";

  const regionMatch = value.match(/[ภผ]าค\s*([1-6])/);
  if (regionMatch?.[1]) return regionMatch[1];

  const numberMatch = value.match(/\b([1-6])\b/);
  if (!numberMatch?.[1]) return "";

  return numberMatch[1];
}

const businessRegionOptions = [
  { label: "ภาคธุรกิจ 1", value: "1" },
  { label: "ภาคธุรกิจ 2", value: "2" },
  { label: "ภาคธุรกิจ 3", value: "3" },
  { label: "สำนักงานใหญ่", value: "6" },
];

function getPositionLevel(value) {
  const levelText = readTokenValue(value).replace(/\D/g, "");
  const level = Number(levelText);

  return Number.isFinite(level) ? level : 0;
}

function getBusinessRegionOption(value) {
  const region = readTokenValue(value).replace(/\D/g, "");

  if (!["1", "2", "3", "4", "5", "6"].includes(region)) return null;

  return {
    label: region === "6" ? "สำนักงานใหญ่" : `ภาคธุรกิจ ${region}`,
    value: region,
  };
}

function buildExportRows(rows = [], topics = []) {
  return rows.map((row, index) => {
    const baseRow = {
      "ลำดับ": index + 1,
      "รหัสพนักงาน": text(row.employeeCode),
      "ชื่อ-นามสกุล (ผู้รับการประเมินผล)": text(row.employeeName),
      "ชื่อเล่น": text(row.nickname),
      "ตำแหน่ง": text(row.position),
      "สังกัด": text(row.workplace || row.department),
      "ภาค/สำนักงานใหญ่": text(row.belong),
      "คะแนนรวม": formatScore(row.averageScore),
      "ร้อยละ": formatPercent(row.percent),
      "เกรด": text(row.grade),
      "ชื่อ-นามสกุล (ผู้ประเมินผล)": text(row.evaluatorNames),
      "จำนวนผู้ประเมินที่ส่งแล้ว": text(row.submittedCount),
      "จำนวนผู้ประเมินทั้งหมด": text(row.expectedEvaluators),
      "ชี้แจงการให้คะแนน": text(row.comments),
      "ความคิดเห็นที่วิเคราะห์แล้ว (EVP_AIAnalysis)": text(row.aiAnalysis),
      "ไม่ชี้แจง เนื่องจาก": text(row.notScoredReason),
    };

    topics.forEach((topic) => {
      baseRow[`${topic.LAC_Name} (คะแนนเฉลี่ย/จำนวนคำตอบ)`] = getTopicValue(row, topic.LAC_ID);
    });

    return baseRow;
  });
}

function downloadExcelFile({ rows, topics, round }) {
  const exportRows = buildExportRows(rows, topics);
  const headers = Object.keys(exportRows[0] || {
    "ลำดับ": "",
    "รหัสพนักงาน": "",
    "ชื่อ-นามสกุล (ผู้รับการประเมินผล)": "",
  });

  const reportYear = toBuddhistYear(round?.EVC_Year);
  const roundDisplayName = getRoundDisplayName(round);
  const reportTitle = `รายงานสรุปการประเมินผลการปฏิบัติงาน ประจำปี ${text(reportYear)}`;
  const downloadName = sanitizeFileName(
    `รายงานผลประเมิน ${roundDisplayName || round?.EVC_Code || "report"} ปี ${reportYear}`,
  );
  const mergeAcross = Math.max(headers.length - 1, 0);
  const makeCell = (value, style = "Text") => (
    `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeHtml(value)}</Data></Cell>`
  );
  const makeMergedCell = (value, style = "Text") => (
    `<Cell ss:StyleID="${style}" ss:MergeAcross="${mergeAcross}"><Data ss:Type="String">${escapeHtml(value)}</Data></Cell>`
  );
  const headerRow = `<Row ss:AutoFitHeight="0" ss:Height="18">${headers.map((header) => makeCell(header, "Header")).join("")}</Row>`;
  const bodyRows = exportRows
    .map((row) => (
      `<Row ss:AutoFitHeight="0" ss:Height="18">${headers.map((header) => makeCell(row[header], "Text")).join("")}</Row>`
    ))
    .join("");
  const columns = headers
    .map((header) => {
      const width = Math.min(Math.max(String(header).length * 7, 54), 210);
      return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40"
>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="TH Sarabun New" ss:Size="16"/>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="TH Sarabun New" ss:Size="16" ss:Bold="1"/>
    </Style>
    <Style ss:ID="Meta">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="TH Sarabun New" ss:Size="16"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="TH Sarabun New" ss:Size="16" ss:Bold="1"/>
    </Style>
    <Style ss:ID="Text">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="TH Sarabun New" ss:Size="16"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Assessment Export">
    <Table ss:DefaultRowHeight="18">
      ${columns}
      <Row ss:AutoFitHeight="0" ss:Height="18">${makeMergedCell("บริษัท ศักดิ์สยามลิสซิ่ง จำกัด (มหาชน)", "Title")}</Row>
      <Row ss:AutoFitHeight="0" ss:Height="18">${makeMergedCell(reportTitle, "Title")}</Row>
      <Row ss:AutoFitHeight="0" ss:Height="18">${makeMergedCell(`รอบประเมิน: ${text(roundDisplayName || "-")}`, "Meta")}</Row>
      ${headerRow}
      ${bodyRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <DisplayGridlines/>
      <Selected/>
      <Panes>
        <Pane>
          <Number>3</Number>
          <ActiveRow>0</ActiveRow>
          <ActiveCol>0</ActiveCol>
        </Pane>
      </Panes>
    </WorksheetOptions>
  </Worksheet>
</Workbook>
  `;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${downloadName || "รายงานผลประเมิน"}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminAssessmentExportPage({
  eyebrow = "Assessment Export",
  title = "ส่งออกรายงานผลประเมิน",
  description = "เลือกรอบและปีที่ประเมินเพื่อส่งออกคะแนนรายหัวข้อของหัวหน้าผู้ถูกประเมินเป็นไฟล์ Excel",
  reportApi = EXPORT_REPORT_API,
  isUserPage = false,
}) {
  const [form] = Form.useForm();
  const userDetail = readCurrentUserDetail();
  const positionLevel = getPositionLevel(userDetail?.PerPST_LV);
  const isBusinessRegionLocked = isUserPage && positionLevel > 3;
  const userBusinessRegionOption = getBusinessRegionOption(userDetail?.PerRG);
  const lockedBusinessRegion = isBusinessRegionLocked
    ? userBusinessRegionOption?.value
    : undefined;
  const showBusinessRegion = true;
  const [rounds, setRounds] = useState([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reportData, setReportData] = useState({ round: null, topics: [], rows: [] });

  const years = useMemo(
    () => Array.from(new Set(rounds.map((round) => round.EVC_Year))).filter(Boolean).sort((a, b) => Number(b) - Number(a)),
    [rounds],
  );
  const selectedYear = Form.useWatch("EVC_Year", form);
  const selectedRoundCode = Form.useWatch("EVC_Code", form);
  const selectedWorkplaceArea = Form.useWatch("workplaceArea", form);
  const selectedBusinessRegion = Form.useWatch("businessRegion", form);
  const roundOptions = useMemo(
    () => rounds.filter((round) => !selectedYear || round.EVC_Year === selectedYear),
    [rounds, selectedYear],
  );
  const selectedRound = rounds.find((round) => round.EVC_Code === selectedRoundCode);
  const workplaceAreaOptions = useMemo(
    () => getWorkplaceAreaOptions(
      reportData.rows.filter((row) => (
        !(lockedBusinessRegion || selectedBusinessRegion)
        || getBusinessRegion(row) === (lockedBusinessRegion || selectedBusinessRegion)
      )),
    ),
    [reportData.rows, selectedBusinessRegion, lockedBusinessRegion],
  );
  const filteredRows = useMemo(
    () =>
      reportData.rows.filter((row) => {
        if (lockedBusinessRegion && getBusinessRegion(row) !== lockedBusinessRegion) {
          return false;
        }
        if (selectedWorkplaceArea && !matchesWorkplaceArea(row, selectedWorkplaceArea)) {
          return false;
        }

        if (!isBusinessRegionLocked && selectedBusinessRegion && getBusinessRegion(row) !== selectedBusinessRegion) {
          return false;
        }

        return true;
      }),
    [reportData.rows, selectedWorkplaceArea, selectedBusinessRegion, isBusinessRegionLocked, lockedBusinessRegion],
  );

  const previewColumns = useMemo(() => {
    const columns = [
      { title: "ลำดับ", dataIndex: "index", width: 70, fixed: "left" },
      { title: "รหัสพนักงาน", dataIndex: "employeeCode", width: 120 },
      { title: "ชื่อ-นามสกุล", dataIndex: "employeeName", width: 220 },
      { title: "ตำแหน่ง", dataIndex: "position", width: 180 },
      { title: "สังกัด", dataIndex: "workplace", width: 180 },
      {
        title: "คะแนนรวม",
        dataIndex: "averageScore",
        width: 100,
        render: formatScore,
      },
      {
        title: "ร้อยละ",
        dataIndex: "percent",
        width: 90,
        render: formatPercent,
      },
      { title: "เกรด", dataIndex: "grade", width: 80 },
      { title: "ผู้ประเมินผล", dataIndex: "evaluatorNames", width: 260, render: text },
      {
        title: "ความคิดเห็นที่วิเคราะห์แล้ว",
        dataIndex: "aiAnalysis",
        width: 360,
        render: (value) => value ? <AiAnalysisSummary value={value} compact showHeader={false} /> : "-",
      },
    ];

    reportData.topics.forEach((topic) => {
      columns.push({
        title: topic.LAC_Name,
        dataIndex: `topic_${topic.LAC_ID}`,
        width: 180,
        render: (_, row) => getTopicValue(row, topic.LAC_ID),
      });
    });

    return columns;
  }, [reportData.topics]);

  const previewRows = useMemo(
    () => filteredRows.map((row, index) => ({ ...row, index: index + 1, key: `${row.employeeCode}-${index}` })),
    [filteredRows],
  );

  const loadRounds = useCallback(async () => {
    setLoadingRounds(true);
    setLoadError("");

    try {
      const response = await apiClient.get(ROUNDS_API);
      const nextRounds = getApiRows(response.data).map(mapRound).filter((round) => round.EVC_Code);

      setRounds(nextRounds);

      if (nextRounds.length) {
        form.setFieldsValue({
          EVC_Year: form.getFieldValue("EVC_Year") || nextRounds[0].EVC_Year,
          EVC_Code: form.getFieldValue("EVC_Code") || nextRounds[0].EVC_Code,
        });
      }
    } catch (error) {
      console.error(error);
      setLoadError(error?.response?.data?.message || error?.message || "โหลดรอบประเมินไม่สำเร็จ");
      setRounds([]);
    } finally {
      setLoadingRounds(false);
    }
  }, [form]);

  const handleReloadRounds = () => {
    form.setFieldsValue({
      workplaceArea: undefined,
      businessRegion: undefined,
    });
    loadRounds();
  };

  const loadReport = async () => {
    const values = await form.validateFields();
    setLoadingReport(true);
    setLoadError("");

    try {
      const response = await apiClient.get(reportApi, {
        params: {
          EVC_Year: values.EVC_Year,
          EVC_Code: values.EVC_Code,
        },
      });
      const result = getApiResult(response.data);

      setReportData({
        round: result.round || selectedRound || null,
        topics: Array.isArray(result.topics) ? result.topics : [],
        rows: Array.isArray(result.rows) ? result.rows : [],
      });
    } catch (error) {
      console.error(error);
      setLoadError(error?.response?.data?.message || error?.message || "โหลดข้อมูลรายงานไม่สำเร็จ");
      setReportData({ round: null, topics: [], rows: [] });
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRounds();
  }, [loadRounds]);

  return (
    <PagePanel
      className="assessment-export-page"
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      {loadError ? (
        <Alert
          className="assessment-success-alert"
          type="warning"
          title="โหลดข้อมูลไม่สำเร็จ"
          description={loadError}
          showIcon
        />
      ) : null}

      <Card className="clean-card assessment-export-filter-card" variant="outlined">
        <Form form={form} layout="vertical" onFinish={loadReport}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={8} xl={3}>
              <Form.Item
                label="ปีที่ประเมิน"
                name="EVC_Year"
                rules={[{ required: true, message: "กรุณาเลือกปีที่ประเมิน" }]}
              >
                <Select
                  loading={loadingRounds}
                  options={years.map((year) => ({ label: toBuddhistYear(year), value: year }))}
                  placeholder="เลือกปี"
                  onChange={() => {
                    form.setFieldValue("EVC_Code", undefined);
                    form.setFieldsValue({
                      workplaceArea: undefined,
                      businessRegion: undefined,
                    });
                    setReportData({ round: null, topics: [], rows: [] });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10} xl={showBusinessRegion ? 6 : 9}>
              <Form.Item
                label="รอบการประเมิน"
                name="EVC_Code"
                rules={[{ required: true, message: "กรุณาเลือกรอบการประเมิน" }]}
              >
                <Select
                  loading={loadingRounds}
                  options={roundOptions.map((round) => ({
                    label: `${round.EVC_Period} - ${round.EVC_detail || round.EVT_Name}`,
                    value: round.EVC_Code,
                  }))}
                  placeholder="เลือกรอบ"
                  onChange={() => {
                    form.setFieldsValue({
                      workplaceArea: undefined,
                      businessRegion: undefined,
                    });
                    setReportData({ round: null, topics: [], rows: [] });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item label="สาขา/หน่วย / เขต / ฝ่าย" name="workplaceArea">
                <Select
                  allowClear
                  showSearch
                  disabled={!reportData.rows.length}
                  optionFilterProp="label"
                  options={workplaceAreaOptions}
                  placeholder="ทั้งหมด"
                />
              </Form.Item>
            </Col>
            {showBusinessRegion ? (
              <Col xs={24} md={6} xl={3}>
                {isBusinessRegionLocked ? (
                  <Form.Item label="ภาคธุรกิจ">
                    <Select
                      value={lockedBusinessRegion}
                      disabled
                      options={userBusinessRegionOption ? [userBusinessRegionOption] : []}
                    />
                  </Form.Item>
                ) : (
                <Form.Item label="ภาคธุรกิจ" name="businessRegion">
                  <Select
                    allowClear
                    showSearch
                    disabled={!reportData.rows.length}
                    optionFilterProp="label"
                    options={businessRegionOptions}
                    placeholder="ทั้งหมด"
                    onChange={() => form.setFieldValue("workplaceArea", undefined)}
                  />
                </Form.Item>
                )}
              </Col>
            ) : null}
            <Col xs={24} md={12} xl={6}>
              <Space className="assessment-export-actions" wrap={false}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={loadingReport}
                >
                  แสดงข้อมูล
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReloadRounds}
                  loading={loadingRounds}
                >
                  โหลดรอบใหม่
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        className="clean-card assessment-export-table-card"
        title={
          <Space size={10} wrap>
            <FileExcelOutlined />
            <span>ตัวอย่างข้อมูลก่อน Export</span>
            {reportData.round ? <Tag color="blue">{reportData.round.EVC_Code}</Tag> : null}
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!filteredRows.length}
            onClick={() => downloadExcelFile({ ...reportData, rows: filteredRows })}
          >
            Export Excel
          </Button>
        }
        variant="outlined"
      >
        {reportData.rows.length ? (
          <>
            <Typography.Paragraph type="secondary">
              พบข้อมูล {filteredRows.length} จาก {reportData.rows.length} รายการ และหัวข้อประเมิน {reportData.topics.length} หัวข้อ
            </Typography.Paragraph>
            <Table
              size="small"
              columns={previewColumns}
              dataSource={previewRows}
              pagination={{ pageSize: 20 }}
              scroll={{ x: "max-content" }}
            />
          </>
        ) : (
          <Empty description="กรุณาเลือกปีและรอบประเมินเพื่อแสดงข้อมูล" />
        )}
      </Card>
    </PagePanel>
  );
}
