import "@/styles/goi-business.css";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  ClipboardList,
  Headphones,
  History,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Plug,
  ReceiptText,
  Settings,
  Store,
  X,
} from "lucide-react";
import { HomeScreenPushPrompt } from "@/components/courier/CourierPushPrompt";
import { nestListWalletTransactions } from "@/lib/nest-domain";
import {
  nestListMyNotifications,
  nestMarkAllNotificationsRead,
  nestUnreadNotificationCount,
  type NestBusinessNotification,
} from "@/lib/nest-accounts";
import { nestListJobs } from "@/lib/nest-jobs";
import { formatHebrewDate, isIncomingJob, isTrackingJob, walletBalance } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

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

export function useWalletBalance(businessId?: string) {
  return useQuery({
    queryKey: ["wallet-tx", businessId],
    enabled: !!businessId,
    queryFn: nestListWalletTransactions,
    select: (txs) => walletBalance(txs as Array<{ amount?: unknown }>),
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

export function useBusinessJobs(businessId?: string) {
  return useQuery({
    queryKey: ["business-jobs", businessId],
    enabled: !!businessId,
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
    queryFn: () => nestListJobs({ limit: 200 }),
  });
}

const NAV = [
  { section: "תפעול משלוחים", items: [
    { to: "/business/dashboard", label: "בית", icon: Home, match: (p: string) => p === "/business/dashboard" || p === "/business" || p === "/business/" },
    { to: "/business/new-delivery", label: "הזמנה חדשה", icon: Plus, match: (p: string) => p.startsWith("/business/new-") },
    { to: "/business/incoming", label: "הזמנות נכנסות לאישור", icon: ClipboardList, match: (p: string) => p.startsWith("/business/incoming") || p.startsWith("/business/quotes"), count: "incoming" as const },
    { to: "/business/active", label: "מעקב משלוחים פעילים", icon: MapPin, match: (p: string) => p.startsWith("/business/active") || p.startsWith("/business/track/"), count: "active" as const, tracking: true },
    { to: "/business/history", label: "היסטוריית משלוחים", icon: History, match: (p: string) => p.startsWith("/business/history") || p.startsWith("/business/orders") },
    { to: "/business/messages", label: "צ׳אט עם שליחים", icon: MessageCircle, match: (p: string) => p.startsWith("/business/messages") },
  ]},
  { section: "ניהול העסק", items: [
    { to: "/business/billing", label: "חשבוניות וחיובים", icon: ReceiptText, match: (p: string) => p.startsWith("/business/billing") || p.startsWith("/business/wallet") },
    { to: "/business/analytics", label: "דוחות וסטטיסטיקות", icon: BarChart3, match: (p: string) => p.startsWith("/business/analytics") },
    { to: "/business/account", label: "העסק שלי", icon: Store, match: (p: string) => p.startsWith("/business/account") || p.startsWith("/business/company") || p.startsWith("/business/profile") || p.startsWith("/business/team") },
    { to: "/business/integrations", label: "אינטגרציות וחיבורים", icon: Plug, match: (p: string) => p.startsWith("/business/integrations") },
  ]},
  { section: "החשבון שלי", items: [
    { to: "/business/settings", label: "הגדרות חשבון", icon: Settings, match: (p: string) => p.startsWith("/business/settings") },
    { to: "/business/notifications", label: "הודעות ועדכונים", icon: Bell, match: (p: string) => p.startsWith("/business/notifications") },
    { to: "/business/help", label: "עזרה ותמיכה", icon: Headphones, match: (p: string) => p.startsWith("/business/help") || p.startsWith("/business/support") },
  ]},
];

function pageClass(pathname: string) {
  if (pathname.startsWith("/business/new-")) return "page-new";
  if (pathname.startsWith("/business/incoming") || pathname.startsWith("/business/quotes")) return "page-incoming";
  if (pathname.startsWith("/business/active") || pathname.startsWith("/business/track/")) return "page-tracking";
  if (pathname.startsWith("/business/history") || pathname.startsWith("/business/orders")) return "page-history";
  if (pathname.startsWith("/business/messages")) return "page-chat";
  if (pathname.startsWith("/business/account") || pathname.startsWith("/business/company") || pathname.startsWith("/business/profile") || pathname.startsWith("/business/team")) return "business-shell";
  if (pathname === "/business/dashboard" || pathname === "/business" || pathname === "/business/") return "page-home";
  return "extra-page";
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
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button className="bell-button icon-btn" aria-label="התראות" onClick={() => setOpen((v) => !v)}>
        <Bell size={23} />
        {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="סגור התראות" onClick={() => setOpen(false)} />
          <div className="panel absolute end-0 top-12 z-50 w-80 p-0" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#e5ebe8] px-4 py-3">
              <strong>התראות</strong>
              {unread > 0 && (
                <button type="button" className="link" onClick={() => markAll.mutate()}>
                  סמן הכל
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="empty-state">אין התראות חדשות</div>
              ) : (
                (items as NestBusinessNotification[]).map((n) => (
                  <Link
                    key={n.id}
                    to={(n.link as never) || "/business/notifications"}
                    onClick={() => setOpen(false)}
                    className={cn("update-tile", !n.read_at && "unread")}
                  >
                    <div>
                      <strong>{n.title}</strong>
                      {n.body && <p>{n.body}</p>}
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link to="/business/notifications" className="panel-link" onClick={() => setOpen(false)}>
              כל ההתראות
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function BusinessShell({
  children,
  title,
  subtitle,
  headerExtra,
  headerActions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  headerActions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const { data: jobs = [] } = useBusinessJobs(me?.id);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["notif-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notif-recent"] });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  const displayName =
    (me as { business_name?: string; name?: string } | null)?.business_name ||
    (me as { name?: string } | null)?.name ||
    "העסק שלי";
  const incomingCount = jobs.filter(isIncomingJob).length;
  const activeCount = jobs.filter(isTrackingJob).length;
  const counts = { incoming: incomingCount, active: activeCount };
  const hideChrome = pathname.startsWith("/business/new-multi-delivery") || pathname.startsWith("/business/new-route") || pathname.startsWith("/business/new-shift");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/business/history", search: { q } });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    const { nestLogout } = await import("@/lib/nest-auth");
    nestLogout();
    navigate({ to: "/auth", replace: true });
  };

  const isHome = pageClass(pathname) === "page-home";
  const isOrder = pageClass(pathname) === "page-new";

  return (
    <div dir="rtl" className="goi-biz">
      {navOpen && (
        <button type="button" className="sidebar-overlay" aria-label="סגור תפריט" onClick={() => setNavOpen(false)} />
      )}
      <div className="app-shell">
        <aside className={cn("app-sidebar", navOpen && "is-open")}>
          <div className="sidebar-brand">
            <Link to="/business/dashboard" className="goi-word" onClick={() => setNavOpen(false)}>
              GO<span>I</span>
              <small>BUSINESS</small>
            </Link>
            <button type="button" className="sidebar-collapse icon-btn lg:hidden" aria-label="סגור תפריט" onClick={() => setNavOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="main-nav" aria-label="ניווט עסקי" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
            {NAV.map((group, gi) => (
              <div key={group.section} className={gi > 0 ? "nav-divider" : undefined}>
                <span className="nav-section-label">{group.section}</span>
                {group.items.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;
                  const count = item.count ? counts[item.count] : 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-active={active ? "true" : undefined}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setNavOpen(false)}
                      className={cn("nav-item", item.tracking && "tracking-nav-item")}
                    >
                      <Icon size={22} />
                      <span>{item.label}</span>
                      {count > 0 && <b className="nav-count">{count}</b>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="nav-footer">
            <Link to="/business/account" className="sidebar-account" onClick={() => setNavOpen(false)}>
              <span className="sidebar-account-icon">
                <Store size={19} />
              </span>
              <span>
                <strong>{displayName}</strong>
                <small>החשבון העסקי שלך</small>
              </span>
            </Link>
            <button type="button" className="nav-item logout-button" onClick={signOut}>
              <LogOut size={21} />
              <span>יציאה מהחשבון</span>
            </button>
          </div>
        </aside>

        <div className={cn("app-main", pageClass(pathname))}>
          {!hideChrome && (
            <header className="app-header">
              <div className="header-business">
                <button type="button" className="mobile-menu icon-btn" aria-label="פתח תפריט" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
                  <Menu size={24} />
                </button>
                <button type="button" className="business-avatar" onClick={() => navigate({ to: "/business/account" })} aria-label="העסק שלי">
                  {displayName[0]}
                </button>
                <button type="button" className="business-title" onClick={() => navigate({ to: "/business/account" })}>
                  <strong>{displayName}</strong>
                  <span>
                    <i />
                    עסק פעיל
                    <b />
                    <Store size={13} /> סניף ראשי
                  </span>
                </button>
                <strong className="mobile-brand goi-word">GOI</strong>
              </div>
              <div className="header-actions">
                {headerActions ?? (
                  <>
                    <form onSubmit={onSearch} className="search-box hidden lg:flex" style={{ minWidth: 220, maxWidth: 280 }}>
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש משלוח..." aria-label="חיפוש הזמנות" />
                    </form>
                    {!pathname.startsWith("/business/new-") && (
                      <Link to="/business/new-delivery" className="btn primary header-new">
                        <Plus size={18} />
                        הזמנה חדשה
                      </Link>
                    )}
                    <NotificationsBell businessId={me?.id} />
                  </>
                )}
              </div>
            </header>
          )}
          <main className="page-scroll">
            {isHome || isOrder || hideChrome ? (
              children
            ) : (
              <div className="page-content">
                {(title || subtitle) && (
                  <div className="screen-heading">
                    <div>
                      {title && <h1>{title}</h1>}
                      {subtitle && <p>{subtitle}</p>}
                    </div>
                    {headerExtra}
                  </div>
                )}
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
      <HomeScreenPushPrompt kind="business" ownerId={me?.id} />
    </div>
  );
}

export { formatHebrewDate };
