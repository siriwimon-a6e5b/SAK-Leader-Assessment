import AdminAssessmentExportPage from "../Admin/AdminAssessmentExportPage";

const REGIONAL_SCORES_API = "/api/insurances/getUserRegionalAssessmentScores";

export default function ManagerDashboardPage() {
  return (
    <AdminAssessmentExportPage
      eyebrow="Team Overview"
      title="ภาพรวมทีม"
      description="ดูรายงานผลประเมินของหัวหน้าผู้ถูกประเมินในพื้นที่ พร้อมตัวกรองตามสิทธิ์ระดับเขตและระดับบริหาร"
      reportApi={REGIONAL_SCORES_API}
      isUserPage
    />
  );
}
