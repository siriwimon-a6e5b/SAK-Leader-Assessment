import {
  CheckCircleOutlined,
  CommentOutlined,
  EditOutlined,
  EyeOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import PagePanel, { MetricCard } from "../components/PagePanel";
import { assessmentApprovalItems } from "./adminAssessmentData";

const statusOptions = [
  { label: "ทั้งหมด", value: "all" },
  { label: "รอตรวจ", value: "รอตรวจ" },
  { label: "แก้ไขคอมเมนต์แล้ว", value: "แก้ไขคอมเมนต์แล้ว" },
  { label: "อนุมัติแล้ว", value: "อนุมัติแล้ว" },
];

function getAverageScore(item) {
  const scores = item.answers.flatMap((topic) =>
    topic.children.map((child) => child.score),
  );
  const total = scores.reduce((sum, score) => sum + score, 0);
  return (total / scores.length).toFixed(2);
}

export default function AdminApprovalPage() {
  const [approvalItems, setApprovalItems] = useState(assessmentApprovalItems);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editedComment, setEditedComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const summary = useMemo(
    () => ({
      total: approvalItems.length,
      pending: approvalItems.filter((item) => item.status !== "อนุมัติแล้ว").length,
      approved: approvalItems.filter((item) => item.status === "อนุมัติแล้ว").length,
    }),
    [approvalItems],
  );
  const filteredApprovalItems = useMemo(
    () =>
      selectedStatus === "all"
        ? approvalItems
        : approvalItems.filter((item) => item.status === selectedStatus),
    [approvalItems, selectedStatus],
  );

  const openDetail = (item) => {
    setSelectedItem(item);
    setEditedComment(item.editedComment || item.originalComment);
  };

  const updateSelectedItem = (nextValues) => {
    setApprovalItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id ? { ...item, ...nextValues } : item,
      ),
    );
    setSelectedItem((prev) => ({ ...prev, ...nextValues }));
  };

  const handleSaveComment = () => {
    updateSelectedItem({
      editedComment,
      status: "แก้ไขคอมเมนต์แล้ว",
      statusColor: "processing",
    });
  };

  const handleApprove = () => {
    updateSelectedItem({
      editedComment,
      status: "อนุมัติแล้ว",
      statusColor: "success",
    });
  };

  const columns = [
    {
      title: "ผู้ประเมิน",
      key: "evaluator",
      render: (_, row) => (
        <Space size={12}>
          <span className="approval-table-icon">
            <UserOutlined />
          </span>
          <div>
            <Typography.Text strong>{row.evaluatorName}</Typography.Text>
            <div>
              <Typography.Text type="secondary">
                {row.evaluatorCode} / {row.evaluatorDepartment}
              </Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "ประเมินหัวหน้า",
      key: "supervisor",
      render: (_, row) => (
        <div>
          <Typography.Text>{row.supervisorName}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.supervisorPosition}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "รอบ/วันที่ส่ง",
      key: "round",
      render: (_, row) => (
        <div>
          <Typography.Text>{row.round}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{row.submittedAt}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "คะแนนเฉลี่ย",
      key: "score",
      align: "center",
      render: (_, row) => <Tag color="blue">{getAverageScore(row)}/4</Tag>,
    },
    {
      title: "สถานะ",
      key: "status",
      render: (_, row) => <Tag color={row.statusColor}>{row.status}</Tag>,
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, row) => (
        <Button icon={<EyeOutlined />} onClick={() => openDetail(row)}>
          ตรวจสอบ
        </Button>
      ),
    },
  ];

  return (
    <PagePanel
      eyebrow="Approval Queue"
      title="อนุมัติผลการประเมิน"
      description="ตรวจสอบรายการที่พนักงานส่งมา แก้ไขคอมเมนต์ที่ไม่เหมาะสม และอนุมัติรับทราบผลก่อนเผยแพร่"
      showBack={false}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="รายการทั้งหมด" value={`${summary.total} รายการ`} detail="รอบประเมินปัจจุบัน" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="รอตรวจ/แก้ไข" value={`${summary.pending} รายการ`} detail="ยังไม่อนุมัติ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="อนุมัติแล้ว" value={`${summary.approved} รายการ`} detail="พร้อมแจ้งเตือนพนักงาน" />
        </Col>
      </Row>

      <Card
        className="clean-card admin-table-card"
        title="รายการรออนุมัติผลการประเมิน"
        extra={
          <Select
            className="approval-status-select"
            value={selectedStatus}
            options={statusOptions}
            onChange={setSelectedStatus}
          />
        }
        variant="outlined"
      >
        <Table
          columns={columns}
          dataSource={filteredApprovalItems}
          pagination={false}
          rowKey="id"
          scroll={{ x: 980 }}
        />
      </Card>

      <Modal
        centered
        className="approval-detail-modal"
        footer={null}
        open={Boolean(selectedItem)}
        title="ตรวจสอบรายละเอียดการประเมิน"
        width="min(1180px, calc(100vw - 32px))"
        onCancel={() => setSelectedItem(null)}
      >
        {selectedItem ? (
          <div className="approval-detail">
            <Alert
              message="เจ้าหน้าที่สามารถปรับถ้อยคำคอมเมนต์ได้"
              description="ควรแก้เฉพาะถ้อยคำที่รุนแรง ไม่เหมาะสม หรือเสี่ยงต่อการระบุตัวบุคคล โดยคงเจตนาของผู้ประเมินไว้"
              type="info"
              showIcon
            />

            <Card className="clean-card" variant="outlined">
              <div className="approval-pair-grid">
                <div>
                  <Typography.Text type="secondary">ผู้ประเมิน</Typography.Text>
                  <Typography.Title level={5}>{selectedItem.evaluatorName}</Typography.Title>
                  <Typography.Text>
                    {selectedItem.evaluatorCode} / {selectedItem.evaluatorDepartment}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">ผู้ถูกประเมิน</Typography.Text>
                  <Typography.Title level={5}>{selectedItem.supervisorName}</Typography.Title>
                  <Typography.Text>{selectedItem.supervisorPosition}</Typography.Text>
                </div>
              </div>
            </Card>

            <div className="approval-answer-list">
              {selectedItem.answers.map((topic, topicIndex) => (
                <Card
                  className="clean-card approval-score-table-card"
                  key={topic.topic}
                  title={`${topicIndex + 1}. ${topic.topic}`}
                  variant="outlined"
                >
                  <div className="approval-score-table-wrap">
                    <table className="approval-score-table">
                      <thead>
                        <tr>
                          <th>หัวข้อย่อย</th>
                          {[4, 3, 2, 1].map((score) => (
                            <th key={score}>คะแนน {score}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topic.children.map((answer, answerIndex) => (
                          <tr key={answer.title}>
                            <td>
                              {topicIndex + 1}.{answerIndex + 1} {answer.title}
                            </td>
                            {[4, 3, 2, 1].map((score) => (
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

            <Card className="clean-card" title="คอมเมนต์ของพนักงาน" variant="outlined">
              <Space orientation="vertical" size={14} className="full-width">
                <div className="approval-original-comment">
                  <CommentOutlined className="list-icon" />
                  <Typography.Text>{selectedItem.originalComment}</Typography.Text>
                </div>
                <Input.TextArea
                  rows={5}
                  value={editedComment}
                  onChange={(event) => setEditedComment(event.target.value)}
                  placeholder="แก้ไขถ้อยคำคอมเมนต์ก่อนอนุมัติ"
                />
                <Space className="assessment-form-actions" wrap>
                  <Button icon={<EditOutlined />} onClick={handleSaveComment}>
                    บันทึกคอมเมนต์ที่แก้ไข
                  </Button>
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>
                    อนุมัติผลการประเมิน
                  </Button>
                </Space>
              </Space>
            </Card>
          </div>
        ) : null}
      </Modal>
    </PagePanel>
  );
}
