import { BarChartOutlined, CheckCircleOutlined, SmileOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Empty, Modal, Progress, Row, Select, Skeleton, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import PagePanel, { MetricCard } from "../components/PagePanel";
import AiAnalysisSummary from "../components/AiAnalysisSummary";
import { loadOwnAssessmentResults, markOwnAssessmentResultAcknowledged, useOwnAssessmentResults } from "../../stores/ownAssessmentResults";
import { formatBuddhistYear, formatThaiRound } from "../../utils/thaiProfileDates";

import apiClient, { readCurrentUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";

const roundLabel = (round) => `${round.EVT_Name || "ผลประเมิน"} · รอบ ${formatThaiRound(round.EVC_Period)} · ${formatBuddhistYear(round.EVC_Year)}`;
const scoreText = (value) => value === null || value === undefined ? "—" : Number(value).toFixed(2);
const scoreLevel = (score) => score === null ? "ยังไม่มีคะแนนแบบระดับ" : score >= 4.5 ? "ดีเยี่ยม" : score >= 4 ? "ดีมาก" : score >= 3 ? "ดี" : "ควรพัฒนา";

export default function LeaderDashboardPage() {
  const { status, canView, rounds, error } = useOwnAssessmentResults();
  const [selectedCode, setSelectedCode] = useState("");
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgementError, setAcknowledgementError] = useState("");
  const user = readCurrentUserDetail() || {};
  const userName = readTokenValue(user.PerFuNas) || "ผู้ใช้งาน";
  const photo = readTokenValue(user.PerPhotoProfile_N).trim();
  const photoUrl = !photo || photo === "-" ? undefined : /^https?:\/\//i.test(photo) ? photo : `https://apimb.sakerp.org/file_photoEMP/${encodeURIComponent(photo)}`;
  const selected = rounds.find((round) => round.EVC_Code === selectedCode) || rounds[0];
  const options = useMemo(() => rounds.map((round) => ({ value: round.EVC_Code, label: roundLabel(round) })), [rounds]);
  const previous = selected ? rounds.slice(rounds.indexOf(selected) + 1).find((round) => String(round.EVT_ID) === String(selected.EVT_ID) && round.averageScore !== null) : null;
  const change = selected?.averageScore != null && previous ? Number(selected.averageScore) - Number(previous.averageScore) : null;
  const topics = selected?.topics || [];
  const sortedTopics = [...topics].sort((a, b) => b.score - a.score);
  const acknowledgementRound = rounds.find(
    (round) => round.resultAcknowledged !== true && Number(round.resultAcknowledged) !== 1,
  );
  const acknowledgementTopics = acknowledgementRound?.topics || [];
  const requiresAcknowledgement = Boolean(acknowledgementRound);

  useEffect(() => {
    loadOwnAssessmentResults(true);
  }, []);

  const acknowledgeResult = async () => {
    if (!acknowledgementRound || acknowledging) return;

    setAcknowledging(true);
    setAcknowledgementError("");

    try {
      await apiClient.post(
        "/acknowledgeOwnAssessmentResult",
        { EVC_Code: acknowledgementRound.EVC_Code },
      );
      markOwnAssessmentResultAcknowledged(acknowledgementRound.EVC_Code);
    } catch (requestError) {
      console.error(requestError);
      setAcknowledgementError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "บันทึกการรับทราบผลการประเมินไม่สำเร็จ",
      );
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <PagePanel className="own-results-page" eyebrow="My Assessment Result" title="ผลการประเมินของฉัน"
      description="ภาพรวมคะแนนที่ผู้อื่นประเมินคุณ เฉพาะผลที่ฝ่ายบุคคลตรวจแล้ว" showBack={false}>
      {status === "error" ? (
        <Alert type="error" showIcon title="โหลดผลประเมินไม่สำเร็จ" description={error}
          action={<Button onClick={() => loadOwnAssessmentResults(true)}>ลองใหม่</Button>} />
      ) : status === "idle" || status === "loading" ? (
        <Card className="clean-card"><Skeleton active paragraph={{ rows: 6 }} /></Card>
      ) : !canView ? (
        <Alert type="info" showIcon title="ผลประเมินส่วนนี้สำหรับตำแหน่งหัวหน้าขึ้นไป" />
      ) : !selected ? (
        <Card className="clean-card"><Empty description="ยังไม่มีผลประเมินของคุณที่ฝ่ายบุคคลตรวจแล้ว" /></Card>
      ) : (
        <>
          <section className="own-results-person">
            <div className="own-results-identity">
              <Avatar size={68} src={photoUrl} icon={<UserOutlined />} />
              <div><span>หัวหน้าที่ถูกประเมิน</span><Typography.Title level={4}>{userName}</Typography.Title><Typography.Text>{readTokenValue(user.PerPST_N) || "—"}</Typography.Text></div>
            </div>
            <div className="own-results-person-meta">
              <div><span>รหัสพนักงาน</span><strong>{readTokenValue(user.PerD) || "—"}</strong></div>
              <div><span>สถานที่ปฏิบัติงาน</span><strong>{readTokenValue(user.PerWP_N) || "—"}</strong></div>
              <div><span>รอบการประเมิน</span><strong>{formatThaiRound(selected.EVC_Period)}</strong></div>
              <div><span>ประเภทการประเมิน</span><strong>{selected.EVT_Name || "—"}</strong></div>
            </div>
          </section>
          <div className="own-results-round-picker">
            <div><Typography.Text strong>เลือกรอบประเมิน</Typography.Text><Typography.Paragraph type="secondary">เปรียบเทียบภาพรวมของคุณในแต่ละรอบ</Typography.Paragraph></div>
            <Select aria-label="รอบผลการประเมินของฉัน" value={selected.EVC_Code} options={options} onChange={setSelectedCode} />
          </div>
          <Row gutter={[14, 14]}>
            <Col xs={24} md={8}><MetricCard label="คะแนนเฉลี่ยรวม" value={scoreText(selected.averageScore)} detail={selected.averageScore === null ? "ไม่มีคำตอบแบบระดับคะแนน" : "จากคำตอบแบบระดับคะแนน เต็ม 5"} /></Col>
            <Col xs={24} md={8}><MetricCard label="ผลประเมินที่ตรวจแล้ว" value={`${selected.reviewedCount} รายการ`} detail="รวมเฉพาะรอบที่เลือก" /></Col>
            <Col xs={24} md={8}><MetricCard label="เทียบรอบก่อนของประเภทเดียวกัน" value={change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(2)}`} detail={previous ? `เทียบรอบ ${formatThaiRound(previous.EVC_Period)} · ${formatBuddhistYear(previous.EVC_Year)}` : "ยังไม่มีรอบก่อนสำหรับเปรียบเทียบ"} /></Col>
          </Row>
          {/* <Card className="own-results-detail-card" */}
            <Card className=""
            title={<span><BarChartOutlined /> {selected.EVT_Name || "ผลการประเมิน"}</span>}
            extra={<Tag color="blue">ภาพรวมคะแนน</Tag>}>
            <Row gutter={[28, 24]} align="middle">
              <Col xs={24} lg={9}>
                <div className="own-results-score-panel">
                  <span className="own-results-score-symbol"><SmileOutlined /></span>
                  <Typography.Text strong>คะแนนประเมินโดยรวม</Typography.Text>
                  <div className="own-results-big-score">{scoreText(selected.averageScore)}<small> / 5</small></div>
                  <Tag color="blue">{scoreLevel(selected.averageScore)}</Tag>
                  <Typography.Text type="secondary">จากผลประเมินที่ผ่านการตรวจแล้ว</Typography.Text>
                </div>
              </Col>
              <Col xs={24} lg={15}>
                <div className="own-results-topic-heading"><strong>คะแนนเฉลี่ยแยกตามหัวข้อ</strong><span>เต็ม 5 คะแนน</span></div>
                {topics.length ? <div className="own-results-topics">{topics.map((topic) => (
                  <div key={topic.id} className="own-results-topic own-results-topic-line">
                    <Typography.Text>{topic.name}</Typography.Text>
                    <Progress percent={Math.max(0, Math.min(100, Number(topic.score) / 5 * 100))} showInfo={false} strokeColor={{ from: "#2454df", to: "#24bbcc" }} />
                    <Typography.Text strong>{scoreText(topic.score)}</Typography.Text>
                  </div>
                ))}</div> : <Empty description="รอบนี้ยังไม่มีคะแนนรายหัวข้อแบบระดับคะแนน" />}
              </Col>
            </Row>
            {sortedTopics.length > 0 ? <div className="own-results-insight-row">
              <div><span>หัวข้อคะแนนสูงสุด</span><strong>{sortedTopics[0].name}</strong><b>{scoreText(sortedTopics[0].score)} / 5</b></div>
              {sortedTopics.length > 1 ? <div><span>หัวข้อคะแนนต่ำสุด</span><strong>{sortedTopics.at(-1).name}</strong><b>{scoreText(sortedTopics.at(-1).score)} / 5</b></div> : null}
            </div> : null}
          </Card>
          {selected.aiAnalysis ? (
            <Card
              className="clean-card own-results-combined-comment"
              variant="outlined"
            >
              <AiAnalysisSummary value={selected.aiAnalysis} />
            </Card>
          ) : null}
          {/* <div className="own-results-privacy"><SafetyOutlined /><span>แสดงเฉพาะผลรวมของคุณ ไม่แสดงชื่อผู้ประเมินหรือความคิดเห็นรายบุคคล</span></div> */}
          {/* <Typography.Text type="secondary">ข้อมูล ณ การเข้าสู่ระบบครั้งนี้ การเปลี่ยนรอบใช้ข้อมูลที่โหลดไว้</Typography.Text> */}
        </>
      )}

      <Modal
        centered
        className="assessment-acknowledgement-modal"
        open={requiresAcknowledgement}
        title={null}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        width="min(620px, calc(100vw - 32px))"
        footer={
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            loading={acknowledging}
            onClick={acknowledgeResult}
            block
          >
            รับทราบผลการประเมิน
          </Button>
        }
      >
        {acknowledgementRound ? (
          <div className="assessment-acknowledgement">
            <div className="assessment-acknowledgement-heading">
              <span className="assessment-acknowledgement-icon">
                <BarChartOutlined />
              </span>
              <div>
                <Typography.Text type="secondary">ผลการประเมินของคุณพร้อมแล้ว</Typography.Text>
                <Typography.Title level={3}>โปรดตรวจสอบและกดรับทราบผล</Typography.Title>
              </div>
            </div>

            <div className="assessment-acknowledgement-round">
              <div>
                <span>รอบการประเมิน</span>
                <strong>{formatThaiRound(acknowledgementRound.EVC_Period)} · {formatBuddhistYear(acknowledgementRound.EVC_Year)}</strong>
              </div>
              <Tag color="blue">{acknowledgementRound.EVT_Name || "ผลการประเมิน"}</Tag>
            </div>

            <div className="assessment-acknowledgement-score">
              <span>คะแนนเฉลี่ยรวม</span>
              <strong>{scoreText(acknowledgementRound.averageScore)} <small>/ 5</small></strong>
              <Tag color="processing">{scoreLevel(acknowledgementRound.averageScore)}</Tag>
              <p>คำนวณจากผลประเมินที่ฝ่ายบุคคลตรวจแล้ว {acknowledgementRound.reviewedCount} รายการ</p>
            </div>

            {acknowledgementTopics.length ? (
              <div className="assessment-acknowledgement-topics">
                <Typography.Text strong>ภาพรวมคะแนนรายหัวข้อ</Typography.Text>
                {acknowledgementTopics.map((topic) => (
                  <div key={topic.id}>
                    <span>{topic.name}</span>
                    <Progress
                      percent={Math.max(0, Math.min(100, Number(topic.score) / 5 * 100))}
                      showInfo={false}
                      strokeColor="#4c83d1"
                    />
                    <strong>{scoreText(topic.score)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {acknowledgementRound.aiAnalysis ? (
              <div className="assessment-acknowledgement-comment">
                <AiAnalysisSummary value={acknowledgementRound.aiAnalysis} compact />
              </div>
            ) : null}

            <Alert
              type="info"
              showIcon
              title="การกดรับทราบหมายถึงท่านได้เปิดอ่านผลการประเมินในรอบนี้แล้ว"
              description="ข้อมูลนี้เป็นคะแนนภาพรวมและไม่เปิดเผยรายชื่อผู้ประเมิน"
            />

            {acknowledgementError ? (
              <Alert type="error" showIcon title={acknowledgementError} />
            ) : null}
          </div>
        ) : null}
      </Modal>
    </PagePanel>
  );
}


 
