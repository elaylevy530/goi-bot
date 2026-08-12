import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ListEmptyState } from "@/components/ListEmptyState";
import { nestListJobs, type NestJob } from "@/lib/nest-jobs";
import { playBeep } from "@/lib/offer-alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, MapPin, Clock, Package,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/business/dashboard")({
  head: () => ({ meta: [{ title: "האזור העסקי — Goi" }] }),
  ssr: false,
  component: BusinessDashboard,
});

/** Kept for other business.* pages that import EmptyState from here. */
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
            className="inline-flex items-center gap-2 h-11 px-5 rounded-pill bg-primary text-primary-foreground font-black shadow-fab"
          >
            {ctaLabel}
          </Link>
        ) : undefined)
      }
    />
  );
}

type OpsTab = "waiting" | "active" | "done";

const WAITING_STATUSES = new Set([
  "טיוטה",
  "נשלחה לשליחים",
  "ממתינה לתגובות",
  "יש שליחים שאישרו",
]);
const ACTIVE_STATUSES = new Set(["נבחר שליח", "פעילה"]);
const DONE_STATUSES = new Set(["הושלמה"]);

const STATUS_PILL: Record<string, string> = {
  "טיוטה": "bg-muted text-text-muted",
  "נשלחה לשליחים": "bg-info-bg text-info-text",
  "ממתינה לתגובות": "bg-warning-bg text-warning-text",
  "יש שליחים שאישרו": "bg-warning-bg text-warning-text",
  "נבחר שליח": "bg-success-bg text-success-text",
  "פעילה": "bg-success-bg text-success-text",
  "הושלמה": "bg-success-bg text-success-text",
  "בוטלה": "bg-danger-bg text-danger-text",
  "תקועה": "bg-danger-bg text-danger-text",
};

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
  if (next === "הושלמה" && prev !== "הושלמה") {
    return `${label} — המשלוח הושלם`;
  }
  if (next === "יש שליחים שאישרו" && prev !== next) {
    return `${label} — יש שליחים שאישרו`;
  }
  if (next === "ממתינה לתגובות" && prev === "נשלחה לשליחים") {
    return `${label} — ממתין לתגובות שליחים`;
  }
  return null;
}

function BusinessDashboard() {
  const { data: me } = useMyBusiness();
  const [tab, setTab] = useState<OpsTab>("waiting");
  const prevStatusesRef = useRef<Map<string, string> | null>(null);
  const primedRef = useRef(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["biz-dashboard-orders", me?.id],
    enabled: !!me?.id,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const jobs = await nestListJobs({ limit: 50 });
      return jobs;
    },
  });

  const all = orders ?? [];

  // Toast + short chime when job status transitions between polls
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

  const waiting = useMemo(
    () => all.filter((o) => WAITING_STATUSES.has(o.status)),
    [all],
  );
  const active = useMemo(
    () => all.filter((o) => ACTIVE_STATUSES.has(o.status)),
    [all],
  );
  const done = useMemo(
    () => all.filter((o) => DONE_STATUSES.has(o.status)).slice(0, 20),
    [all],
  );

  const list =
    tab === "waiting" ? waiting : tab === "active" ? active : done;

  const displayName =
    (me as { business_name?: string; name?: string } | null)?.business_name ||
    (me as { name?: string } | null)?.name ||
    "העסק שלי";

  return (
    <BusinessShell>
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-start justify-between gap-3 text-right">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-text-strong">לוח משלוחים</h1>
            <p className="mt-0.5 text-xs text-text-muted truncate">{displayName}</p>
          </div>
          <Link
            to="/business/new-delivery"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-pill bg-primary text-primary-foreground text-sm font-black shadow-fab active:scale-[0.98] transition shrink-0"
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
            <div className="rounded-card bg-surface shadow-card px-4 py-10 text-center text-sm text-text-muted">
              טוען משלוחים…
            </div>
          ) : list.length === 0 ? (
            <ListEmptyState
              title={
                tab === "waiting"
                  ? "אין משלוחים ממתינים"
                  : tab === "active"
                    ? "אין משלוחים בביצוע"
                    : "אין משלוחים שהושלמו לאחרונה"
              }
              description={
                tab === "done"
                  ? "משלוחים שהושלמו יופיעו כאן"
                  : "שדרו משלוח חדש — השליחים יקבלו אותו מיד"
              }
              icon={<Package className="size-6" />}
              action={
                tab !== "done" ? (
                  <Link
                    to="/business/new-delivery"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-pill bg-primary text-primary-foreground font-black shadow-fab"
                  >
                    <Plus className="size-4" /> הזמן משלוח
                  </Link>
                ) : (
                  <Link
                    to="/business/orders"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-pill bg-navy text-white font-black"
                  >
                    לכל ההזמנות
                  </Link>
                )
              }
            />
          ) : (
            list.map((o) => <DeliveryCard key={o.id} job={o} />)
          )}
        </section>

        {list.length > 0 && (
          <div className="pt-1 text-center">
            <Link
              to="/business/orders"
              className="text-xs font-bold text-text-muted hover:text-text-strong transition"
            >
              לכל ההזמנות ←
            </Link>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}

function DeliveryCard({ job }: { job: NestJob }) {
  const status = job.status;
  const courierName =
    (job as { couriers?: { full_name?: string } | null }).couriers?.full_name ||
    (job as { selected_courier_name?: string | null }).selected_courier_name ||
    null;
  const price = Number(
    (job as { customer_price?: number | null }).customer_price ??
      (job as { payment?: number | string | null }).payment ??
      0,
  );
  const time = job.created_at
    ? new Date(job.created_at).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const tab = tabForStatus(status);

  return (
    <Link
      to="/business/order/$id"
      params={{ id: job.id }}
      className="block rounded-card bg-surface shadow-card border border-border p-4 hover:shadow-card-strong active:scale-[0.995] transition"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-[11px] font-black px-2.5 py-1 rounded-pill shrink-0",
              STATUS_PILL[status] ?? "bg-muted text-text-muted",
            )}
          >
            {status}
          </span>
          {job.job_number && (
            <span className="text-[11px] font-mono font-bold text-text-muted truncate">
              {job.job_number}
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-muted flex items-center gap-1 shrink-0">
          <Clock className="size-3" /> {time}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="text-[13px] text-text-strong flex items-start gap-1.5">
          <MapPin className="size-3.5 mt-0.5 shrink-0 text-text-muted" />
          <span className="truncate">{job.pickup_address || "—"}</span>
        </div>
        <div className="text-[13px] text-text-strong flex items-start gap-1.5">
          <MapPin className="size-3.5 mt-0.5 shrink-0 text-primary" />
          <span className="truncate">{job.dropoff_address || "—"}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-border">
        <div className="text-[12px] text-text-muted truncate">
          {courierName
            ? `שליח: ${courierName}`
            : tab === "waiting"
              ? "ממתין לשיבוץ שליח"
              : tab === "active"
                ? "בדרך"
                : "הושלם"}
        </div>
        {price > 0 && (
          <div className="text-sm font-black text-text-strong shrink-0">
            ₪{price.toLocaleString("he-IL")}
          </div>
        )}
      </div>
    </Link>
  );
}
