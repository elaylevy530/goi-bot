import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { Avatar, Badge, Panel, money } from "@/components/business/goi/GoiUi";
import { nestListMyNotifications } from "@/lib/nest-accounts";
import { playBeep } from "@/lib/offer-alert";
import { toast } from "sonner";
import {
  formatHebrewDate,
  isIncomingJob,
  isSameDay,
  isTrackingJob,
  jobPrice,
  jobRecipientName,
  jobSourceLabel,
  jobCourierName,
  courierStepLabel,
  pinsFromJobs,
  trackingGroup,
  jobBadgeTone,
} from "@/lib/business-panel";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bike,
  Check,
  CheckCheck,
  ClipboardList,
  Clock3,
  FileText,
  Headphones,
  MapPin,
  Package,
  Search,
  X,
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

function BusinessDashboard() {
  const { data: me } = useMyBusiness();
  const navigate = useNavigate();
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
      ? { id: "store", lat: pickupLat, lng: pickupLng, label: "העסק", type: "store" as const, color: "#00a334" }
      : null;

  return (
    <BusinessShell>
      <div className="page-content">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">סקירה יומית</span>
            <h1>היום בעסק שלך</h1>
            <p>כל ההזמנות והמשלוחים, במקום אחד.</p>
          </div>
          <span className="dashboard-date">{formatHebrewDate()}</span>
        </div>
        <div className="home-stats">
          {[
            { label: "הזמנות לאישור", value: incoming.length, icon: ClipboardList, to: "/business/incoming", hint: "ממתינות לטיפול שלך", tone: "amber" },
            { label: "משלוחים בדרך", value: moving.length, icon: Bike, to: "/business/active", hint: "בדרך לאיסוף וללקוחות", tone: "green" },
            { label: "ממתינים לשליח", value: waiting.length, icon: Clock3, to: "/business/active", hint: "לפני תחילת המשלוח", tone: "blue" },
            { label: "סך הזמנות היום", value: today.length, icon: Package, to: "/business/history", hint: "כל הזמנות העסק להיום", tone: "neutral" },
          ].map((s) => (
            <button key={s.label} type="button" className={`panel stat-card stat-${s.tone}`} onClick={() => navigate({ to: s.to as never })}>
              <span className="round-icon">
                <s.icon size={22} />
              </span>
              <h2>{s.label}</h2>
              <strong>{isLoading && !orders ? "—" : s.value}</strong>
              <small>
                {s.hint}
                <ArrowLeft size={14} />
              </small>
            </button>
          ))}
        </div>
        <div className="home-workspace">
          <Panel
            className="home-map-panel"
            title="המשלוחים שלך על המפה"
            icon={<MapPin size={19} />}
            action={
              <Link to="/business/active" className="link">
                למעקב המלא
                <ArrowLeft size={15} />
              </Link>
            }
          >
            <LiveJobsMap
              pins={[...(storePin ? [storePin] : []), ...pins]}
              onMarker={(id) => {
                if (id === "store") navigate({ to: "/business/account" });
                else navigate({ to: "/business/active", search: { job: id } });
              }}
              showControls
            />
            <div className="map-summary">
              <span>
                <Bike size={17} />
                <strong>{moving.length}</strong> משלוחים בדרך
              </span>
              <span>מיקומים לפי נתוני השליחים בפועל</span>
            </div>
          </Panel>
          <div className="home-bottom-grid">
            <Panel title="ממתינות לאישור שלך" icon={<ClipboardList size={19} />} action={<Badge text={String(incoming.length)} tone="amber" />}>
              <div className="approval-list">
                {incoming.slice(0, 5).map((o) => (
                  <div className="approval-row" key={o.id}>
                    <Link to="/business/order/$id" params={{ id: o.id }} className="approval-person">
                      <Avatar name={jobRecipientName(o)} />
                      <span>
                        <strong>{jobRecipientName(o)}</strong>
                        <small>#{o.job_number} · {o.dropoff_area || o.dropoff_address || ""}</small>
                      </span>
                    </Link>
                    <div className="approval-value">
                      <strong>{money(jobPrice(o))}</strong>
                      <span>{jobSourceLabel(o)}</span>
                    </div>
                    <Link to="/business/incoming" className="approve-action">
                      <Check size={17} />
                      טיפול
                    </Link>
                  </div>
                ))}
                {incoming.length === 0 && (
                  <div className="approval-empty">
                    <CheckCheck size={25} />
                    כל ההזמנות טופלו
                  </div>
                )}
              </div>
              <Link to="/business/incoming" className="panel-link">
                לכל ההזמנות לאישור
                <ArrowLeft size={15} />
              </Link>
            </Panel>
            <Panel title="משלוחים בדרך" icon={<Bike size={19} />} action={<Badge text={String(moving.length)} tone="green" />}>
              <div className="home-deliveries">
                {moving.slice(0, 3).map((o) => (
                  <button key={o.id} type="button" onClick={() => navigate({ to: "/business/active", search: { job: o.id } })}>
                    <div className="home-courier">
                      <Avatar name={jobCourierName(o) || "שליח"} />
                      <span>
                        <strong>{jobCourierName(o) || "ממתין לשליח"}</strong>
                        <p>{o.dropoff_area || o.dropoff_address || ""}</p>
                      </span>
                    </div>
                    <div>
                      <Badge text={courierStepLabel(o)} tone={jobBadgeTone(o.status)} />
                      <small>#{o.job_number}</small>
                    </div>
                    <div>
                      <small>סטטוס</small>
                      <b>{courierStepLabel(o)}</b>
                    </div>
                  </button>
                ))}
              </div>
              <Link to="/business/active" className="panel-link">
                לכל המשלוחים
                <ArrowLeft size={15} />
              </Link>
            </Panel>
          </div>
        </div>
        <Panel className="home-updates" title="עדכונים אחרונים" icon={<Bell size={19} />}>
          <div className="three-cols">
            {(notifs.length ? notifs.slice(0, 3) : [
              { id: "empty", title: "אין עדכונים חדשים", body: "עדכוני משלוחים יופיעו כאן", icon: Bell },
            ]).map((e: any) => (
              <Link key={e.id} to="/business/notifications" className="update-tile">
                <span className="event-icon green">
                  <Bell size={22} />
                </span>
                <div>
                  <strong>{e.title}</strong>
                  <p>{e.body || "עדכון מהמערכת"}</p>
                </div>
                <ArrowLeft size={16} />
              </Link>
            ))}
          </div>
          <Link to="/business/notifications" className="panel-link">
            לכל העדכונים
            <ArrowLeft size={15} />
          </Link>
        </Panel>
        <Panel className="quick-links" title="גישה מהירה">
          <div className="four-cols">
            {[
              { t: "חיפוש משלוח", d: "לפי מספר הזמנה", i: Search, p: "/business/active" },
              { t: "תמיכה ושירות", d: "אנחנו כאן בשבילך", i: Headphones, p: "/business/help" },
              { t: "חשבוניות וחיובים", d: "כל החיובים שלך", i: FileText, p: "/business/billing" },
              { t: "דוחות וסטטיסטיקות", d: "ביצועי העסק", i: BarChart3, p: "/business/analytics" },
            ].map((l) => (
              <Link key={l.p} to={l.p as never}>
                <l.i size={25} />
                <div>
                  <strong>{l.t}</strong>
                  <p>{l.d}</p>
                </div>
                <ArrowLeft size={16} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </BusinessShell>
  );
}
