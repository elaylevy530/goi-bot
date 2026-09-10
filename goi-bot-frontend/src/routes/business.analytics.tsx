import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bike, CheckCheck, Download, Package, Wallet } from "lucide-react";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { DataTable, Panel, SelectBox, exportCsv, money } from "@/components/business/goi/GoiUi";
import {
  isHistoryJob,
  isIncomingJob,
  isSameDay,
  isSameMonth,
  isTrackingJob,
  jobPrice,
  jobSourceLabel,
} from "@/lib/business-panel";
import type { NestJob } from "@/lib/nest-jobs";

export const Route = createFileRoute("/business/analytics")({
  head: () => ({ meta: [{ title: "דוחות וסטטיסטיקות — Goi" }] }),
  ssr: false,
  component: AnalyticsPage,
});

function inPeriod(job: NestJob, period: string) {
  if (period === "היום") return isSameDay(job.created_at);
  if (period === "השבוע") {
    const d = job.created_at ? new Date(job.created_at) : null;
    if (!d) return false;
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return d >= start;
  }
  if (period === "החודש") return isSameMonth(job.created_at);
  return true;
}

function AnalyticsPage() {
  const { data: me } = useMyBusiness();
  const { data: jobs = [] } = useBusinessJobs(me?.id);
  const [period, setPeriod] = useState("החודש");
  const shown = useMemo(() => jobs.filter((j) => inPeriod(j, period)), [jobs, period]);
  const completed = shown.filter((j) => j.status === "הושלמה");
  const cancelled = shown.filter((j) => j.status === "בוטלה");
  const spend = shown.reduce((s, j) => s + jobPrice(j), 0);
  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of shown) map.set(jobSourceLabel(j), (map.get(jobSourceLabel(j)) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [shown]);
  const maxSource = Math.max(1, ...sources.map(([, n]) => n));

  return (
    <BusinessShell title="דוחות וסטטיסטיקות" subtitle="תמונת מצב של פעילות המשלוחים בעסק">
      <div className="extra-page extra-reports">
        <div className="section-toolbar">
          <SelectBox label="תקופת דוח" value={period} onChange={setPeriod} options={["היום", "השבוע", "החודש"]} />
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              exportCsv(
                "GOI-report",
                ["מספר משלוח", "תאריך", "סטטוס", "מקור", "עלות"],
                shown.map((j) => [j.job_number, j.created_at || "", j.status, jobSourceLabel(j), jobPrice(j)]),
              )
            }
          >
            <Download size={16} />
            ייצוא דוח
          </button>
        </div>
        <div className="four-cols">
          <Panel className="report-number">
            <Package />
            <strong>{shown.length}</strong>
            <p>סה״כ הזמנות</p>
          </Panel>
          <Panel className="report-number">
            <CheckCheck />
            <strong>{completed.length}</strong>
            <p>נמסרו בהצלחה</p>
          </Panel>
          <Panel className="report-number">
            <Wallet />
            <strong>{money(spend)}</strong>
            <p>עלות משלוחים</p>
          </Panel>
          <Panel className="report-number">
            <Bike />
            <strong>{shown.filter(isTrackingJob).length}</strong>
            <p>משלוחים פעילים</p>
          </Panel>
        </div>
        <div className="two-cols">
          <Panel title="משלוחים לפי מקור הזמנה">
            {sources.length === 0 ? (
              <p className="hint">אין משלוחים בתקופה שנבחרה.</p>
            ) : (
              <div className="bar-chart">
                {sources.map(([name, count], i) => (
                  <div key={name}>
                    <span>{name}</span>
                    <div>
                      <i style={{ width: `${(count / maxSource) * 100}%`, background: ["#08913e", "#2092df", "#9c64c9", "#779a85"][i % 4] }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="סיכום פעילות">
            <DataTable
              headers={["סטטוס", "משלוחים"]}
              rows={[
                ["ממתינות לאישור", shown.filter(isIncomingJob).length],
                ["בתהליך", shown.filter(isTrackingJob).length],
                ["נמסרו", completed.length],
                ["בוטלו", cancelled.length],
                ["היסטוריה", shown.filter(isHistoryJob).length],
              ]}
            />
          </Panel>
        </div>
        <p className="hint">הנתונים מגיעים ממשלוחי העסק האמיתיים. הייצוא כולל רק את התקופה שנבחרה.</p>
      </div>
    </BusinessShell>
  );
}
