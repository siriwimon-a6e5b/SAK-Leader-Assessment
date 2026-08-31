import {
  CalendarOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
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
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import PagePanel, { MetricCard } from "../components/PagePanel";

const historyAccessCode = "1234";

const historyItems = [
  {
    id: "AS-2569-001",
    year: "2569",
    title: "ประเมินผู้บังคับบัญชา",
    targetName: "คุณณัฐพล วัฒนากุล",
    targetPosition: "หัวหน้าฝ่ายขาย",
    round: "ไตรมาส 2/2569",
    date: "ส่งข้อมูลเมื่อ 30 มิ.ย. 2569",
    scoreSummary: "เฉลี่ย 3.75/4",
    status: "ส่งแล้ว",
    comment:
      "หัวหน้าสื่อสารเป้าหมายชัดเจน ช่วยแก้ปัญหาเร็ว และให้คำแนะนำที่นำไปใช้ได้จริง",
    answers: [
      {
        topic: "ภาวะผู้นำและการตัดสินใจ",
        children: [
          { title: "สื่อสารเป้าหมายและแนวทางการทำงานให้ทีมเข้าใจชัดเจน", score: 4 },
          { title: "ตัดสินใจบนข้อมูลและรับผิดชอบต่อผลลัพธ์", score: 4 },
          { title: "สนับสนุนทีมเมื่อต้องแก้ปัญหาเร่งด่วน", score: 3 },
        ],
      },
      {
        topic: "การบริหารคนและการพัฒนาทีม",
        children: [
          { title: "ให้คำแนะนำหรือ feedback ที่นำไปปรับปรุงงานได้จริง", score: 4 },
          { title: "มอบหมายงานเหมาะสมกับความสามารถของแต่ละคน", score: 3 },
          { title: "ส่งเสริมบรรยากาศการทำงานที่เปิดใจและร่วมมือกัน", score: 4 },
        ],
      },
    ],
  },
  {
    id: "AS-2569-002",
    year: "2569",
    title: "ประเมินผู้บังคับบัญชา",
    targetName: "คุณพิชชาภา แสงอรุณ",
    targetPosition: "ผู้ช่วยหัวหน้าฝ่ายขาย",
    round: "ไตรมาส 2/2569",
    date: "ส่งข้อมูลเมื่อ 29 มิ.ย. 2569",
    scoreSummary: "เฉลี่ย 3.50/4",
    status: "ส่งแล้ว",
    comment:
      "ผู้ช่วยหัวหน้าดูแลทีมดี ประสานงานรวดเร็ว แต่อาจเพิ่มการติดตามงานหลังมอบหมายให้ต่อเนื่องขึ้น",
    answers: [
      {
        topic: "ภาวะผู้นำและการตัดสินใจ",
        children: [
          { title: "สื่อสารเป้าหมายและแนวทางการทำงานให้ทีมเข้าใจชัดเจน", score: 3 },
          { title: "ตัดสินใจบนข้อมูลและรับผิดชอบต่อผลลัพธ์", score: 4 },
          { title: "สนับสนุนทีมเมื่อต้องแก้ปัญหาเร่งด่วน", score: 3 },
        ],
      },
      {
        topic: "การบริหารคนและการพัฒนาทีม",
        children: [
          { title: "ให้คำแนะนำหรือ feedback ที่นำไปปรับปรุงงานได้จริง", score: 4 },
          { title: "มอบหมายงานเหมาะสมกับความสามารถของแต่ละคน", score: 3 },
          { title: "ส่งเสริมบรรยากาศการทำงานที่เปิดใจและร่วมมือกัน", score: 4 },
        ],
      },
    ],
  },
  {
    id: "AS-2568-001",
    year: "2568",
    title: "ประเมินหัวหน้าเดิมกรณีโยกย้าย",
    targetName: "คุณศุภชัย เมธากุล",
    targetPosition: "หัวหน้าฝ่ายบริการลูกค้า",
    round: "ประจำปี 2568",
    date: "ส่งข้อมูลเมื่อ 25 ธ.ค. 2568",
    scoreSummary: "เฉลี่ย 3.25/4",
    status: "ส่งแล้ว",
    comment:
      "ช่วงที่ทำงานร่วมกันหัวหน้าช่วยประสานงานและให้คำแนะนำดี แต่ควรเพิ่มการแจ้งความคืบหน้าของงานสำคัญให้เร็วขึ้น",
    answers: [
      {
        topic: "ภาวะผู้นำและการตัดสินใจ",
        children: [
          { title: "สื่อสารเป้าหมายและแนวทางการทำงานให้ทีมเข้าใจชัดเจน", score: 3 },
          { title: "ตัดสินใจบนข้อมูลและรับผิดชอบต่อผลลัพธ์", score: 3 },
          { title: "สนับสนุนทีมเมื่อต้องแก้ปัญหาเร่งด่วน", score: 4 },
        ],
      },
      {
        topic: "ความรับผิดชอบและจริยธรรมในการทำงาน",
        children: [
          { title: "ปฏิบัติต่อทีมอย่างยุติธรรมและให้เกียรติ", score: 3 },
          { title: "รักษามาตรฐานงานและกฎระเบียบขององค์กร", score: 4 },
          { title: "เป็นแบบอย่างด้านความรับผิดชอบและวินัยในการทำงาน", score: 3 },
        ],
      },
    ],
  },
];

export default function UserReportPage() {
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const years = useMemo(
    () => [...new Set(historyItems.map((item) => item.year))],
    [],
  );
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const filteredHistoryItems = useMemo(
    () => historyItems.filter((item) => item.year === selectedYear),
    [selectedYear],
  );

  const averageScore = useMemo(() => {
    const total = filteredHistoryItems.reduce((sum, item) => {
      const score = Number(item.scoreSummary.match(/\d+(\.\d+)?/)?.[0] || 0);
      return sum + score;
    }, 0);

    return filteredHistoryItems.length
      ? (total / filteredHistoryItems.length).toFixed(2)
      : "0.00";
  }, [filteredHistoryItems]);

  const handleUnlock = () => {
    if (accessCode.trim() !== historyAccessCode) {
      setError("รหัสไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setError("");
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return (
      <PagePanel
        eyebrow="Assessment History"
        title="ประวัติการประเมิน"
        description="กรอกรหัสเพื่อเข้าดูรายการประเมินที่เคยส่งแล้ว"
        showBack={false}
      >
        <Card className="clean-card history-lock-card" variant="outlined">
          <Space orientation="vertical" size={18} className="full-width">
            <div className="history-lock-icon">
              <LockOutlined />
            </div>
            <div>
              <Typography.Title level={4}>ยืนยันรหัสก่อนเข้าดูประวัติ</Typography.Title>
              <Typography.Paragraph>
                เพื่อความเป็นส่วนตัว ระบบจะแสดงรายการประเมินหลังกรอกรหัสถูกต้อง
              </Typography.Paragraph>
            </div>
            {error ? <Alert message={error} type="error" showIcon /> : null}
            <Space.Compact className="history-lock-input">
              <Input.Password
                prefix={<SafetyCertificateOutlined />}
                placeholder="กรอกรหัสผ่าน"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                onPressEnter={handleUnlock}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleUnlock}>
                เข้าดู
              </Button>
            </Space.Compact>
            <Typography.Text type="secondary">
              รหัสตัวอย่างสำหรับทดสอบ: 1234
            </Typography.Text>
          </Space>
        </Card>
      </PagePanel>
    );
  }

  return (
    <PagePanel
      eyebrow="Assessment History"
      title="ประวัติการประเมิน"
      description="รายการประเมินที่ส่งแล้ว พร้อมข้อมูลผู้ถูกประเมินและรอบการประเมิน"
      showBack={false}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label={`ส่งแล้วปี ${selectedYear}`} value={`${filteredHistoryItems.length} รายการ`} detail="นับเฉพาะรายการที่ส่งสำเร็จ" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="คะแนนเฉลี่ย" value={`${averageScore}/4`} detail="สรุปจากรายการที่ส่งแล้ว" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ปีที่เลือก" value={selectedYear} detail="เลือกดูย้อนหลังเป็นรายปี" />
        </Col>
      </Row>

      <Card
        className="clean-card page-grid"
        title="รายการที่ประเมินแล้ว"
        extra={
          <Select
            className="history-year-select"
            value={selectedYear}
            options={years.map((year) => ({
              label: `ปี ${year}`,
              value: year,
            }))}
            onChange={setSelectedYear}
          />
        }
        variant="outlined"
      >
        <div className="history-list">
          {filteredHistoryItems.map((item) => (
            <div className="history-list-item" key={item.id}>
              <div className="history-list-main">
                <FileDoneOutlined className="list-icon" />
                <div>
                  <Space size={8} wrap>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      {item.status}
                    </Tag>
                  </Space>
                  <div className="history-list-meta">
                    <Space size={8} wrap>
                      <UserOutlined />
                      <Typography.Text type="secondary">
                        {item.targetName} - {item.targetPosition}
                      </Typography.Text>
                    </Space>
                    <Space size={8} wrap>
                      <CalendarOutlined />
                      <Typography.Text type="secondary">
                        {item.round} / {item.date}
                      </Typography.Text>
                    </Space>
                  </div>
                </div>
              </div>
              <Space className="history-list-actions" wrap>
                <Tag color="blue" className="summary-tag">
                  {item.scoreSummary}
                </Tag>
                <Button icon={<EyeOutlined />} onClick={() => setSelectedHistory(item)}>
                  ดูรายละเอียด
                </Button>
              </Space>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        centered
        footer={null}
        open={Boolean(selectedHistory)}
        title="รายละเอียดการประเมิน"
        width={820}
        onCancel={() => setSelectedHistory(null)}
      >
        {selectedHistory ? (
          <div className="history-detail">
            <div className="history-detail-header">
              <FileDoneOutlined className="list-icon" />
              <div>
                <Typography.Text strong>{selectedHistory.title}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    {selectedHistory.targetName} - {selectedHistory.targetPosition}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    {selectedHistory.round} / {selectedHistory.date}
                  </Typography.Text>
                </div>
              </div>
            </div>

            <div className="history-detail-topic-list">
              {selectedHistory.answers.map((topic, topicIndex) => (
                <Card
                  className="clean-card history-detail-topic"
                  key={topic.topic}
                  title={`${topicIndex + 1}. ${topic.topic}`}
                  variant="outlined"
                >
                  {topic.children.map((answer, answerIndex) => (
                    <div className="history-detail-answer" key={answer.title}>
                      <div className="history-detail-answer-copy">
                        <FileTextOutlined className="list-icon" />
                        <Typography.Text>
                          {topicIndex + 1}.{answerIndex + 1} {answer.title}
                        </Typography.Text>
                      </div>
                      <Tag color="blue">คะแนน {answer.score}</Tag>
                    </div>
                  ))}
                </Card>
              ))}
            </div>

            <Card className="clean-card compact-card" variant="outlined">
              <Space align="start" size={12}>
                <CommentOutlined className="list-icon" />
                <div>
                  <Typography.Text strong>คอมเมนต์ที่เคยส่ง</Typography.Text>
                  <Typography.Paragraph>{selectedHistory.comment}</Typography.Paragraph>
                </div>
              </Space>
            </Card>
          </div>
        ) : null}
      </Modal>
    </PagePanel>
  );
}
