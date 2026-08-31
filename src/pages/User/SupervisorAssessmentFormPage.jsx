import {
  CheckCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  LikeOutlined,
  MehOutlined,
  StarOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Radio,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import PagePanel, { MetricCard } from "../components/PagePanel";
import apiClient from "../../recoilstore/userStores";

const supervisorProfiles = {
  SV001: {
    name: "คุณณัฐพล วัฒนากุล",
    position: "หัวหน้าฝ่ายขาย",
    department: "ฝ่ายขาย",
  },
  SV002: {
    name: "คุณพิชชาภา แสงอรุณ",
    position: "ผู้ช่วยหัวหน้าฝ่ายขาย",
    department: "ฝ่ายขาย",
  },
  OLD001: {
    name: "คุณศุภชัย เมธากุล",
    position: "หัวหน้าฝ่ายบริการลูกค้า",
    department: "ฝ่ายบริการลูกค้า",
  },
};

const assessmentTopics = [
  {
    title: "ภาวะผู้นำ (Leadership)",
    description: "พิจารณาความเป็นผู้นำ ความน่าเชื่อถือ การวางแผน และการเป็นแบบอย่าง",
    children: [
      "มีภาวะผู้นำและความน่าเชื่อถือ",
      "กล้าตัดสินใจและรับผิดชอบ",
      "วางแผนและบริหารงานอย่างเป็นระบบ",
      "ติดตามงานและเป้าหมายอย่างต่อเนื่อง",
      "เป็นแบบอย่างที่ดีในการทำงาน",
    ],
  },
  {
    title: "การสื่อสาร (Communication)",
    description: "พิจารณาความชัดเจน การรับฟัง และการประสานงานภายในทีม",
    children: [
      "สื่อสารชัดเจน เข้าใจง่าย",
      "รับฟังความคิดเห็นของทีม",
      "ถ่ายทอดนโยบายและเป้าหมายได้ชัดเจน",
      "ใช้ถ้อยคำเหมาะสมในการสื่อสาร",
      "ประสานงานได้รวดเร็วและทั่วถึง",
    ],
  },
  {
    title: "การบริหารทีม (People Management)",
    description: "พิจารณาการดูแลทีม การสนับสนุน และการสร้างการมีส่วนร่วม",
    children: [
      "ปฏิบัติต่อพนักงานอย่างเท่าเทียม",
      "สนับสนุนและช่วยเหลือทีมงาน",
      "สร้างแรงจูงใจและขวัญกำลังใจ",
      "เปิดโอกาสให้ทีมมีส่วนร่วม",
      "ส่งเสริมการทำงานเป็นทีม",
    ],
  },
  {
    title: "การบริหารงาน (Execution & Performance)",
    description: "พิจารณาการแก้ปัญหา การติดตามงาน และการบริหารผลลัพธ์",
    children: [
      "แก้ไขปัญหาได้ตรงจุด",
      "ตัดสินใจได้รวดเร็ว",
      "สนับสนุนการทำงานภาคสนาม",
      "ติดตามงานอย่างใกล้ชิด",
      "บริหารงานได้ตามเป้าหมาย",
    ],
  },
  {
    title: "จริยธรรมและความเป็นมืออาชีพ (Professionalism)",
    description: "พิจารณาความโปร่งใส ความเป็นธรรม การควบคุมอารมณ์ และการวางตัว",
    children: [
      "มีความโปร่งใสในการทำงาน",
      "ใช้เหตุผลและความเป็นธรรม",
      "ควบคุมอารมณ์ได้เหมาะสม",
      "วางตัวเหมาะสมกับตำแหน่ง",
      "ปฏิบัติตามกฎระเบียบองค์กร",
    ],
  },
];

const scoreOptions = [5, 4, 3, 2, 1].map((score) => ({
  label: String(score),
  value: score,
}));

const scoreLevels = [
  { score: "5", label: "ดีเยี่ยม / ปฏิบัติสม่ำเสมอ", icon: <TrophyOutlined /> },
  { score: "4", label: "ดี / ปฏิบัติได้ดี", icon: <LikeOutlined /> },
  { score: "3", label: "ปานกลาง", icon: <MehOutlined /> },
  { score: "2", label: "ควรปรับปรุง", icon: <ToolOutlined /> },
  { score: "1", label: "ต้องปรับปรุงเร่งด่วน", icon: <WarningOutlined /> },
];

const strengthOptions = [
  "รับฟังความคิดเห็น",
  "ให้คำปรึกษาได้ดี",
  "เป็นธรรมและโปร่งใส",
  "ตัดสินใจรวดเร็ว",
  "แก้ปัญหาได้ดี",
  "สนับสนุนทีมงาน",
  "ทำงานเป็นระบบ",
  "สร้างแรงจูงใจได้ดี",
];

const improvementOptions = [
  "ใช้อารมณ์ในการทำงาน",
  "การอนุมัติงานล่าช้า",
  "ติดตามงานไม่ต่อเนื่อง",
  "ขาดความเด็ดขาด",
  "ไม่เปิดโอกาสให้ทีมมีส่วนร่วม",
  "ขาดความเป็นธรรม",
  "บริหารเวลาไม่เหมาะสม",
  "วางแผนงานไม่ชัดเจน",
  "ไม่ลงพื้นที่ติดตามงาน",
  "ขาดการสนับสนุนทีม",
];

const overallOptions = [
  "ดีเยี่ยม",
  "ดี",
  "ปานกลาง",
  "ควรปรับปรุง",
  "ต้องปรับปรุงเร่งด่วน",
];

const supervisorAssessmentYear = "2569";
const supervisorAssessmentType = "1";

function getAssessmentDetail(responseData) {
  return (
    responseData?.result ||
    responseData?.data ||
    responseData?.result?.data ||
    responseData ||
    {}
  );
}

function mapApiTopic(topic = {}) {
  const questions = topic.questions || topic.items || topic.children || [];

  return {
    id: topic.LAT_ID || topic.topic_id || topic.id,
    title: topic.LAT_Name || topic.topic_name || topic.title || "-",
    description: topic.LAT_Description || topic.description || "",
    type: topic.LAT_Type || topic.topic_type || topic.type || "rating",
    children: questions.map(
      (question) =>
        question.LAQ_Name ||
        question.question_name ||
        question.title ||
        question.text ||
        question,
    ),
  };
}

export default function SupervisorAssessmentFormPage() {
  const navigate = useNavigate();
  const { supervisorId } = useParams();
  const supervisor = supervisorProfiles[supervisorId] || supervisorProfiles.SV001;
  const [assessmentForm, setAssessmentForm] = useState();
  const [loadingForm, setLoadingForm] = useState(false);

  const displayTopics = useMemo(
    () => assessmentForm?.topics?.length ? assessmentForm.topics : assessmentTopics,
    [assessmentForm],
  );

  const fetchAssessmentFormDetail = useCallback(async () => {
    setLoadingForm(true);

    try {
      const response = await apiClient.get("/api/insurances/getFormDetail", {
        params: {
          assessment_type: supervisorAssessmentType,
          assessment_year: supervisorAssessmentYear,
          supervisor_id: supervisorId,
        },
      });
      const detail = getAssessmentDetail(response.data);
      const topics = (detail.topics || detail.sections || []).map(mapApiTopic);

      setAssessmentForm({
        LAF_ID: detail.LAF_ID,
        LAF_Name:
          detail.LAF_Name ||
          detail.form_name ||
          `ประเมินผู้บังคับบัญชา ${supervisorAssessmentYear}`,
        topics,
      });
    } catch (error) {
      console.error(error);
      setAssessmentForm(undefined);
    } finally {
      setLoadingForm(false);
    }
  }, [supervisorId]);

  useEffect(() => {
    fetchAssessmentFormDetail();
  }, [fetchAssessmentFormDetail]);

  const handleSubmit = () => {
    navigate("/User_Assess_Supervisor", {
      replace: true,
      state: {
        submittedSupervisorId: supervisorId,
        submittedSupervisorName: supervisor.name,
      },
    });
  };

  return (
    <PagePanel
      eyebrow="Assessment Form"
      title={assessmentForm?.LAF_Name || `แบบประเมินผู้บังคับบัญชา ${supervisorAssessmentYear}`}
      description="ประเมินพฤติกรรมผู้บังคับบัญชาตามระดับความเป็นจริง พร้อมระบุจุดเด่น ด้านที่ควรพัฒนา และข้อเสนอแนะเพิ่มเติม"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard label="ผู้ถูกประเมิน" value={supervisor.name} detail={supervisor.position} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ฝ่าย" value={supervisor.department} detail="พื้นที่สำนักงานใหญ่" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard label="ระดับคะแนน" value="1-5" detail="มากที่สุดคือ 5 คะแนน" />
        </Col>
      </Row>

      <Card className="clean-card assessment-form-card" variant="outlined">
        <div className="assessment-form-profile">
          <div className="assessment-form-profile-icon">
            <UserOutlined />
          </div>
          <div>
            <Typography.Text strong>{supervisor.name}</Typography.Text>
            <div>
              <Space size={8} wrap>
                <Typography.Text type="secondary">{supervisor.position}</Typography.Text>
                <Tag color="blue">{supervisor.department}</Tag>
              </Space>
            </div>
          </div>
        </div>
      </Card>

      <Card
        className="clean-card assessment-score-legend-card"
        title="ส่วนที่ 1 : ประเมินระดับพฤติกรรมการบริหาร"
        variant="outlined"
      >
        <Typography.Paragraph>
          โปรดประเมินพฤติกรรมของผู้บังคับบัญชาตามระดับความเป็นจริง
        </Typography.Paragraph>
        <div className="assessment-score-legend">
          {scoreLevels.map((level) => (
            <div className="assessment-score-legend-item" key={level.score}>
              <Typography.Text strong>{level.score}</Typography.Text>
              <Typography.Text>{level.label}</Typography.Text>
            </div>
          ))}
        </div>
      </Card>

      <Skeleton active loading={loadingForm}>
        <div className="assessment-topic-list">
        {displayTopics.map((topic, topicIndex) => (
          <Card
            className="clean-card assessment-topic-card"
            key={topic.id || topic.title}
            title={
              <Space align="start" size={10}>
                <span className="assessment-topic-number">{topicIndex + 1}</span>
                <span>{topic.title}</span>
              </Space>
            }
            variant="outlined"
          >
            <Typography.Paragraph>{topic.description}</Typography.Paragraph>
            <div className="assessment-score-header">
              <Typography.Text type="secondary">รายการประเมิน</Typography.Text>
              <div className="assessment-score-levels is-compact">
                {scoreLevels.map((level) => (
                  <div className="assessment-score-column-label" key={level.score}>
                    <span className="assessment-score-column-head">
                      <span className="assessment-score-column-icon">{level.icon}</span>
                      <Typography.Text strong>{level.score}</Typography.Text>
                    </span>
                    <Typography.Text type="secondary">{level.label}</Typography.Text>
                  </div>
                ))}
              </div>
            </div>
            <div className="assessment-subtopic-list">
              {topic.children.map((child, childIndex) => (
                <div className="assessment-subtopic-item" key={child}>
                  <div className="assessment-subtopic-copy">
                    <FileTextOutlined className="list-icon" />
                    <div>
                      <Typography.Text strong>
                        {topicIndex + 1}.{childIndex + 1} {child}
                      </Typography.Text>
                      <div>
                        <Typography.Text type="secondary">
                          เลือกระดับคะแนนที่ตรงกับความคิดเห็นของคุณ
                        </Typography.Text>
                      </div>
                    </div>
                  </div>
                  <Radio.Group
                    className="assessment-score-group"
                    options={scoreOptions}
                    optionType="button"
                    buttonStyle="solid"
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
        </div>
      </Skeleton>

      <Card className="clean-card compact-card" variant="outlined">
        <Space orientation="vertical" size={14} className="full-width">
          <Typography.Title level={4}>ส่วนที่ 2 : จุดเด่นของผู้บังคับบัญชา</Typography.Title>
          <Typography.Text type="secondary">เลือกได้ไม่เกิน 3 ข้อ</Typography.Text>
          <Checkbox.Group className="assessment-checkbox-grid" options={strengthOptions} />
          <Input placeholder="อื่นๆ ระบุเพิ่มเติม" />

          <Typography.Title level={4}>ส่วนที่ 3 : ด้านที่ควรพัฒนา</Typography.Title>
          <Typography.Text type="secondary">เลือกได้ไม่เกิน 3 ข้อ</Typography.Text>
          <Checkbox.Group className="assessment-checkbox-grid" options={improvementOptions} />
          <Input placeholder="อื่นๆ ระบุเพิ่มเติม" />

          <Space align="center">
            <CommentOutlined className="status-icon warning" />
            <Typography.Text strong>ส่วนที่ 4 : ข้อเสนอแนะเพิ่มเติม</Typography.Text>
          </Space>
          <Input.TextArea
            rows={4}
            placeholder="ระบุความคิดเห็นเพิ่มเติมเกี่ยวกับการทำงาน การสื่อสาร หรือการสนับสนุนทีม"
          />

          <Typography.Title level={4}>ส่วนที่ 5 : สรุประดับภาพรวมผู้บังคับบัญชา</Typography.Title>
          <Radio.Group
            className="assessment-overall-group"
            options={overallOptions.map((item) => ({ label: item, value: item }))}
          />

          <Space className="assessment-form-actions" wrap>
            <Button icon={<StarOutlined />}>บันทึกร่าง</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>
              ส่งแบบประเมิน
            </Button>
          </Space>
        </Space>
      </Card>
    </PagePanel>
  );
}
