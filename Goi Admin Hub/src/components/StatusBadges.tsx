import { Badge } from "@/components/ui/badge";
import type { CourierStatus, JobStatus, WithdrawalStatus } from "@/lib/constants";

const courierStatusStyles: Record<CourierStatus, string> = {
  "חדש": "bg-blue-100 text-blue-700 border-blue-200",
  "נרשם": "bg-sky-100 text-sky-700 border-sky-200",
  "ממתין לאישור": "bg-amber-100 text-amber-800 border-amber-200",
  "מושהה": "bg-amber-100 text-amber-800 border-amber-200",
  "פעיל": "bg-primary/10 text-primary border-primary/20",
  "לא פעיל": "bg-slate-100 text-slate-700 border-slate-200",
  "חסר פרטים": "bg-orange-100 text-orange-700 border-orange-200",
  "שלחתי עבודה": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "לקח עבודה": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "לא רלוונטי": "bg-zinc-100 text-zinc-600 border-zinc-200",
  "חסום": "bg-red-100 text-red-700 border-red-200",
};
export function CourierStatusBadge({ status }: { status: CourierStatus }) {
  return <Badge variant="outline" className={`font-medium ${courierStatusStyles[status]}`}>{status}</Badge>;
}

const jobStatusStyles: Record<JobStatus, string> = {
  "טיוטה": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "נשלחה לשליחים": "bg-sky-100 text-sky-700 border-sky-200",
  "ממתינה לתגובות": "bg-amber-100 text-amber-800 border-amber-200",
  "יש שליחים שאישרו": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "נבחר שליח": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "פעילה": "bg-primary/10 text-primary border-primary/20",
  "הושלמה": "bg-green-100 text-green-800 border-green-200",
  "בוטלה": "bg-zinc-100 text-zinc-500 border-zinc-200",
  "תקועה": "bg-red-100 text-red-700 border-red-200",
};
const courierStepStyles: Record<string, string> = {
  "שליח אישר": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "בדרך לאיסוף": "bg-blue-100 text-blue-700 border-blue-200",
  "הגעתי לאיסוף": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "אספתי": "bg-violet-100 text-violet-700 border-violet-200",
  "בדרך למסירה": "bg-purple-100 text-purple-700 border-purple-200",
  "נמסר": "bg-green-100 text-green-800 border-green-200",
};
export function JobStatusBadge({ status, courierStep }: { status: JobStatus; courierStep?: string | null }) {
  // When a courier step exists and job is still in progress, show the granular step instead
  if (courierStep && status !== "בוטלה" && status !== "טיוטה") {
    const cls = courierStepStyles[courierStep] || "bg-primary/10 text-primary border-primary/20";
    return <Badge variant="outline" className={`font-medium ${cls}`}>{courierStep}</Badge>;
  }
  return <Badge variant="outline" className={`font-medium ${jobStatusStyles[status]}`}>{status}</Badge>;
}

const withdrawStyles: Record<WithdrawalStatus, string> = {
  "ממתינה": "bg-amber-100 text-amber-800 border-amber-200",
  "אושרה": "bg-sky-100 text-sky-700 border-sky-200",
  "שולמה": "bg-primary/10 text-primary border-primary/20",
  "נדחתה": "bg-red-100 text-red-700 border-red-200",
};
export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return <Badge variant="outline" className={`font-medium ${withdrawStyles[status]}`}>{status}</Badge>;
}
