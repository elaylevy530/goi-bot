import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Download, FileText } from "lucide-react";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { Avatar, Badge, DataTable, Panel, SearchBox, SelectBox, exportCsv, money } from "@/components/business/goi/GoiUi";
import {
  formatJobWhen,
  isHistoryJob,
  isSameDay,
  isSameMonth,
  jobBadgeTone,
  jobCourierName,
  jobPrice,
  jobRecipientName,
  jobRecipientPhone,
  jobSourceLabel,
} from "@/lib/business-panel";
import type { NestJob } from "@/lib/nest-jobs";

export const Route = createFileRoute("/business/history")({
  head: () => ({ meta: [{ title: "היסטוריית משלוחים — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: HistoryPage,
});

function inPeriod(job: NestJob, period: string) {
  if (period === "היום") return isSameDay(job.created_at);
  if (period === "השבוע") {
    const d = job.created_at ? new Date(job.created_at) : null;
    if (!d) return false;
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return d >= start;
  }
  if (period === "החודש") return isSameMonth(job.created_at);
  return true;
}

function HistoryPage() {
  const { q } = Route.useSearch();
  const { data: me } = useMyBusiness();
  const { data: jobs = [] } = useBusinessJobs(me?.id);
  const [query, setQuery] = useState(q);
  const [period, setPeriod] = useState("הכל");
  const [source, setSource] = useState("הכל");
  const [status, setStatus] = useState("all");
  const [courier, setCourier] = useState("הכל");
  const [pageNumber, setPageNumber] = useState(1);

  const history = useMemo(() => jobs.filter(isHistoryJob), [jobs]);
  const couriers = Array.from(new Set(history.map((j) => jobCourierName(j)).filter(Boolean))) as string[];
  const sources = Array.from(new Set(history.map(jobSourceLabel)));
  const shown = history
    .filter((j) => inPeriod(j, period))
    .filter((j) => source === "הכל" || jobSourceLabel(j) === source)
    .filter((j) => status === "all" || j.status === status)
    .filter((j) => courier === "הכל" || jobCourierName(j) === courier)
    .filter((j) => `${j.job_number} ${jobRecipientName(j)} ${j.dropoff_address || ""} ${jobRecipientPhone(j)}`.includes(query.trim()));

  const pages = Math.max(1, Math.ceil(shown.length / 7));
  const slice = shown.slice((pageNumber - 1) * 7, pageNumber * 7);

  return (
    <BusinessShell title="היסטוריית משלוחים" subtitle="צפייה בכל המשלוחים שהסתיימו או בוטלו">
      <div className="history-filters">
        <SearchBox
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPageNumber(1);
          }}
          placeholder="חיפוש לפי מספר משלוח, לקוח או כתובת..."
        />
        <SelectBox label="תאריך" value={period} onChange={(v) => { setPeriod(v); setPageNumber(1); }} options={["הכל", "היום", "השבוע", "החודש"]} />
        <SelectBox label="מקור הזמנה" value={source} onChange={(v) => { setSource(v); setPageNumber(1); }} options={["הכל", ...sources]} />
        <SelectBox
          label="סטטוס"
          value={status}
          onChange={(v) => { setStatus(v); setPageNumber(1); }}
          options={[
            { value: "all", label: "כל הסטטוסים" },
            { value: "הושלמה", label: "נמסר" },
            { value: "בוטלה", label: "בוטל" },
          ]}
        />
        <SelectBox label="שליח" value={courier} onChange={(v) => { setCourier(v); setPageNumber(1); }} options={["הכל", ...couriers]} />
        <button
          type="button"
          className="btn outline green"
          onClick={() =>
            exportCsv(
              "GOI-history",
              ["מספר משלוח", "לקוח", "כתובת", "מקור", "סטטוס", "מחיר"],
              shown.map((o) => [o.job_number, jobRecipientName(o), `${o.dropoff_address || ""}`, jobSourceLabel(o), o.status, jobPrice(o)]),
            )
          }
        >
          <Download size={17} />
          ייצוא
        </button>
      </div>
      <p className="result-count">
        סה״כ <strong>{shown.length} משלוחים</strong>
      </p>
      <Panel>
        <DataTable
          className="history-desktop"
          headers={["מספר משלוח", "תאריך ושעה", "מקור הזמנה", "לקוח", "כתובת מסירה", "שליח", "סטטוס", "עלות", "פרטים"]}
          rows={slice.map((o) => [
            <Link key="id" className="link" to="/business/order/$id" params={{ id: o.id }}>
              #{o.job_number} <ChevronLeft size={13} />
            </Link>,
            <span key="d">
              {formatJobWhen(o.created_at)}
            </span>,
            <Badge key="s" text={jobSourceLabel(o)} tone="green" />,
            <span key="n">
              {jobRecipientName(o)}
              <small>{jobRecipientPhone(o)}</small>
            </span>,
            <span key="a">
              {o.dropoff_address || o.dropoff_area || "—"}
            </span>,
            <span key="c" className="customer-cell">
              <Avatar name={jobCourierName(o) || "—"} />
              <span>{jobCourierName(o) || "לא שובץ"}</span>
            </span>,
            <Badge key="status" text={o.status} tone={jobBadgeTone(o.status)} />,
            money(jobPrice(o)),
            <Link key="p" className="link" to="/business/order/$id" params={{ id: o.id }}>
              <FileText size={15} />
              פרטים
            </Link>,
          ])}
        />
        <div className="history-mobile">
          {slice.map((o) => (
            <Link className="history-mobile-card" key={o.id} to="/business/order/$id" params={{ id: o.id }}>
              <div>
                <strong>#{o.job_number}</strong>
                <Badge text={o.status} tone={jobBadgeTone(o.status)} />
                <Avatar name={jobCourierName(o) || "—"} />
              </div>
              <div>
                <span>
                  לקוח<strong>{jobRecipientName(o)}</strong>
                </span>
                <span>
                  כתובת מסירה<strong>{o.dropoff_address || o.dropoff_area || "—"}</strong>
                </span>
                <span>
                  שליח<strong>{jobCourierName(o) || "לא שובץ"}</strong>
                </span>
              </div>
              <footer>
                <Badge text={jobSourceLabel(o)} tone="green" />
                <span>{formatJobWhen(o.created_at)}</span>
                <b>{money(jobPrice(o))}</b>
              </footer>
            </Link>
          ))}
        </div>
        <div className="pagination">
          <span>
            עמוד {pageNumber} מתוך {pages}
          </span>
          <div>
            <button type="button" disabled={pageNumber === 1} onClick={() => setPageNumber((n) => n - 1)} aria-label="עמוד קודם">
              <ChevronLeft className="rotate-180" size={16} />
            </button>
            {Array.from({ length: pages }, (_, i) => (
              <button type="button" key={i} className={pageNumber === i + 1 ? "active" : ""} onClick={() => setPageNumber(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button type="button" disabled={pageNumber >= pages} onClick={() => setPageNumber((n) => n + 1)} aria-label="עמוד הבא">
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </Panel>
    </BusinessShell>
  );
}
