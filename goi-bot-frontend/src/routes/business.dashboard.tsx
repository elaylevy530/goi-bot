import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { KpiCard } from "@/components/business/KpiCard";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { AddressAutocomplete } from "@/components/customer/AddressAutocomplete";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ListEmptyState } from "@/components/ListEmptyState";
import { nestListJobs, type NestJob } from "@/lib/nest-jobs";
import { playBeep } from "@/lib/offer-alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  DONE_STATUSES,
  WAITING_STATUSES,
  formatDelta,
  formatJobWhen,
  isSameDay,
  isSameMonth,
  jobCourierLabel,
  jobPrice,
  percentDelta,
  pinsFromJobs,
  statusPillClass,
} from "@/lib/business-panel";
import {
  Clock,
  CreditCard,
  MapPin,
  Package,
  Plus,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/business/dashboard")({
  head: () => ({ meta: [{ title: "האזור העסקי — Goi" }] }),
  ssr: false,
  component: BusinessDashboard,
});

export function EmptyState({ icon: Icon, title, desc, action, ctaLabel, ctaTo }: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <ListEmptyState
      title={title}
      description={desc}
      icon={<Icon className="size-6" />}
      action={
        action ??
        (ctaLabel && ctaTo ? (
          <Link
            to={ctaTo as never}
            className="inline-flex h-11 items-center gap-2 rounded-pill bg-primary px-5 font-black text-primary-foreground shadow-fab"
          >
            {ctaLabel}
          </Link>
        ) : undefined)
      }
    />
  );
}

type OpsTab = "waiting" | "active" | "done";

const CLAIM_STATUSES = new Set(["נבחר שליח", "פעילה"]);
const POLL_MS = 12_000;

function tabForStatus(status: string): OpsTab | null {
  if (WAITING_STATUSES.has(status)) return "waiting";
  if (ACTIVE_STATUSES.has(status)) return "active";
  if (DONE_STATUSES.has(status)) return "done";
  return null;
}

function statusToastMessage(prev: string, next: string, jobNumber?: string): string | null {
  const label = jobNumber ? `#${jobNumber}` : "משלוח";
  if (prev !== next && CLAIM_STATUSES.has(next) && !CLAIM_STATUSES.has(prev)) {
    return `${label} — שליח שובץ ✓`;
  }
  if (next === "הושלמה" && prev !== "הושלמה") return `${label} — המשלוח הושלם`;
  if (next === "יש שליחים שאישרו" && prev !== next) return `${label} — יש שליחים שאישרו`;
  if (next === "ממתינה לתגובות" && prev === "נשלחה לשליחים") return `${label} — ממתין לתגובות שליחים`;
  return null;
}

function BusinessDashboard() {
  const { data: me } = useMyBusiness();
  const navigate = useNavigate();
  const [tab, setTab] = useState<OpsTab>("waiting");
  const [dropoffText, setDropoffText] = useState("");
  const prevStatusesRef = useRef<Map<string, string> | null>(null);
  const primedRef = useRef(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["biz-dashboard-orders", me?.id],
    enabled: !!me?.id,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    queryFn: () => nestListJobs({ limit: 50 }),
  });

  const all = orders ?? [];

  useEffect(() => {
    if (!orders) return;
    const nextMap = new Map(orders.map((j) => [j.id, j.status]));
    const prev = prevStatusesRef.current;
    if (!primedRef.current) {
      primedRef.current = true;
      prevStatusesRef.current = nextMap;
      return;
    }
    if (prev) {
      for (const job of orders) {
        const old = prev.get(job.id);
        if (!old || old === job.status) continue;
        const msg = statusToastMessage(old, job.status, job.job_number);
        if (!msg) continue;
        const claimed = CLAIM_STATUSES.has(job.status) && !CLAIM_STATUSES.has(old);
        if (claimed) {
          toast.success(msg);
          try { playBeep(); } catch { /* ignore */ }
        } else if (job.status === "הושלמה") {
          toast.success(msg);
        } else {
          toast.message(msg);
        }
      }
    }
    prevStatusesRef.current = nextMap;
  }, [orders]);

  const waiting = useMemo(() => all.filter((o) => WAITING_STATUSES.has(o.status)), [all]);
  const active = useMemo(() => all.filter((o) => ACTIVE_STATUSES.has(o.status)), [all]);
  const done = useMemo(() => all.filter((o) => DONE_STATUSES.has(o.status)).slice(0, 20), [all]);
  const list = tab === "waiting" ? waiting : tab === "active" ? active : done;

  const pickupAddress = ((me as { pickup_address?: string | null } | null)?.pickup_address ?? "").trim();
  const kpis = useMemo(() => computeKpis(all), [all]);
  const pins = useMemo(() => pinsFromJobs(active), [active]);
  const recent = all.slice(0, 5);

  const goQuickOrder = () => {
    navigate({
      to: "/business/new-delivery",
      search: dropoffText.trim() ? { to: dropoffText.trim() } : { to: undefined, timing: undefined },
    });
  };

  return (
    <BusinessShell>
      <div className="space-y-4 px-4 pb-8 pt-4 lg:hidden">
        <div className="flex items-start justify-between gap-3 text-right">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-text-strong">לוח משלוחים</h1>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {(me as { business_name?: string; name?: string } | null)?.business_name ||
                (me as { name?: string } | null)?.name ||
                "העסק שלי"}
            </p>
          </div>
          <Link
            to="/business/new-delivery"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-black text-primary-foreground shadow-fab transition active:scale-[0.98]"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            הזמן
          </Link>
        </div>

        <SegmentedControl
          aria-label="סינון משלוחים"
          value={tab}
          onValueChange={(v) => setTab(v as OpsTab)}
          options={[
            { value: "waiting", label: `ממתינים (${waiting.length})` },
            { value: "active", label: `בביצוע (${active.length})` },
            { value: "done", label: `הושלמו (${done.length})` },
          ]}
        />

        <section className="space-y-2.5" aria-live="polite">
          {isLoading && !orders ? (
            <div className="rounded-card bg-surface px-4 py-10 text-center text-sm text-text-muted shadow-card">
              טוען משלוחים…
            </div>
          ) : list.length === 0 ? (
            <ListEmptyState
              title={tab === "waiting" ? "אין משלוחים ממתינים" : tab === "active" ? "אין משלוחים בביצוע" : "אין משלוחים שהושלמו לאחרונה"}
              description={tab === "done" ? "משלוחים שהושלמו יופיעו כאן" : "שדרו משלוח חדש — השליחים יקבלו אותו מיד"}
              icon={<Package className="size-6" />}
              action={
                tab !== "done" ? (
                  <Link
                    to="/business/new-delivery"
                    className="inline-flex h-11 items-center gap-2 rounded-pill bg-primary px-5 font-black text-primary-foreground shadow-fab"
                  >
                    <Plus className="size-4" /> הזמן משלוח
                  </Link>
                ) : (
                  <Link to="/business/orders" className="inline-flex h-11 items-center gap-2 rounded-pill bg-navy px-5 font-black text-white">
                    לכל ההזמנות
                  </Link>
                )
              }
            />
          ) : (
            list.map((o) => <DeliveryCard key={o.id} job={o} />)
          )}
        </section>
      </div>

      <div className="hidden space-y-6 p-8 lg:block">
        <div className="flex gap-4">
          <KpiCard
            title="משלוחים היום"
            value={String(kpis.todayCount)}
            delta={formatDelta(kpis.todayDelta)}
            icon={Package}
            iconClass="bg-kpi-volume-bg text-info-text"
          />
          <KpiCard
            title="שליחים פעילים"
            value={kpis.activeCouriers === 0 ? "0" : `${kpis.activeCouriers} שליחים`}
            icon={Truck}
            iconClass="bg-kpi-fleet-bg text-success-text"
          />
          <KpiCard
            title="זמן ממוצע"
            value={kpis.avgMin == null ? "—" : `${kpis.avgMin} דק׳`}
            icon={Clock}
            iconClass="bg-kpi-time-bg text-warning-text"
          />
          <KpiCard
            title="עלות חודשית"
            value={`₪${kpis.monthSpend.toLocaleString("he-IL")}`}
            delta={formatDelta(kpis.monthDelta)}
            icon={CreditCard}
            iconClass="bg-kpi-cost-bg text-danger-text"
          />
        </div>

        <div className="flex h-[22.5rem] gap-6">
          <section className="flex w-[22.5rem] shrink-0 flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-kpi-volume-bg px-2 py-1 text-xs font-bold text-info-text">מהיר</span>
              <h2 className="text-lg font-bold text-text-strong">הזמנה מהירה</h2>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-2.5 text-sm text-text-subtle">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="truncate">{pickupAddress || "כתובת האיסוף מהפרופיל"}</span>
              </div>
              <AddressAutocomplete
                label="כתובת מסירה"
                placeholder="לאן לשלוח? (הקלד כתובת מסירה)"
                value={dropoffText}
                onChange={setDropoffText}
                onSelect={(p) => setDropoffText(p.address)}
                accent="red"
              />
            </div>
            <button
              type="button"
              onClick={goQuickOrder}
              className="h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              הזמן שליח עכשיו
            </button>
          </section>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-success-text">
                <span>בזמן אמת</span>
                <span className="size-1.5 rounded-full bg-primary" />
              </div>
              <h2 className="text-sm font-bold text-text-strong">מעקב חי - שליחים בתנועה</h2>
            </div>
            <div className="relative min-h-0 flex-1">
              <LiveJobsMap pins={pins} />
              {active.length === 0 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-muted/40 text-sm text-text-muted">
                  אין שליחים פעילים כרגע
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/business/orders" className="text-sm font-semibold text-text-muted hover:text-text-strong">
              הצג את כל ההזמנות ←
            </Link>
            <h2 className="text-base font-bold text-text-strong">הזמנות אחרונות</h2>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-text-muted">עדיין אין הזמנות</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-text-muted">
                  <th className="px-4 py-3 text-right font-semibold">מס׳ הזמנה</th>
                  <th className="px-4 py-3 text-right font-semibold">תאריך ושעה</th>
                  <th className="px-4 py-3 text-right font-semibold">יעד מסירה</th>
                  <th className="px-4 py-3 text-right font-semibold">שליח</th>
                  <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
                  <th className="px-4 py-3 text-right font-semibold">עלות</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3.5">
                      <Link to="/business/order/$id" params={{ id: job.id }} className="font-mono font-bold text-primary hover:underline">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-text-subtle">{formatJobWhen(job.created_at)}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3.5">{job.dropoff_address || job.dropoff_area || "—"}</td>
                    <td className="px-4 py-3.5">{jobCourierLabel(job)}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex rounded-pill px-2.5 py-1 text-xs font-bold", statusPillClass(job.status))}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold">₪{jobPrice(job).toLocaleString("he-IL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}

function computeKpis(jobs: NestJob[]) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const todayCount = jobs.filter((j) => isSameDay(j.created_at)).length;
  const yesterdayCount = jobs.filter((j) => isSameDay(j.created_at, yesterday)).length;
  const monthJobs = jobs.filter((j) => isSameMonth(j.created_at));
  const lastMonthJobs = jobs.filter((j) => isSameMonth(j.created_at, lastMonth));
  const monthSpend = Math.round(monthJobs.reduce((s, j) => s + jobPrice(j), 0));
  const lastMonthSpend = Math.round(lastMonthJobs.reduce((s, j) => s + jobPrice(j), 0));
  const active = jobs.filter((j) => ACTIVE_STATUSES.has(j.status));
  const courierIds = new Set(active.map((j) => j.selected_courier_id).filter(Boolean));
  const done = jobs.filter((j) => DONE_STATUSES.has(j.status) && j.created_at);
  const minutes = done
    .map((j) => {
      const start = new Date(j.created_at!).getTime();
      const end = new Date(String((j as { updated_at?: string }).updated_at || j.created_at)).getTime();
      return (end - start) / 60_000;
    })
    .filter((m) => m > 0 && m < 24 * 60);

  return {
    todayCount,
    todayDelta: percentDelta(todayCount, yesterdayCount),
    activeCouriers: courierIds.size,
    avgMin: minutes.length >= 2 ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null,
    monthSpend,
    monthDelta: percentDelta(monthSpend, lastMonthSpend),
  };
}

function DeliveryCard({ job }: { job: NestJob }) {
  const courierName = jobCourierLabel(job);
  const price = jobPrice(job);
  const time = job.created_at
    ? new Date(job.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : "";
  const tab = tabForStatus(job.status);

  return (
    <Link
      to="/business/order/$id"
      params={{ id: job.id }}
      className="block rounded-card border border-border bg-surface p-4 shadow-card transition hover:shadow-card-strong active:scale-[0.995]"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-black", statusPillClass(job.status))}>
            {job.status}
          </span>
          {job.job_number && (
            <span className="truncate font-mono text-[11px] font-bold text-text-muted">{job.job_number}</span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-muted">
          <Clock className="size-3" /> {time}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5 text-[13px] text-text-strong">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-text-muted" />
          <span className="truncate">{job.pickup_address || "—"}</span>
        </div>
        <div className="flex items-start gap-1.5 text-[13px] text-text-strong">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="truncate">{job.dropoff_address || "—"}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="truncate text-[12px] text-text-muted">
          {courierName !== "—"
            ? `שליח: ${courierName}`
            : tab === "waiting"
              ? "ממתין לשיבוץ שליח"
              : tab === "active"
                ? "בדרך"
                : "הושלם"}
        </div>
        {price > 0 && (
          <div className="shrink-0 text-sm font-black text-text-strong">₪{price.toLocaleString("he-IL")}</div>
        )}
      </div>
    </Link>
  );
}
