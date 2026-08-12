import { Link, useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Inbox, Wallet, User, Navigation, ChevronRight, X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useCourierGpsTracker } from "@/hooks/useCourierGpsTracker";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { isLivePendingOffer, isOpenBroadcastJobForCourier } from "@/lib/courier-live-jobs";
import {
  nestCourierActiveJobCount,
  nestGetJob,
  nestListCourierDeclines,
  nestListCourierOffers,
  nestListOpenBroadcastJobs,
} from "@/lib/nest-jobs";

// Primary tabs shown on the bottom nav.
function buildMobileTabs(kind: "courier" | "mover") {
  const jobsLabel = kind === "mover" ? "הובלות" : "משלוחים";
  return [
    { to: "/courier/active", label: "פעילים", icon: Navigation },
    { to: "/courier/new-jobs", label: jobsLabel, icon: Inbox },
    { to: "/courier/wallet", label: "רווחים", icon: Wallet },
    { to: "/courier/profile", label: "אזור אישי", icon: User },
  ] as const;
}


export function useMyCourier() {
  return useQuery({
    queryKey: ["my-courier-me"],
    queryFn: async () => {
      const { nestMyCourier, getNestAccessToken } = await import("@/lib/nest-auth");
      if (!getNestAccessToken()) return null;
      return nestMyCourier();
    },
    staleTime: 10_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

type CourierNavCounts = {
  pendingOffers: number;
  openJobs: number;
  activeJobs: number;
};

function useCourierNavCounts(courier?: any | null) {
  const courierId = courier?.id ?? null;
  return useQuery<CourierNavCounts>({
    queryKey: ["courier-nav-counts", courierId],
    enabled: !!courierId,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    queryFn: async () => {
      const [pendingOffers, openJobs, activeJobs, declinedRows] = await Promise.all([
        nestListCourierOffers("pending"),
        nestListOpenBroadcastJobs(),
        nestCourierActiveJobCount(),
        nestListCourierDeclines(),
      ]);
      const declined = new Set(declinedRows.map((r) => r.job_id));
      const unique = new Set<string>();
      for (const o of pendingOffers) {
        if (isLivePendingOffer(o, courier)) {
          const jobId = (o.jobs as { id?: string } | null)?.id ?? o.job_id;
          if (jobId && !declined.has(jobId)) unique.add(jobId);
        }
      }
      for (const j of openJobs) {
        if (declined.has(j.id)) continue;
        if (isOpenBroadcastJobForCourier(j, courier)) unique.add(j.id);
      }
      return {
        pendingOffers: unique.size,
        openJobs: 0,
        activeJobs,
      };
    },
  });
}

function StatusBadge({ status, kind }: { status?: string | null; kind?: "courier" | "mover" }) {
  // System-level approval indicator (read-only). The on/off switch lives in the dashboard.
  const approved = status === "פעיל" || status === "לא פעיל" || status === "מושהה";
  const cls = approved
    ? "bg-success-bg text-success-text border border-primary/20"
    : status === "ממתין לאישור"
      ? "bg-warning-bg text-warning-text border border-warning/30"
      : status === "חסום"
        ? "bg-danger-bg text-danger-text border border-destructive/20"
        : "bg-muted text-text-muted border border-border";
  const label = approved
    ? (kind === "mover" ? "מאושר להובלות" : "מאושר למשלוחים")
    : status === "ממתין לאישור"
      ? "ממתין לאישור מנהל"
      : status ?? "—";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`} title="סטטוס אישור במערכת">
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function greetingHe() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

function initialsOf(name?: string | null) {
  if (!name) return "ש";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

type IncomingJobAlert = {
  id: string;
  title: string;
  body?: string;
  url: string;
};

function playIncomingJobCue() {
  if (typeof window === "undefined") return;
  navigator.vibrate?.([420, 140, 420, 140, 650]);
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const beep = (start: number, frequency: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.03);
    };
    beep(0, 880, 0.18);
    beep(0.24, 1175, 0.2);
    window.setTimeout(() => void ctx.close().catch(() => {}), 900);
  } catch {}
}

function parseJobIdFromUrl(url: string) {
  try {
    return new URL(url, window.location.origin).searchParams.get("jobId");
  } catch {
    return null;
  }
}

function IncomingJobOverlay({ alert, onOpen, onDismiss }: {
  alert: IncomingJobAlert;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div dir="rtl" className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:items-center lg:pt-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        <div className="bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold opacity-90">עבודה חדשה עכשיו</div>
              <div className="mt-1 text-xl font-black leading-tight">{alert.title}</div>
            </div>
            <button type="button" onClick={onDismiss} className="size-9 shrink-0 rounded-full bg-white/15 grid place-items-center active:bg-white/25" aria-label="סגור">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="space-y-4 p-5">
          {alert.body && <p className="whitespace-pre-line text-base font-bold leading-relaxed text-slate-900">{alert.body}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" className="h-13 rounded-2xl bg-primary text-base font-black text-primary-foreground hover:bg-primary/90" onClick={onOpen}>
              פתח פרטים
            </Button>
            <Button type="button" variant="outline" className="h-13 rounded-2xl text-base font-bold" onClick={onDismiss}>
              אחר כך
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourierShell({ children, title, subtitle, headerExtra, fullBleed = false }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  /** When true, hides the mobile header and removes content padding for full-screen map/canvas experiences. */
  fullBleed?: boolean;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyCourier();
  const { data: navCounts } = useCourierNavCounts(me);

  const incomingSeenRef = useRef(new Set<string>());

  // App-like back button: hidden on primary bottom-tab screens.
  const PRIMARY_PATHS = ["/courier/new-jobs", "/courier/active", "/courier/wallet", "/courier/profile", "/courier/profile/edit", "/courier"];
  const showBack = !PRIMARY_PATHS.includes(path);
  const goBack = () => {
    const canGoBack = typeof window !== "undefined" && window.history.length > 1;
    if (canGoBack) {
      router.history.back();
    } else if (path.startsWith("/courier/profile/")) {
      navigate({ to: "/courier/profile" });
    } else {
      navigate({ to: "/courier/new-jobs" });
    }
  };


  const isApproved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const isAvailable = isApproved && me?.accepting_jobs !== false;
  // Fires only the audible/vibration cue — no on-screen popup.
  // The courier sees the new job in the standard bottom card on the map/list.
  const raiseIncomingJobAlert = (alert: IncomingJobAlert) => {
    if (incomingSeenRef.current.has(alert.id)) return;
    incomingSeenRef.current.add(alert.id);
    playIncomingJobCue();
  };


  // Poll Nest for courier profile and navigation count updates.
  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      qc.invalidateQueries({ queryKey: ["courier-nav-counts", me.id] });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  // When a push notification is tapped and this tab is already open, the SW
  // sends { type: "goi-open", url } — navigate to it via the router so the
  // /courier/new-jobs page reads ?jobId=... and opens the details dialog.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const onMsg = (e: MessageEvent) => {
      const data = e.data as { type?: string; url?: string; payload?: { title?: string; body?: string; url?: string; tag?: string } } | null;
      if (!data) return;
      if (data.type === "goi-new-job-push" && data.payload?.url) {
        const id = parseJobIdFromUrl(data.payload.url) || data.payload.tag || String(Date.now());
        raiseIncomingJobAlert({
          id,
          title: data.payload.title || "🚚 משלוח חדש",
          body: data.payload.body,
          url: data.payload.url,
        });
        return;
      }
      if (data.type !== "goi-open" || !data.url) return;
      try {
        const u = new URL(data.url, window.location.origin);
        const search: Record<string, string> = {};
        u.searchParams.forEach((v, k) => { search[k] = v; });
        navigate({ to: u.pathname, search });
      } catch {}
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [navigate]);

  useEffect(() => {
    if (!me?.id) return;
    let ready = false;
    const recentlyShown = new Set<string>();
    const showJobAlert = async (jobId: string) => {
      if (!ready || recentlyShown.has(jobId)) return;
      recentlyShown.add(jobId);
      try {
        const job = await nestGetJob(jobId);
        const pickup = String(job.pickup_area || job.pickup_address || "איסוף").split(",")[0].trim();
        const dropoff = String(job.dropoff_area || job.dropoff_address || "מסירה").split(",")[0].trim();
        const type = (job as any).item_category || (job as any).package_type || job.job_type || "משלוח";
        const price = (job as any).suggested_courier_payment ?? job.payment;
        const km = (job as any).estimated_distance_km;
        const money = price ? `₪${price}` : "";
        const distance = km ? `${Number(km).toFixed(1)} ק״מ` : "";
        raiseIncomingJobAlert({
          id: jobId,
          title: `🚚 ${type}`,
          body: [`📍 ${pickup} → ${dropoff}`, [money, distance].filter(Boolean).join(" · ")].filter(Boolean).join("\n"),
          url: `/courier/new-jobs?jobId=${encodeURIComponent(jobId)}`,
        });
      } catch {
        // ignore fetch errors for alert overlay
      }
    };
    const timer = window.setInterval(() => {
      void nestListCourierOffers("pending").then((offers) => {
        if (!ready) return;
        for (const offer of offers) {
          const jobId = offer.job_id;
          if (jobId && isLivePendingOffer(offer, me)) void showJobAlert(jobId);
        }
      }).catch(() => {});
    }, 20_000);
    ready = true;
    return () => {
      window.clearInterval(timer);
    };
  }, [me?.id]);



  // Live GPS tracking — runs only while the courier is marked active (never in admin preview).
  useCourierGpsTracker({
    enabled:
      isAvailable &&
      (me?.location_sharing_enabled ?? true) &&
      !(
        typeof window !== "undefined" &&
        !!window.sessionStorage.getItem("goi_nest_preview")
      ),
    courierId: me?.id ?? null,
  });

  const kind: "courier" | "mover" = (me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind === "mover" ? "mover" : "courier";
  const MOBILE_TABS = buildMobileTabs(kind);

  return (
    <div
      dir="rtl"
      className={`rtl-panel flex w-full bg-bg ${
        fullBleed ? "h-dvh overflow-hidden" : "min-h-dvh"
      }`}
    >
      <main
        className={`flex-1 min-w-0 flex flex-col w-full ${
          fullBleed ? "h-full min-h-0 overflow-hidden" : "min-h-dvh"
        }`}
      >
        {/* Sticky app bar — hidden on fullBleed screens (they own their header + menu) */}
        {!fullBleed && (
          <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-lg border-b border-border px-4 lg:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center justify-between gap-3">
              <CourierMenuButton className="size-11 shadow-card border-0" />

              <div className="flex items-center gap-3 min-w-0">
                {me && <StatusBadge status={me?.courier_status} kind={kind} />}
                <div className="min-w-0 text-right">
                  {showBack ? (
                    <>
                      <div className="text-[11px] text-text-muted font-semibold leading-none mb-1">חזרה</div>
                      <div className="text-sm font-extrabold text-text-strong truncate leading-tight">{title ?? "המסך הקודם"}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] text-text-muted font-semibold leading-none mb-1">{greetingHe()}</div>
                      <div className="text-sm font-extrabold text-text-strong truncate leading-tight">{me?.full_name ?? "שליח"}</div>
                    </>
                  )}
                </div>
                {showBack ? (
                  <button
                    onClick={goBack}
                    className="size-11 grid place-items-center rounded-pill bg-muted text-text-strong active:bg-border transition-colors shrink-0"
                    aria-label="חזרה"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                ) : (
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-pill bg-primary text-primary-foreground grid place-items-center font-extrabold text-sm shadow-fab">
                      {initialsOf(me?.full_name)}
                    </div>
                    <span className={`absolute bottom-0 left-0 size-3 rounded-full border-2 border-surface ${isAvailable ? "bg-primary animate-pulse" : "bg-border-strong"}`} />
                  </div>
                )}
              </div>
            </div>

            {(title || subtitle) && !showBack && (
              <div className="mt-3 text-right">
                {title && <h1 className="text-xl font-extrabold text-text-strong truncate">{title}</h1>}
                {subtitle && <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>}
              </div>
            )}

            {headerExtra && <div className="mt-3">{headerExtra}</div>}
          </header>
        )}

        {/* Content — full-bleed removes padding so map/canvas fills the viewport. */}
        <div className={`flex-1 min-h-0 flex flex-col overscroll-y-contain scroll-smooth ${
          fullBleed
            ? "p-0 overflow-hidden"
            : "px-3 py-3 sm:px-5 sm:py-4 lg:p-6 overflow-y-auto [-webkit-overflow-scrolling:touch] [&>*]:shrink-0"
        }`}>{children}</div>

        {/* Bottom tab bar sits in-flow so it stays flush with the screen bottom.
            Home-indicator inset is padding inside the bar, not a gap below it. */}
        <nav
          className="shrink-0 z-30 border-t border-border bg-surface/95 backdrop-blur shadow-bottom-bar px-1.5 pt-1.5 flex justify-around items-stretch pb-[max(0.375rem,env(safe-area-inset-bottom,0px))]"
          aria-label="תפריט ראשי"
        >
          {MOBILE_TABS.map((item) => {
            const active =
              path === item.to ||
              (item.to === "/courier/new-jobs" && (path === "/courier" || path === "/courier/dashboard")) ||
              (item.to === "/courier/profile" && path.startsWith("/courier/profile"));
            const Icon = item.icon;
            const badge =
              item.to === "/courier/new-jobs"
                ? (navCounts?.pendingOffers ?? 0) + (navCounts?.openJobs ?? 0)
                : item.to === "/courier/active"
                  ? (navCounts?.activeJobs ?? 0)
                  : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 flex-1 mx-0.5 py-2 rounded-pill transition-all duration-200 ease-out ${
                  active
                    ? "text-primary bg-primary-soft scale-[1.02]"
                    : "text-text-muted active:text-text-strong active:bg-muted"
                }`}
              >
                <div className="relative">
                  <Icon className={`size-6 transition-all ${active ? "stroke-[2.5]" : "stroke-2"}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-pill bg-warning text-warning-foreground text-[10px] font-extrabold ring-2 ring-surface">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] leading-none ${active ? "font-extrabold" : "font-semibold"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

export { StatusBadge as CourierStatusBadge };
