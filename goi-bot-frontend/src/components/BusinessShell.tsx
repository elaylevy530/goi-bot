import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CreditCard,
  Home,
  MapPin,
  Menu,
  Package,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Truck,
  UserCircle2,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BusinessLogo } from "@/components/BusinessLogo";
import { cn } from "@/lib/utils";
import { formatHebrewDate, walletBalance } from "@/lib/business-panel";
import { nestListWalletTransactions } from "@/lib/nest-domain";
import {
  nestListMyNotifications,
  nestMarkAllNotificationsRead,
  nestUnreadNotificationCount,
  type NestBusinessNotification,
} from "@/lib/nest-accounts";

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
          className="relative grid size-10 place-items-center rounded-full text-text-strong transition hover:bg-muted"
          aria-label="התראות"
        >
          <Bell className="size-5" strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -start-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="end" className="w-80 overflow-hidden rounded-card p-0 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-bold text-text-strong">התראות</div>
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} className="text-xs font-bold text-text-strong underline">
              סמן הכל
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">אין התראות חדשות</div>
          ) : (
            (items as NestBusinessNotification[]).map((n) => (
              <Link
                key={n.id}
                to={(n.link as never) || "/business/dashboard"}
                className={cn("block border-b border-border/60 px-4 py-3 hover:bg-muted", !n.read_at && "bg-success-bg")}
              >
                <div className="text-xs font-bold text-text-strong">{n.title}</div>
                {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-text-muted">{n.body}</div>}
                <div className="mt-1 text-[10px] text-text-muted">{new Date(n.created_at).toLocaleString("he-IL")}</div>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/business/notifications"
          className="block border-t border-border py-3 text-center text-xs font-bold text-text-strong hover:bg-muted"
        >
          כל ההתראות
        </Link>
      </PopoverContent>
    </Popover>
  );
}

const MOBILE_NAV = [
  { to: "/business/dashboard", label: "בית", icon: Home, exact: true },
  { to: "/business/orders", label: "הזמנות", icon: Package },
  { to: "/business/new-delivery", label: "הזמן", icon: Plus, highlight: true },
  { to: "/business/active", label: "מעקב", icon: MapPin },
  { to: "/business/account", label: "אזור אישי", icon: UserCircle2 },
] as const;

const DESKTOP_NAV = [
  { to: "/business/dashboard", label: "דשבורד", icon: Home, match: (p: string) => p === "/business/dashboard" || p === "/business" || p === "/business/" },
  { to: "/business/new-delivery", label: "הזמנה חדשה", icon: PlusCircle, match: (p: string) => p.startsWith("/business/new-") },
  { to: "/business/orders", label: "הזמנות", icon: Package, match: (p: string) => p.startsWith("/business/orders") || p.startsWith("/business/order/") },
  { to: "/business/active", label: "מעקב חי", icon: MapPin, match: (p: string) => p.startsWith("/business/active") || p.startsWith("/business/track/") },
  { to: "/business/billing", label: "חיוב ותשלומים", icon: CreditCard, match: (p: string) => p.startsWith("/business/billing") || p.startsWith("/business/wallet") },
  { to: "/business/settings", label: "הגדרות", icon: Settings, match: (p: string) => p.startsWith("/business/settings") || p.startsWith("/business/profile") },
] as const;

const HIDE_MOBILE_HEADER = [
  "/business/new-multi-delivery",
  "/business/new-route",
  "/business/new-shift",
];

const TOP_LEVEL = [
  "/business/dashboard",
  "/business/orders",
  "/business/new-delivery",
  "/business/active",
  "/business/account",
  "/business",
  "/business/",
];

function desktopHeading(pathname: string, displayName: string) {
  if (pathname.startsWith("/business/orders")) return "ניהול הזמנות";
  if (pathname.startsWith("/business/active") || pathname.startsWith("/business/track/")) return "מעקב חי";
  if (pathname.startsWith("/business/billing") || pathname.startsWith("/business/wallet")) return "חיוב ותשלומים";
  if (pathname.startsWith("/business/settings") || pathname.startsWith("/business/profile")) return "הגדרות";
  if (pathname.startsWith("/business/new-")) return "הזמנה חדשה";
  return `שלום, ${displayName}`;
}

export function BusinessShell({
  children,
  title,
  subtitle,
  headerExtra,
}: {
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
  const { data: balance } = useWalletBalance(me?.id);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const showBack = !TOP_LEVEL.includes(pathname);
  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/business/account" });
  };

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
  const logoPath = (me as { logo_url?: string } | null)?.logo_url;
  const hideMobileHeader = HIDE_MOBILE_HEADER.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/business/orders", search: { q } });
  };

  return (
    <div dir="rtl" className="biz-panel rtl-panel min-h-dvh bg-bg text-text-strong lg:pb-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-text-strong/40 lg:hidden"
          aria-label="סגור תפריט"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-60 flex-col bg-sidebar text-sidebar-foreground",
          navOpen ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-8">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Truck className="size-[18px]" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">Goi</span>
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-white lg:hidden"
            aria-label="סגור תפריט"
            onClick={() => setNavOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1 px-4" aria-label="ניווט עסקי">
          {DESKTOP_NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                onClick={() => setNavOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] transition",
                  active
                    ? "bg-sidebar-accent font-medium text-white"
                    : "font-normal text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 start-0 w-[3px] rounded-s-full bg-primary" aria-hidden />
                )}
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1 text-right">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mb-8 rounded-xl bg-sidebar-accent p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-pro-badge-bg px-1.5 py-0.5 text-[10px] font-bold text-success">עסק</span>
            <span className="truncate text-sm font-bold text-white">{displayName}</span>
          </div>
          <p className="mt-3 w-full text-right text-[11px] text-sidebar-muted">
            יתרה נוכחית: ₪{(balance ?? 0).toLocaleString("he-IL")}
          </p>
        </div>
      </aside>

      <div className="min-h-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden lg:ps-60">
        <header className="sticky top-0 z-30 hidden shrink-0 border-b border-border bg-bg px-8 py-8 lg:block">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 text-right">
              <h1 className="truncate text-2xl font-bold text-text-strong">{desktopHeading(pathname, displayName)}</h1>
              <p className="mt-1 text-sm text-text-subtle">{formatHebrewDate()}</p>
            </div>
            <div className="flex items-center gap-4">
              <form onSubmit={onSearch} className="flex w-[16.25rem] items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2.5">
                <Search className="size-4 shrink-0 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חיפוש משלוח, כתובת או שליח..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-strong outline-none placeholder:text-text-muted"
                  aria-label="חיפוש הזמנות"
                />
              </form>
              <NotificationsBell businessId={me?.id} />
              <div className="h-6 w-px bg-border" />
              <Link to="/business/account" className="flex items-center gap-3">
                <div className="text-right leading-tight">
                  <div className="text-sm font-bold text-text-strong">{me?.name || displayName}</div>
                  <div className="text-[11px] text-text-muted">חשבון עסקי</div>
                </div>
                <BusinessLogo path={logoPath} name={displayName} size={40} />
              </Link>
            </div>
          </div>
        </header>

        {!hideMobileHeader && (
          <header className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
            <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="grid size-10 shrink-0 place-items-center rounded-pill border border-border bg-muted text-text-strong"
                  aria-label="תפריט"
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen(true)}
                >
                  <Menu className="size-5" />
                </button>
                <Link to="/business/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="בית">
                  <BusinessLogo path={logoPath} name={displayName} size={34} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold leading-none tracking-wide text-text-muted">Goi · עסקים</div>
                    <div className="mt-0.5 max-w-[180px] truncate text-[13px] font-black leading-tight text-text-strong">
                      {displayName}
                    </div>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsBell businessId={me?.id} />
                {showBack && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="חזרה"
                    className="grid size-10 place-items-center rounded-pill border border-border bg-muted text-text-strong transition hover:bg-surface"
                  >
                    <ArrowRight className="size-5" />
                  </button>
                )}
              </div>
            </div>
            {(title || subtitle) && (
              <div className="mx-auto max-w-3xl px-4 pb-3 pt-1 text-right">
                {title && <h1 className="truncate text-xl font-black text-text-strong">{title}</h1>}
                {subtitle && <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>}
              </div>
            )}
            {headerExtra && <div className="mx-auto max-w-3xl px-4 pb-3">{headerExtra}</div>}
          </header>
        )}

        <main className="relative min-h-0 overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch] [touch-action:pan-y] lg:flex-1">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-bottom-bar backdrop-blur lg:hidden"
        aria-label="ניווט עסקי"
      >
        <div className="mx-auto grid h-[72px] max-w-md grid-cols-5 px-1">
          {MOBILE_NAV.map((item) => {
            const { to, label, icon: Icon } = item;
            const highlight = "highlight" in item && item.highlight;
            const active =
              pathname === to ||
              (to === "/business/dashboard" && (pathname === "/business" || pathname === "/business/")) ||
              (to !== "/business/dashboard" && pathname.startsWith(`${to}/`));
            if (highlight) {
              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => navigate({ to })}
                  className="relative flex flex-col items-center justify-end pb-1.5"
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "absolute -top-5 grid size-[52px] place-items-center rounded-pill bg-primary text-primary-foreground shadow-fab ring-[5px] ring-bg transition active:scale-95",
                      active && "scale-105",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.6} />
                  </div>
                  <span className={cn("mt-11 text-[11px] transition", active ? "font-black text-primary" : "font-bold text-text-muted")}>
                    {label}
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center justify-center gap-1 transition", active ? "text-primary" : "text-text-muted")}
              >
                <div className={cn("relative transition-transform", active && "scale-110")}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                  {active && <div className="absolute -bottom-1.5 start-1/2 size-1 -translate-x-1/2 rounded-pill bg-primary rtl:translate-x-1/2" />}
                </div>
                <span className={cn("text-[11px]", active ? "font-black" : "font-semibold")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
