import { Badge } from "antd";
import { useEffect } from "react";
import { refreshApprovalCount, useApprovalNotifications } from "../../stores/approvalNotifications";

export default function ApprovalMenuLabel() {
  const count = useApprovalNotifications((state) => state.count);
  useEffect(() => {
    refreshApprovalCount();
    const refresh = () => refreshApprovalCount();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  return (
    <span className="menu-label-with-badge">
      อนุมัติผลการประเมิน
      {count > 0 ? <Badge className="approval-pending-badge" count={count} overflowCount={99999} title={`รอตรวจสอบ ${count} รายการ`} /> : null}
    </span>
  );
}
