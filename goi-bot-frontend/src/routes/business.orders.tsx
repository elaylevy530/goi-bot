import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { KpiCard } from "@/components/business/KpiCard";
import { EmptyState } from "./business.dashboard";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/StatusBadges";
import { nestCreateJob, nestGetJob, nestListJobs, type NestJob } from "@/lib/nest-jobs";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { geocodeJob } from "@/lib/geocode-job.functions";
import type { JobStatus } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  CANCELLED_STATUSES,
  DONE_STATUSES,
  avgDeliveryMinutes,
  exportJobsCsv,
  formatDelta,
  formatJobWhen,
  isSameMonth,
  jobCourierAvatar,
  jobCourierName,
  jobDurationLabel,
  jobPrice,
  percentDelta,
  statusPillClass,
} from "@/lib/business-panel";
import { CourierAvatar } from "@/components/CourierAvatar";
import { Calendar, Clock, CreditCard, Download, Eye, MoreHorizontal, Package, Printer, Repeat, Search } from "lucide-react";

type TabKey = "all" | "active" | "done" | "cancelled";

export const Route = createFileRoute("/business/orders")({
  head: () => ({ meta: [{ title: "המשלוחים שלי — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: OrdersPage,
});

const TABS: Array<{ key: TabKey; label: string; match: (j: NestJob) => boolean }> = [
  { key: "all", label: "כל ההזמנות", match: () => true },
  { key: "active", label: "פעילות", match: (j) => ACTIVE_STATUSES.has(j.status) || j.status === "יש שליחים שאישרו" },
  { key: "done", label: "הושלמו", match: (j) => DONE_STATUSES.has(j.status) },
  { key: "cancelled", label: "בוטלו", match: (j) => CANCELLED_STATUSES.has(j.status) },
];

function OrdersPage() {
  const { q: searchFromUrl } = Route.useSearch();
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dispatchFn = useServerFn(dispatchJobToCouriers);
  const geocodeFn = useServerFn(geocodeJob);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState(searchFromUrl);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 7;

  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  const reorder = useMutation({
    mutationFn: async (jobId: string) => {
      if (!me) throw new Error("no profile");
      const full = await nestGetJob(jobId);
      if ((full as { customer_id?: string }).customer_id !== me.id) throw new Error("not found");
      const {
        id: _i,
        created_at,
        updated_at,
        job_number,
        status,
        selected_courier_id,
        selected_quote_id,
        recipient_tracking_token,
        ...rest
      } = full as Record<string, unknown> & NestJob;
      const data = await nestCreateJob({ ...rest, customer_id: me.id, status: "נשלחה לשליחים" });
      geocodeFn({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));
      if ((data as { pricing_type?: string }).pricing_type !== "quote_request") {
        try {
          await dispatchFn({ data: { jobId: data.id } });
        } catch (e) {
          console.error("dispatch", e);
        }
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("משלוח חדש נוצר ונשלח לשליחים ✅");
      qc.invalidateQueries({ queryKey: ["business-orders"] });
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: jobs } = useQuery({
    queryKey: ["business-orders", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListJobs({ limit: 200 }),
  });

  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["business-orders"] });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  const all = jobs ?? [];
  const monthJobs = all.filter((j) => isSameMonth(j.created_at));
  const avgMin = avgDeliveryMinutes(monthJobs);
  const monthSpend = Math.round(monthJobs.reduce((s, j) => s + jobPrice(j), 0));
  const lastMonthJobs = all.filter((j) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return isSameMonth(j.created_at, d);
  });
  const monthDelta = percentDelta(monthJobs.length, lastMonthJobs.length);

  const filtered = useMemo(() => {
    const matcher = TABS.find((t) => t.key === tab)?.match ?? (() => true);
    let list = all.filter(matcher);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.job_number?.toLowerCase().includes(q) ||
        (j.pickup_address || j.pickup_area || "").toLowerCase().includes(q) ||
        (j.dropoff_address || j.dropoff_area || "").toLowerCase().includes(q) ||
        (jobCourierName(j) || "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((j) => j.status === statusFilter);
    }
    return list;
  }, [all, tab, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const statuses = useMemo(() => Array.from(new Set(all.map((j) => j.status))).filter(Boolean), [all]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, statusFilter]);

  const counts = {
    all: all.length,
    active: all.filter((j) => ACTIVE_STATUSES.has(j.status) || j.status === "יש שליחים שאישרו").length,
    done: all.filter((j) => DONE_STATUSES.has(j.status)).length,
    cancelled: all.filter((j) => CANCELLED_STATUSES.has(j.status)).length,
  };

  return (
    <BusinessShell title="המשלוחים שלי" subtitle={`${all.length} משלוחים בסך הכל`}>
      <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">
        <div className="hidden gap-6 lg:flex">
          <KpiCard
            title="סה״כ הזמנות החודש"
            value={String(monthJobs.length)}
            delta={formatDelta(monthDelta)}
            icon={Package}
            iconClass="bg-kpi-volume-bg text-primary"
          />
          <KpiCard
            title="סה״כ עלות משלוחים"
            value={`₪${monthSpend.toLocaleString("he-IL")}`}
            icon={CreditCard}
            iconClass="bg-kpi-fleet-bg text-success-text"
          />
          <KpiCard
            title="זמן ממוצע למשלוח"
            value={avgMin == null ? "—" : `${avgMin} דק׳`}
            icon={Clock}
            iconClass="bg-kpi-time-bg text-warning-text"
          />
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition",
                  tab === t.key
                    ? "border-b-2 border-primary font-medium text-text-strong"
                    : "text-text-muted hover:text-text-strong",
                )}
              >
                {t.label}
                <span className={cn("rounded-pill px-1.5 py-0.5 text-[11px] font-bold", tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-text-muted")}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1 md:max-w-xs">
                <Search className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש מספר הזמנה..."
                  className="h-9 w-full rounded-lg border border-border bg-surface pe-9 ps-3 text-sm outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-text-subtle"
                aria-label="סינון לפי סטטוס"
              >
                <option value="all">כל הסטטוסים</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text-subtle md:inline-flex">
                <Calendar className="size-3.5" /> החודש
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportJobsCsv(filtered)}>
                <Download className="size-4" /> ייצא
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" /> הדפס
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Package} title="אין משלוחים בקטגוריה זו" desc="כשתזמין משלוח, הוא יופיע כאן." ctaLabel="הזמן משלוח" ctaTo="/business/new-delivery" />
            </div>
          ) : (
            <>
              <div className="space-y-2.5 p-4 md:hidden">
                {filtered.map((j) => (
                  <div key={j.id} className="rounded-2xl border border-border bg-surface p-3.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <Link to="/business/order/$id" params={{ id: j.id }} className="font-mono text-[13px] font-bold text-primary">
                        {j.job_number}
                      </Link>
                      <JobStatusBadge status={j.status as JobStatus} courierStep={(j as { courier_step?: string }).courier_step} />
                    </div>
                    <div className="mb-2 space-y-1 text-[13px] text-text-subtle">
                      <div className="truncate">איסוף: {j.pickup_address || j.pickup_area || "—"}</div>
                      <div className="truncate">מסירה: {j.dropoff_address || j.dropoff_area || "—"}</div>
                      {jobCourierName(j) && <div className="truncate">שליח: {jobCourierName(j)}</div>}
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <div className="truncate text-[11px] text-text-muted">{formatJobWhen(j.created_at)}</div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[15px] font-black">₪{jobPrice(j).toLocaleString("he-IL")}</span>
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                          <Link to="/business/order/$id" params={{ id: j.id }}><Eye className="size-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => reorder.mutate(j.id)} disabled={reorder.isPending}>
                          <Repeat className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-xs text-text-muted">
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={paged.length > 0 && paged.every((j) => selected.has(j.id))}
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) paged.forEach((j) => next.add(j.id));
                              else paged.forEach((j) => next.delete(j.id));
                              return next;
                            });
                          }}
                          aria-label="בחר הכל בעמוד"
                        />
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">מס׳ הזמנה</th>
                      <th className="px-3 py-3 text-right font-semibold">תאריך ושעה</th>
                      <th className="px-3 py-3 text-right font-semibold">כתובת איסוף</th>
                      <th className="px-3 py-3 text-right font-semibold">יעד מסירה</th>
                      <th className="px-3 py-3 text-right font-semibold">שליח</th>
                      <th className="px-3 py-3 text-right font-semibold">סטטוס</th>
                      <th className="px-3 py-3 text-right font-semibold">זמן</th>
                      <th className="px-3 py-3 text-right font-semibold">עלות</th>
                      <th className="px-3 py-3 text-right font-semibold">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((j) => {
                      const name = jobCourierName(j);
                      return (
                        <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={selected.has(j.id)}
                              onChange={(e) => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(j.id);
                                  else next.delete(j.id);
                                  return next;
                                });
                              }}
                              aria-label={`בחר ${j.job_number}`}
                            />
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            <Link to="/business/order/$id" params={{ id: j.id }} className="font-bold text-primary hover:underline">
                              {j.job_number}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-xs text-text-muted">{formatJobWhen(j.created_at)}</td>
                          <td className="max-w-[10rem] truncate px-3 py-3">{j.pickup_address || j.pickup_area || "—"}</td>
                          <td className="max-w-[10rem] truncate px-3 py-3">{j.dropoff_address || j.dropoff_area || "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <CourierAvatar path={jobCourierAvatar(j)} name={name} size={24} />
                              <span className="truncate">{name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex rounded-pill px-2.5 py-1 text-xs font-bold", statusPillClass(j.status))}>
                              {j.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-text-muted">{jobDurationLabel(j)}</td>
                          <td className="px-3 py-3 font-bold">₪{jobPrice(j).toLocaleString("he-IL")}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button asChild variant="ghost" size="sm" title="צפה">
                                <Link to="/business/order/$id" params={{ id: j.id }}><Eye className="size-4" /></Link>
                              </Button>
                              <Button variant="ghost" size="sm" title="הזמן שוב" onClick={() => reorder.mutate(j.id)} disabled={reorder.isPending}>
                                <Repeat className="size-4" />
                              </Button>
                              <Button asChild variant="ghost" size="sm" title="עוד">
                                <Link to="/business/order/$id" params={{ id: j.id }}><MoreHorizontal className="size-4" /></Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-text-muted">
                  <span>
                    מציג {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} מתוך {filtered.length} הזמנות
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
                    >
                      הקודם
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                      .map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPage(n)}
                          className={cn(
                            "min-w-8 rounded-md px-2 py-1.5 font-bold",
                            n === currentPage ? "bg-primary text-primary-foreground" : "border border-border",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    <button
                      type="button"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
                    >
                      הבא
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}
