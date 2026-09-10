import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { Avatar, DataTable, Panel, money } from "@/components/business/goi/GoiUi";
import { nestListMyNotifications } from "@/lib/nest-accounts";
import { nestCancelJob, type NestJob } from "@/lib/nest-jobs";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { playBeep } from "@/lib/offer-alert";
import { toast } from "sonner";
import {
  formatEtaClock,
  formatRelativeHe,
  isIncomingJob,
  isSameDay,
  isTrackingJob,
  jobItemsLabel,
  jobPrice,
  jobRecipientName,
  jobSourceLabel,
  jobCourierName,
  pinsFromJobs,
  trackingGroup,
} from "@/lib/business-panel";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bike,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Clock3,
  FileText,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Package,
  Search,
  TriangleAlert,
} from "lucide-react";

export const Route = createFileRoute("/business/dashboard")({
  head: () => ({ meta: [{ title: "האזור העסקי — Goi" }] }),
  ssr: false,
  component: BusinessDashboard,
});

export function EmptyState({ icon: Icon, title, desc, action, ctaLabel, ctaTo }: {
  icon: typeof Package;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="empty-state">
      <Icon className="size-6" />
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
      {action}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo as never} className="btn primary">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

const CLAIM_STATUSES = new Set(["נבחר שליח", "פעילה"]);

function statusToastMessage(prev: string, next: string, jobNumber?: string): string | null {
  const label = jobNumber ? `#${jobNumber}` : "משלוח";
  if (prev !== next && CLAIM_STATUSES.has(next) && !CLAIM_STATUSES.has(prev)) return `${label} — שליח שובץ ✓`;
  if (next === "הושלמה" && prev !== "הושלמה") return `${label} — המשלוח הושלם`;
  if (next === "יש שליחים שאישרו" && prev !== next) return `${label} — יש שליחים שאישרו`;
  if (next === "ממתינה לתגובות" && prev === "נשלחה לשליחים") return `${label} — ממתין לתגובות שליחים`;
  return null;
}

function sourceTone(label: string) {
  if (label === "אינטגרציה" || label === "שותף") return "orange";
  if (label === "מכרז") return "purple";
  return "green";
}

function notifVisual(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("warn") || k.includes("fail") || k.includes("stuck") || k.includes("cancel")) {
    return { icon: TriangleAlert, color: "red" };
  }
  if (k.includes("incoming") || k.includes("approval") || k.includes("quote")) {
    return { icon: ClipboardList, color: "amber" };
  }
  if (k.includes("job") || k.includes("courier") || k.includes("deliver")) {
    return { icon: Bike, color: "green" };
  }
  return { icon: Bell, color: "green" };
}

function dropoffCity(job: NestJob) {
  return job.dropoff_area || String(job.dropoff_address || "").split(",")[1]?.trim() || job.dropoff_address || "";
}

function BusinessDashboard() {
  const { data: me } = useMyBusiness();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dispatchFn = useServerFn(dispatchJobToCouriers);
  const prevStatusesRef = useRef<Map<string, string> | null>(null);
  const primedRef = useRef(false);
  const { data: orders, isLoading } = useBusinessJobs(me?.id);
  const { data: notifs = [] } = useQuery({
    queryKey: ["notif-recent", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyNotifications(8),
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

  const incoming = useMemo(() => all.filter(isIncomingJob), [all]);
  const tracking = useMemo(() => all.filter(isTrackingJob), [all]);
  const moving = useMemo(() => tracking.filter((j) => trackingGroup(j) !== "waiting"), [tracking]);
  const waiting = useMemo(() => tracking.filter((j) => trackingGroup(j) === "waiting"), [tracking]);
  const today = useMemo(() => all.filter((j) => isSameDay(j.created_at)), [all]);
  const pins = useMemo(() => pinsFromJobs(moving), [moving]);

  const pickupLat = Number((me as { pickup_lat?: number | null } | null)?.pickup_lat);
  const pickupLng = Number((me as { pickup_lng?: number | null } | null)?.pickup_lng);
  const storePin =
    Number.isFinite(pickupLat) && Number.isFinite(pickupLng)
      ? { id: "store", lat: pickupLat, lng: pickupLng, label: "העסק", type: "store" as const, color: "#087d52" }
      : null;

  const dispatch = useMutation({
    mutationFn: async (jobId: string) => dispatchFn({ data: { jobId } }),
    onSuccess: (r) => {
      toast.success(r.dispatched ? `המשלוח הופץ ל־${r.sent} שליחים` : "ההזמנה אושרה");
      qc.invalidateQueries({ queryKey: ["business-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: (jobId: string) => nestCancelJob(jobId),
    onSuccess: () => {
      toast.success("ההזמנה נדחתה");
      qc.invalidateQueries({ queryKey: ["business-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = (o: NestJob) => {
    if (o.pricing_type === "quote_request") {
      navigate({ to: "/business/incoming" });
      return;
    }
    dispatch.mutate(o.id);
  };

  const busy = isLoading && !orders;

  return (
    <BusinessShell>
      <div className="page-content">
        <div className="home-stats">
          {[
            { label: "הזמנות נכנסות לאישור", value: incoming.length, icon: ClipboardList, to: "/business/incoming" },
            { label: "משלוחים פעילים", value: moving.length, icon: Bike, to: "/business/active" },
            { label: "ממתינים לשילוח", value: waiting.length, icon: Clock3, to: "/business/active" },
            { label: "הזמנות היום", value: today.length, icon: CalendarDays, to: "/business/history" },
          ].map((s) => (
            <button key={s.label} type="button" className="panel stat-card" onClick={() => navigate({ to: s.to as never })}>
              <span className="round-icon">
                <s.icon size={22} />
              </span>
              <h2>{s.label}</h2>
              <strong>{busy ? "—" : s.value}</strong>
              <small>
                <i className="live-dot" />
                עודכן זה עתה
              </small>
            </button>
          ))}
        </div>
        <div className="home-workspace">
          <Panel className="home-map-panel" title="מעקב משלוחים" icon={<MapPin size={19} />}>
            <LiveJobsMap
              pins={[...(storePin ? [storePin] : []), ...pins]}
              onMarker={(id) => {
                if (id === "store") navigate({ to: "/business/account" });
                else navigate({ to: "/business/active", search: { job: id } });
              }}
              showControls
            />
          </Panel>
          <div className="home-bottom-grid">
            <Panel title="הזמנות נכנסות לאישור" icon={<ClipboardList size={19} />}>
              {incoming.length > 0 ? (
                <DataTable
                  headers={["#", "לקוח", "סכום", "פריטים", "מקור ההזמנה", "פעולה"]}
                  rows={incoming.slice(0, 4).map((o, i) => [
                    i + 1,
                    <span key="c">
                      {jobRecipientName(o)}
                      <small>{dropoffCity(o)}</small>
                    </span>,
                    money(jobPrice(o)),
                    jobItemsLabel(o),
                    <span key="s" className={`source-tag ${sourceTone(jobSourceLabel(o))}`}>{jobSourceLabel(o)}</span>,
                    <div key="a" className="mini-actions">
                      <button type="button" className="btn primary small" disabled={dispatch.isPending} onClick={() => approve(o)}>
                        אישור
                      </button>
                      <button type="button" className="btn outline small reject" disabled={cancel.isPending} onClick={() => cancel.mutate(o.id)}>
                        דחייה
                      </button>
                      <button type="button" className="btn outline small" onClick={() => navigate({ to: "/business/order/$id", params: { id: o.id } })}>
                        צפייה
                      </button>
                    </div>,
                  ])}
                />
              ) : (
                <div className="approval-empty">
                  <CheckCheck size={25} />
                  כל ההזמנות טופלו
                </div>
              )}
              <Link to="/business/incoming" className="panel-link">
                לכל ההזמנות לאישור
                <ArrowLeft size={15} />
              </Link>
            </Panel>
            <Panel title="משלוחים פעילים" icon={<Bike size={19} />}>
              <div className="home-deliveries">
                {moving.slice(0, 3).map((o) => (
                  <button key={o.id} type="button" onClick={() => navigate({ to: "/business/active", search: { job: o.id } })}>
                    <div className="home-courier">
                      <Avatar name={jobCourierName(o) || "שליח"} />
                      <span>
                        <strong>
                          {jobCourierName(o) || "ממתין לשליח"}
                          <i className="live-dot" />
                        </strong>
                        <p>{dropoffCity(o)}</p>
                      </span>
                    </div>
                    <div>
                      <small>#{o.job_number}</small>
                    </div>
                    <div>
                      <small>ETA</small>
                      <b>{formatEtaClock(o)}</b>
                    </div>
                  </button>
                ))}
                {moving.length === 0 && (
                  <div className="approval-empty">
                    <Bike size={25} />
                    אין משלוחים פעילים כרגע
                  </div>
                )}
              </div>
              <Link to="/business/active" className="panel-link">
                לכל המשלוחים
                <ArrowLeft size={15} />
              </Link>
            </Panel>
          </div>
        </div>
        <Panel className="home-updates" title="הודעות ועדכונים" icon={<Bell size={19} />}>
          <div className="three-cols">
            {(notifs.length ? notifs.slice(0, 3) : []).map((e) => {
              const visual = notifVisual(e.kind || "");
              const Icon = visual.icon;
              return (
                <Link key={e.id} to={(e.link as never) || "/business/notifications"} className="update-tile">
                  <span className={"event-icon " + visual.color}>
                    <Icon size={22} />
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <p className="update-when">{formatRelativeHe(e.created_at)}</p>
                    {e.body ? <p className="update-body">{e.body}</p> : null}
                  </div>
                  <time>
                    {new Date(e.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </Link>
              );
            })}
            {notifs.length === 0 && (
              <div className="approval-empty">
                <Bell size={25} />
                אין עדכונים חדשים
              </div>
            )}
          </div>
          <Link to="/business/notifications" className="panel-link">
            לכל ההודעות
            <ArrowLeft size={15} />
          </Link>
        </Panel>
        <Panel className="quick-links" title="קיצורי דרך" icon={<LayoutGrid size={19} />}>
          <div className="four-cols">
            {[
              { t: "חיפוש משלוח", d: "חיפוש לפי מספר הזמנה", i: Search, p: "/business/history" },
              { t: "צ׳אט עם התמיכה", d: "דבר איתנו", i: MessageCircle, p: "/business/help" },
              { t: "חשבוניות וחיובים", d: "הפקת וניהול חשבוניות", i: FileText, p: "/business/billing" },
              { t: "דוחות וסטטיסטיקות", d: "צפייה בדוחות", i: BarChart3, p: "/business/analytics" },
            ].map((l) => (
              <Link key={l.p} to={l.p as never} className="quick-link">
                <l.i size={25} />
                <div>
                  <strong>{l.t}</strong>
                  <p>{l.d}</p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </BusinessShell>
  );
}
