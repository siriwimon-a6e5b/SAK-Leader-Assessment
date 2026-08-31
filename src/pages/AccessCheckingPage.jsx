import { appConfig } from "../config/appConfig";

export default function AccessCheckingPage() {
  return (
    <main className="access-page">
      <section className="access-panel">
        <p className="access-eyebrow">{appConfig.appName}</p>
        <h1>กำลังตรวจสอบสิทธิ์การเข้าใช้งานระบบ</h1>
        <p>กรุณารอสักครู่ ระบบกำลังตรวจสอบ token และสิทธิ์ผู้ใช้งาน</p>
      </section>
    </main>
  );
}
