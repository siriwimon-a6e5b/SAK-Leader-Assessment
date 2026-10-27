import {
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
import apiClient from "../../recoilstore/userStores";
import PagePanel from "../components/PagePanel";
import AiAnalysisSummary from "../components/AiAnalysisSummary";

const ROUNDS_API = "/api/insurances/getAssessmentDashboardRounds";
const REGIONAL_SCORES_API = "/api/insurances/getUserRegionalAssessmentScores";

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

function toBuddhistYear(value) {
  const year = Number(value);

  if (!Number.isFinite(year)) return value || "-";
  if (year >= 2400) return String(year);

  return String(year + 543);
}

function formatScore(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) return "-";

  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
}

function formatPercent(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) return "0%";

  return `${Number.isInteger(numberValue) ? numberValue : numberValue.toFixed(2)}%`;
}

function plainText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function getSelectOptions(rows, getValue) {
  return Array.from(
    new Set(rows.map(getValue).map(plainText).filter(Boolean)),
  )
    .sort((a, b) => a.localeCompare(b, "th"))
    .map((value) => ({ label: value, value }));
}

function mapRound(row = {}) {
  return {
    EVC_Code: row.EVC_Code || row.code || "",
    EVC_Period: row.EVC_Period || "-",
    EVC_detail: row.EVC_detail || "",
    EVC_Year: String(row.EVC_Year || row.year || ""),
    EVT_Name: row.EVT_Name || "-",
  };
}

function getWorkplaceKey(row = {}) {
  return row.workplaceCode || row.workplace || row.department || "unknown";
}

function getWorkplaceName(row = {}) {
  return row.workplace || row.department || "ไม่ระบุสาขา/หน่วย";
}

function groupRowsByWorkplace(rows = []) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = getWorkplaceKey(row);
    const current = groups.get(key) || {
      key,
      name: getWorkplaceName(row),
      belong: row.belong || "",
      rows: [],
      averagePercent: 0,
      submittedCount: 0,
      expectedEvaluators: 0,
    };

    current.rows.push(row);
    current.submittedCount += Number(row.submittedCount || 0);
    current.expectedEvaluators += Number(row.expectedEvaluators || 0);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((group) => {
      const scoredRows = group.rows.filter((row) => Number(row.percent) > 0);
      const averagePercent = scoredRows.length
        ? scoredRows.reduce((sum, row) => sum + Number(row.percent || 0), 0) / scoredRows.length
        : 0;

      return {
        ...group,
        averagePercent,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export default function UserRegionalScorePage({
  eyebrow = "Area Scores",
  title = "คะแนนในพื้นที่",
  description = "ดูคะแนนหัวหน้าผู้ถูกประเมิน แยกตามสาขา/หน่วย ภายใต้สิทธิ์พื้นที่ของผู้ใช้งาน",
}) {
  const [form] = Form.useForm();
  const [rounds, setRounds] = useState([]);
  const [reportData, setReportData] = useState({ round: null, rows: [] });
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadError, setLoadError] = useState("");

  const canFilterAllAreas = false;

  const years = useMemo(
    () =>
      Array.from(new Set(rounds.map((round) => round.EVC_Year)))
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a)),
    [rounds],
  );
  const selectedYear = Form.useWatch("EVC_Year", form);
  const roundOptions = useMemo(
    () => rounds.filter((round) => !selectedYear || round.EVC_Year === selectedYear),
    [rounds, selectedYear],
  );
  const selectedBelong = Form.useWatch("belong", form);
  const selectedWorkplace = Form.useWatch("workplace", form);
  const selectedDepartment = Form.useWatch("department", form);
  const belongOptions = useMemo(
    () => getSelectOptions(reportData.rows, (row) => row.belong),
    [reportData.rows],
  );
  const workplaceOptions = useMemo(
    () =>
      getSelectOptions(
        reportData.rows.filter((row) => !selectedBelong || plainText(row.belong) === selectedBelong),
        (row) => row.workplace,
      ),
    [reportData.rows, selectedBelong],
  );
  const departmentOptions = useMemo(
    () =>
      getSelectOptions(
        reportData.rows.filter((row) => {
          if (selectedBelong && plainText(row.belong) !== selectedBelong) return false;
          if (selectedWorkplace && plainText(row.workplace) !== selectedWorkplace) return false;
          return true;
        }),
        (row) => row.department,
      ),
    [reportData.rows, selectedBelong, selectedWorkplace],
  );
  const filteredRows = useMemo(
    () =>
      reportData.rows.filter((row) => {
        if (selectedBelong && plainText(row.belong) !== selectedBelong) return false;
        if (selectedWorkplace && plainText(row.workplace) !== selectedWorkplace) return false;
        if (selectedDepartment && plainText(row.department) !== selectedDepartment) return false;
        return true;
      }),
    [reportData.rows, selectedBelong, selectedWorkplace, selectedDepartment],
  );
  const groupedRows = useMemo(() => groupRowsByWorkplace(filteredRows), [filteredRows]);
  const previewRows = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        ...row,
        index: index + 1,
        key: `${row.employeeCode}-${index}`,
      })),
    [filteredRows],
  );

  const columns = [
    { title: "ลำดับ", dataIndex: "index", width: 70, fixed: "left" },
    { title: "รหัสพนักงาน", dataIndex: "employeeCode", width: 120 },
    { title: "ชื่อ-นามสกุล", dataIndex: "employeeName", width: 220 },
    { title: "ตำแหน่ง", dataIndex: "position", width: 220 },
    { title: "สาขา/หน่วย", dataIndex: "workplace", width: 180 },
    { title: "เขต/ฝ่าย", dataIndex: "belong", width: 180, render: (value) => value || "-" },
    { title: "คะแนนรวม", dataIndex: "averageScore", width: 100, render: formatScore },
    { title: "ร้อยละ", dataIndex: "percent", width: 100, render: formatPercent },
    { title: "เกรด", dataIndex: "grade", width: 80, render: (value) => value || "-" },
    {
      title: "วิเคราะห์ภาพรวมความคิดเห็น",
      dataIndex: "aiAnalysis",
      width: 340,
      render: (value) => value ? <AiAnalysisSummary value={value} compact showHeader={false} /> : "-",
    },
    {
      title: "ผู้ประเมิน",
      dataIndex: "submittedCount",
      width: 130,
      render: (_, row) => `${row.submittedCount || 0}/${row.expectedEvaluators || 0}`,
    },
  ];

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

  const loadReport = async () => {
    const values = await form.validateFields();

    setLoadingReport(true);
    setLoadError("");

    try {
      const response = await apiClient.get(REGIONAL_SCORES_API, {
        params: {
          EVC_Code: values.EVC_Code,
          EVC_Year: values.EVC_Year,
        },
      });
      const result = getApiResult(response.data);

      setReportData({
        round: result.round || null,
        rows: Array.isArray(result.rows) ? result.rows : [],
      });
    } catch (error) {
      console.error(error);
      setLoadError(error?.response?.data?.message || error?.message || "โหลดคะแนนในพื้นที่ไม่สำเร็จ");
      setReportData({ round: null, rows: [] });
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    // Load the initial round list once when this report page is opened.
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
            <Col xs={24} md={7} xl={3}>
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
                      belong: undefined,
                      workplace: undefined,
                      department: undefined,
                    });
                    setReportData({ round: null, rows: [] });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={11} xl={canFilterAllAreas ? 6 : 8}>
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
                      belong: undefined,
                      workplace: undefined,
                      department: undefined,
                    });
                    setReportData({ round: null, rows: [] });
                  }}
                />
              </Form.Item>
            </Col>
            {canFilterAllAreas ? (
              <Col xs={24} md={8} xl={4}>
                <Form.Item label="เขต/ฝ่าย" name="belong">
                  <Select
                    allowClear
                    showSearch
                    disabled={!reportData.rows.length}
                    optionFilterProp="label"
                    options={belongOptions}
                    placeholder="ทั้งหมด"
                    onChange={() => {
                      form.setFieldsValue({
                        workplace: undefined,
                        department: undefined,
                      });
                    }}
                  />
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24} md={8} xl={canFilterAllAreas ? 4 : 5}>
              <Form.Item label="สาขา/หน่วย" name="workplace">
                <Select
                  allowClear
                  showSearch
                  disabled={!reportData.rows.length}
                  optionFilterProp="label"
                  options={workplaceOptions}
                  placeholder="ทั้งหมด"
                  onChange={() => form.setFieldValue("department", undefined)}
                />
              </Form.Item>
            </Col>
            {canFilterAllAreas ? (
              <Col xs={24} md={8} xl={4}>
                <Form.Item label="ฝ่าย" name="department">
                  <Select
                    allowClear
                    showSearch
                    disabled={!reportData.rows.length}
                    optionFilterProp="label"
                    options={departmentOptions}
                    placeholder="ทั้งหมด"
                  />
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24} md={canFilterAllAreas ? 8 : 6} xl={canFilterAllAreas ? 3 : 8}>
              <Space className="assessment-export-actions" wrap={false}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={loadingReport}
                >
                  แสดงข้อมูล
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadRounds} loading={loadingRounds}>
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
            <span>ตัวอย่างข้อมูลคะแนนในพื้นที่</span>
            {reportData.round?.EVC_Code ? <Tag color="blue">{reportData.round.EVC_Code}</Tag> : null}
          </Space>
        }
        variant="outlined"
      >
        {reportData.rows.length ? (
          <>
            <Typography.Paragraph type="secondary">
              พบข้อมูล {filteredRows.length} จาก {reportData.rows.length} รายการ และสาขา/หน่วย {groupedRows.length} แห่ง
            </Typography.Paragraph>
            <Table
              size="small"
              columns={columns}
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
