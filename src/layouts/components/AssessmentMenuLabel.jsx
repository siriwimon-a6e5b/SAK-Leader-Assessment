import { Badge } from "antd";
import { useEffect } from "react";
import {
  refreshPendingAssessments,
  usePendingAssessments,
} from "../../stores/pendingAssessments";

export default function AssessmentMenuLabel() {
  const count = usePendingAssessments((state) => state.count);

  useEffect(() => {
    refreshPendingAssessments();
    const refresh = () => refreshPendingAssessments(true);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return (
    <span className="annual-assessment-menu-label">
      ประเมินประจำปี
      {count > 0 ? (
        <Badge
          className="annual-assessment-menu-badge"
          count={count}
          overflowCount={99}
          title={`รอประเมิน ${count} คน`}
        />
      ) : null}
    </span>
  );
}
