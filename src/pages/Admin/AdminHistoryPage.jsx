import { HistoryOutlined } from "@ant-design/icons";
import { Card, Typography } from "antd";
import PagePanel from "../components/PagePanel";

const historyItems = [
  "เข้าสู่ระบบผู้ดูแลระบบ",
  "เปิดดูรายงานภาพรวม",
  "แก้ไขข้อมูลตัวอย่าง",
];

export default function AdminHistoryPage() {
  return (
    <PagePanel
      eyebrow="Admin Console"
      title="ประวัติการใช้งานระบบ"
      description="หน้าตัวอย่างสำหรับแสดง log หรือประวัติการทำงานของระบบ"
    >
      <Card className="clean-card" title="รายการล่าสุด" variant="outlined">
        <div className="data-list">
          {historyItems.map((item) => (
            <div className="data-list-item" key={item}>
              <div className="data-list-main">
                <HistoryOutlined className="list-icon" />
                <Typography.Text>{item}</Typography.Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PagePanel>
  );
}
