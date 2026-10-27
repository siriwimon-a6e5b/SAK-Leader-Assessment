import { ArrowRightOutlined, BellOutlined, CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Empty, Popover, Spin, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../recoilstore/userStores";
import { formatBuddhistYear, formatThaiRound } from "../../utils/thaiProfileDates";

export default function EvaluationNotifications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const pending = useRef(null);
  const readInFlight = useRef(false);

  const load = useCallback(async () => {
    if (pending.current || readInFlight.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/api/insurances/getEvaluationNotifications", { signal: controller.signal });
      if (!controller.signal.aborted) setRows(data?.result?.rows || []);
    } catch (err) {
      if (!controller.signal.aborted) setError(err?.response?.data?.message || "โหลดการแจ้งเตือนไม่สำเร็จ");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [load]);

  const readNotification = async (item) => {
    if (readInFlight.current) return;
    readInFlight.current = true;
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setReading(String(item.submission_ID));
    setError("");
    try {
      const { data } = await apiClient.post("/api/insurances/readEvaluationNotification", { submission_ID: item.submission_ID });
      if (Number(data?.result?.statusUser_read) !== 1) throw new Error("บันทึกสถานะอ่านไม่สำเร็จ");
      setRows((current) => current.filter((row) => String(row.submission_ID) !== String(item.submission_ID)));
      setOpen(false);
      const query = new URLSearchParams({ EVC_Code: item.EVC_Code, submission_ID: item.submission_ID, from: "history" });
      navigate(`/User_Assess_Supervisor_Form/${encodeURIComponent(item.EVP_TargetID)}?${query}`, {
        state: { EVC_Code: item.EVC_Code, EVC_Period: item.EVC_Period, submission_ID: item.submission_ID, isReadOnly: true, supervisor: item },
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "บันทึกสถานะอ่านไม่สำเร็จ");
    } finally {
      readInFlight.current = false;
      setReading("");
    }
  };

  return (
    <Popover
      arrow={false}
      placement="bottomRight"
      trigger="click"
      open={open}
      onOpenChange={(next) => { setOpen(next); if (next) load(); }}
      content={
        <div className="notification-panel notification-panel-modern">
          <div className="notification-panel-header">
            <div className="notification-heading-copy">
              <span className="notification-heading-icon"><BellOutlined /></span>
              <div>
                <Typography.Text strong>การแจ้งเตือน</Typography.Text>
                <span className="notification-subtitle">อัปเดตผลการประเมินของคุณ</span>
              </div>
            </div>
            <span className="notification-unread-count">{rows.length} รายการใหม่</span>
          </div>
          {error ? <Alert type="error" title={error} showIcon action={<Button size="small" onClick={load}>ลองใหม่</Button>} /> : null}
          <Spin spinning={loading}>
            <div className="notification-list">
              {rows.map((item) => (
                <button type="button" className="notification-item notification-read-button" key={item.submission_ID} disabled={Boolean(reading)} onClick={() => readNotification(item)}>
                  <CheckCircleOutlined className="notification-icon" />
                  <div className="notification-item-copy">
                    <span className="notification-item-status">ตรวจสอบเรียบร้อย <i aria-hidden="true" /></span>
                    <Typography.Text strong>ฝ่ายบุคคลตรวจผลประเมินแล้ว</Typography.Text>
                    <Typography.Paragraph>{item.EVP_TargetName || item.EVP_TargetID}</Typography.Paragraph>
                    <span className="notification-round"><CalendarOutlined /> รอบ {formatThaiRound(item.EVC_Period)} · {formatBuddhistYear(item.EVC_Year)}</span>
                    <span className="notification-open-link">{reading === String(item.submission_ID) ? "กำลังเปิดผลประเมิน…" : "อ่านและดูผลประเมิน"} <ArrowRightOutlined /></span>
                  </div>
                </button>
              ))}
              {!rows.length && !loading && !error ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีการแจ้งเตือนใหม่" /> : null}
            </div>
          </Spin>
          {rows.length > 0 ? <div className="notification-panel-note">รายการจะหายจากการแจ้งเตือนเมื่อกดอ่าน</div> : null}
        </div>
      }
    >
      <Badge count={rows.length} size="small">
        <Button aria-label={`เปิดการแจ้งเตือน ยังไม่อ่าน ${rows.length} รายการ`} className="header-icon-button" icon={<BellOutlined />} shape="circle" size="small" />
      </Badge>
    </Popover>
  );
}
