import { Badge } from "@/components/ui/badge";
import type { CourierStatus, JobStatus, WithdrawalStatus } from "@/lib/constants";

/** Soft status pairs — aligned with Phase 0 tokens (success / warning / info / danger). */
const tone = {
  success: "bg-success-bg text-success-text border-primary/20",
  warning: "bg-warning-bg text-warning-text border-warning/30",
  info: "bg-info-bg text-info-text border-border",
  danger: "bg-danger-bg text-danger-text border-destructive/20",
  muted: "bg-muted text-text-muted border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
} as const;

const courierStatusStyles: Record<CourierStatus, string> = {
  "חדש": tone.info,
  "נרשם": tone.info,
  "ממתין לאישור": tone.warning,
  "מושהה": tone.warning,
  "פעיל": tone.primary,
  "לא פעיל": tone.muted,
  "חסר פרטים": tone.warning,
  "שלחתי עבודה": tone.info,
  "לקח עבודה": tone.success,
  "לא רלוונטי": tone.muted,
  "חסום": tone.danger,
};
export function CourierStatusBadge({ status }: { status: CourierStatus }) {
  return <Badge variant="outline" className={`font-medium ${courierStatusStyles[status]}`}>{status}</Badge>;
}

const jobStatusStyles: Record<JobStatus, string> = {
  "טיוטה": tone.muted,
  "נשלחה לשליחים": tone.info,
  "ממתינה לתגובות": tone.warning,
  "יש שליחים שאישרו": tone.info,
  "נבחר שליח": tone.success,
  "פעילה": tone.primary,
  "הושלמה": tone.success,
  "בוטלה": tone.muted,
  "תקועה": tone.danger,
};
const courierStepStyles: Record<string, string> = {
  "שליח אישר": tone.success,
  "בדרך לאיסוף": tone.info,
  "הגעתי לאיסוף": tone.info,
  "אספתי": tone.info,
  "בדרך למסירה": tone.warning,
  "נמסר": tone.success,
};
export function JobStatusBadge({ status, courierStep }: { status: JobStatus; courierStep?: string | null }) {
  // When a courier step exists and job is still in progress, show the granular step instead
  if (courierStep && status !== "בוטלה" && status !== "טיוטה") {
    const cls = courierStepStyles[courierStep] || tone.primary;
    return <Badge variant="outline" className={`font-medium ${cls}`}>{courierStep}</Badge>;
  }
  return <Badge variant="outline" className={`font-medium ${jobStatusStyles[status]}`}>{status}</Badge>;
}

const withdrawStyles: Record<WithdrawalStatus, string> = {
  "ממתינה": tone.warning,
  "אושרה": tone.info,
  "שולמה": tone.primary,
  "נדחתה": tone.danger,
};
export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return <Badge variant="outline" className={`font-medium ${withdrawStyles[status]}`}>{status}</Badge>;
}
