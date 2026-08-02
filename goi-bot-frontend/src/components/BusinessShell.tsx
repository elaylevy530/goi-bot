import { Link, useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Home, Package, Plus, MessageSquare, UserCircle2, Bell, ArrowRight,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { PaymentBanner } from "@/components/PaymentGate";
import { BusinessLogo } from "@/components/BusinessLogo";
import {
  nestListMyNotifications,
  nestMarkAllNotificationsRead,
  nestUnreadNotificationCount,
  type NestBusinessNotification,
} from "@/lib/nest-accounts";

// -------- Data hooks (kept API-compatible with the previous shell) --------

export function useMyBusiness() {
  return useQuery({
    queryKey: ["business-me"],
    queryFn: async () => {
      const { nestMyCustomer, getNestAccessToken } = await import("@/lib/nest-auth");
      if (!getNestAccessToken()) return null;
      return nestMyCustomer();
    },
    staleTime: 10_000,
  });
}

function useUnreadNotifications(businessId?: string) {
  return useQuery({
    queryKey: ["notif-unread-count", businessId],
    enabled: !!businessId,
    refetchInterval: 90_000,
    queryFn: () => nestUnreadNotificationCount(),
  });
}

function useRecentNotifications(businessId?: string) {
  return useQuery({
    queryKey: ["notif-recent", businessId],
    enabled: !!businessId,
    refetchInterval: 90_000,
    queryFn: () => nestListMyNotifications(8),
  });
}

function NotificationsBell({ businessId }: { businessId?: string }) {
  const qc = useQueryClient();
  const { data: unread = 0 } = useUnreadNotifications(businessId);
  const { data: items = [] } = useRecentNotifications(businessId);
  const markAll = useMutation({
    mutationFn: async () => {
      if (!businessId) return;
      await nestMarkAllNotificationsRead();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-unread-count"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative size-10 grid place-items-center rounded-full bg-white/70 backdrop-blur border border-black/5 text-[#101418] hover:bg-white transition"
          aria-label="התראות"
        >
          <Bell className="size-[18px]" strokeWidth={2} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-[#35AD29] text-[#101418] text-[10px] font-black">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="font-bold text-sm">התראות</div>
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} className="text-xs text-[#101418] font-bold underline">
              סמן הכל
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">אין התראות חדשות</div>
          ) : (items as NestBusinessNotification[]).map((n) => (
            <Link
              key={n.id}
              to={(n.link as never) || "/business/dashboard"}
              className={`block px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${!n.read_at ? "bg-[#ECFDF5]" : ""}`}
            >
              <div className="text-xs font-bold text-[#101418]">{n.title}</div>
              {n.body && <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</div>}
              <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString("he-IL")}</div>
            </Link>
          ))}
        </div>
        <Link to="/business/notifications" className="block text-center text-xs font-bold text-[#101418] py-3 border-t border-slate-100 hover:bg-slate-50">
          כל ההתראות
        </Link>
      </PopoverContent>
    </Popover>
  );
}

// -------- Layout Shell --------

const NAV = [
  { to: "/business/dashboard", label: "בית", icon: Home, exact: true },
  { to: "/business/orders", label: "הזמנות", icon: Package },
  { to: "/business/new-delivery", label: "הזמן", icon: Plus, highlight: true },
  { to: "/business/messages", label: "הודעות", icon: MessageSquare },
  { to: "/business/account", label: "אזור אישי", icon: UserCircle2 },
] as const;

const HIDE_HEADER_ROUTES = [
  "/business/new-delivery",
  "/business/new-multi-delivery",
  "/business/new-route",
  "/business/new-shift",
];

export function BusinessShell({ children, title, subtitle, headerExtra }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();

  // Show a back button on any secondary page (not the 5 bottom-nav destinations)
  const TOP_LEVEL = ["/business/dashboard", "/business/orders", "/business/new-delivery", "/business/messages", "/business/account", "/business", "/business/"];
  const showBack = !TOP_LEVEL.includes(pathname);
  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/business/account" });
  };

  // Poll notifications from Nest.
  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["notif-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notif-recent"] });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  const displayName = (me as { business_name?: string; name?: string } | null)?.business_name || (me as { name?: string } | null)?.name || "העסק שלי";
  const logoPath = (me as { logo_url?: string } | null)?.logo_url;
  const hideHeader = HIDE_HEADER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  return (
    <div dir="rtl" className="rtl-panel min-h-screen bg-[#f5f6f8] text-[#101418] pb-24">
      {!hideHeader && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/5">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Link to="/business/dashboard" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="בית">
              <BusinessLogo path={logoPath} name={displayName} size={32} />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 font-semibold leading-none">Goi · עסקים</div>
                <div className="text-[13px] font-black truncate leading-tight mt-0.5 max-w-[180px]">{displayName}</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationsBell businessId={me?.id} />
              {showBack && (
                <button
                  type="button"
                  onClick={goBack}
                  aria-label="חזרה"
                  className="size-10 grid place-items-center rounded-full bg-white/70 backdrop-blur border border-black/5 text-[#101418] hover:bg-white transition"
                >
                  <ArrowRight className="size-5" />
                </button>
              )}
            </div>
          </div>
          {(title || subtitle) && (
            <div className="max-w-3xl mx-auto px-4 pb-3 pt-1 text-right">
              {title && <h1 className="text-xl font-black text-[#101418] truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          )}
          {headerExtra && <div className="max-w-3xl mx-auto px-4 pb-3">{headerExtra}</div>}
        </header>
      )}

      <PaymentBanner />

      <main>{children}</main>

      {/* Bottom bar — 5 tabs, center is bold */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-black/5 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-[72px] max-w-md mx-auto">
          {NAV.map((item) => {
            const { to, label, icon: Icon } = item;
            const highlight = "highlight" in item && item.highlight;
            const active =
              pathname === to ||
              (to === "/business/dashboard" && (pathname === "/business" || pathname === "/business/")) ||
              pathname.startsWith(to + "/");
            if (highlight) {
              return (
                <button
                  key={to}
                  onClick={() => navigate({ to })}
                  className="flex flex-col items-center justify-end pb-1.5 relative"
                  aria-label={label}
                >
                  <div className={`absolute -top-4 size-12 rounded-full grid place-items-center shadow-lg ring-4 ring-white transition ${
                    active ? "bg-[#2d9623] text-white" : "bg-[#35AD29] text-white"
                  }`}>
                    <Icon className="size-5" strokeWidth={2.6} />
                  </div>
                  <span className={`text-[11px] mt-10 ${active ? "font-black text-[#35AD29]" : "font-bold text-[#101418]/70"}`}>
                    {label}
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  active ? "text-[#35AD29]" : "text-[#101418]/50"
                }`}
              >
                <div className={`relative ${active ? "scale-110" : ""} transition-transform`}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                  {active && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#35AD29]" />
                  )}
                </div>
                <span className={`text-[11px] ${active ? "font-black" : "font-semibold"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
