import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CourierAvatar } from "@/components/CourierAvatar";
import { InstallAppSidebarItem } from "@/components/InstallApp";
import { termsFor } from "@/lib/courier-kind";
import {
  applyCourierThemeClass,
  clearCourierThemeClass,
} from "@/lib/courier-theme";
import { toast } from "sonner";
import { LIVE_JOB_OFFLINE_ERROR, courierHasLiveActiveJob, signOutCourierSession } from "@/lib/courier-session";
import { isJobSkippedAtCurrentPrice, isLivePendingOffer, isOpenBroadcastJobForCourier } from "@/lib/courier-live-jobs";
import { nestListMyCourierNotifications, nestMyNotificationUnreadCount } from "@/lib/nest-domain";
import { nestListConversations } from "@/lib/nest-chat";
import {
  nestCourierActiveJobCount,
  nestListCourierDeclines,
  nestListCourierOffers,
  nestListOpenBroadcastJobs,
} from "@/lib/nest-jobs";
import {
  Bell,
  Gift,
  Inbox,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Send,
  Settings,
  Star,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function useDrawerCourier() {
  return useQuery({
    queryKey: ["my-courier-me"],
    queryFn: async () => {
      const { nestMyCourier, getNestAccessToken } = await import("@/lib/nest-auth");
      if (!getNestAccessToken()) return null;
      return nestMyCourier();
    },
    staleTime: 10_000,
  });
}

function useDrawerNavCounts(courier?: { id?: string } | null) {
  const courierId = courier?.id ?? null;
  return useQuery({
    queryKey: ["courier-nav-counts", courierId],
    enabled: !!courierId,
    refetchInterval: 15_000,
    staleTime: 5_000,
    queryFn: async () => {
      const [pendingOffers, openJobs, activeJobs, declinedRows, notifications, conversations] = await Promise.all([
        nestListCourierOffers("pending"),
        nestListOpenBroadcastJobs(),
        nestCourierActiveJobCount(),
        nestListCourierDeclines(),
        nestListMyCourierNotifications().catch(() => []),
        nestListConversations().catch(() => []),
      ]);
      const unique = new Set<string>();
      for (const o of pendingOffers) {
        if (isLivePendingOffer(o, courier)) {
          const job = o.jobs as { id?: string } | null;
          const jobId = job?.id ?? o.job_id;
          if (jobId && !isJobSkippedAtCurrentPrice(job ?? { id: jobId }, declinedRows)) unique.add(jobId);
        }
      }
      for (const j of openJobs) {
        if (isJobSkippedAtCurrentPrice(j, declinedRows)) continue;
        if (isOpenBroadcastJobForCourier(j, courier)) unique.add(j.id);
      }
      const unreadNotifications = (notifications as { read_at?: string | null }[]).filter((n) => !n.read_at).length;
      const unreadChat = (conversations as { kind?: string; unread_courier?: number }[])
        .filter((c) => c.kind === "courier_business")
        .reduce((n, c) => n + Number(c.unread_courier ?? 0), 0);
      const unreadSupport = (conversations as { kind?: string; unread_courier?: number }[])
        .filter((c) => c.kind === "courier_support")
        .reduce((n, c) => n + Number(c.unread_courier ?? 0), 0);
      return {
        pendingOffers: unique.size,
        activeJobs,
        unreadNotifications,
        unreadChat,
        unreadSupport,
      };
    },
  });
}

type MenuApi = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  setOpen: (open: boolean) => void;
};

const CourierMenuContext = createContext<MenuApi | null>(null);

export function useCourierMenu() {
  const ctx = useContext(CourierMenuContext);
  if (!ctx) {
    throw new Error("useCourierMenu must be used within CourierMenuProvider");
  }
  return ctx;
}

export function CourierMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const api = useMemo<MenuApi>(
    () => ({
      open,
      setOpen,
      openMenu: () => setOpen(true),
      closeMenu: () => setOpen(false),
    }),
    [open],
  );

  // Dark mode is currently disabled — keep courier chrome on light tokens.
  useEffect(() => {
    applyCourierThemeClass("light");
    return () => {
      clearCourierThemeClass();
    };
  }, []);

  return (
    <CourierMenuContext.Provider value={api}>
      {children}
      <CourierSideDrawer />
    </CourierMenuContext.Provider>
  );
}

function NavBadge({ value }: { value: number }) {
  if (!value || value <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[10px] font-extrabold text-primary-foreground">
      {value > 99 ? "99+" : value}
    </span>
  );
}

type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: typeof Inbox;
  badge?: number;
  match?: (path: string) => boolean;
};

function firstNameOf(name?: string | null) {
  const trimmed = name?.trim() || "";
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] || trimmed;
}

function courierNavGroups(
  t: ReturnType<typeof termsFor>,
  counts?: {
    pendingOffers?: number;
    activeJobs?: number;
    unreadNotifications?: number;
    unreadChat?: number;
    unreadSupport?: number;
  } | null,
) {
  const work: NavItem[] = [
    {
      key: "new-jobs",
      label: "עבודות חדשות",
      to: "/courier/new-jobs",
      icon: Inbox,
      badge: counts?.pendingOffers ?? 0,
      match: (p) => p === "/courier/new-jobs" || p === "/courier" || p === "/courier/dashboard",
    },
    {
      key: "active",
      label: t.activeJobs,
      to: "/courier/active",
      icon: Send,
      badge: counts?.activeJobs ?? 0,
    },
    {
      key: "messages",
      label: "צ׳אט עם עסקים",
      to: "/courier/messages",
      icon: MessageSquare,
      badge: counts?.unreadChat ?? 0,
    },
    {
      key: "support",
      label: "צ׳אט עם התמיכה",
      to: "/courier/support",
      icon: LifeBuoy,
      badge: counts?.unreadSupport ?? 0,
    },
  ];
  const account: NavItem[] = [
    {
      key: "history",
      label: t.myJobs,
      to: "/courier/performance",
      icon: TrendingUp,
      match: (p) => p === "/courier/performance" || p === "/courier/history",
    },
    { key: "wallet", label: "ארנק", to: "/courier/wallet", icon: Wallet },
    { key: "share", label: "שתף והרוויח", to: "/courier/share", icon: Gift },
    { key: "ratings", label: "דירוגים וביצועים", to: "/courier/ratings", icon: Star },
    {
      key: "work-area",
      label: "אזורי עבודה",
      to: "/courier/availability",
      icon: MapPin,
      match: (p) => p === "/courier/availability",
    },
    {
      key: "notifications",
      label: "הודעות ועדכונים",
      to: "/courier/notifications",
      icon: Bell,
      badge: counts?.unreadNotifications ?? 0,
    },
    { key: "my-profile", label: "פרופיל אישי", to: "/courier/my-profile", icon: User },
    { key: "account-settings", label: "הגדרות מערכת", to: "/courier/account-settings", icon: Settings },
  ];
  return { work, account };
}

function DrawerNavLink({
  item,
  path,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = item.match ? item.match(path) : path === item.to;
  const badge = item.badge ?? 0;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors",
        active
          ? "bg-primary/10 font-semibold text-courier-hero"
          : "font-medium text-text-strong hover:bg-muted/80 active:bg-muted",
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-primary" aria-hidden />
      )}
      <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.75} />
      <span className="min-w-0 flex-1 truncate text-right">{item.label}</span>
      {badge > 0 && <NavBadge value={badge} />}
    </Link>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 pt-3 text-[11px] font-bold text-text-muted">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CourierSideDrawer() {
  const { open, setOpen, closeMenu } = useCourierMenu();
  const { data: me } = useDrawerCourier();
  const { data: counts } = useDrawerNavCounts(me);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const accepting = approved && me?.accepting_jobs !== false;
  const liveJobLocksOffline = courierHasLiveActiveJob(me);
  const roleLabel = accepting
    ? `${t.worker} פעיל`
    : approved
      ? `${t.worker} לא פעיל`
      : me?.courier_status
        ? String(me.courier_status)
        : t.worker;

  const handleSignOut = async () => {
    closeMenu();
    const to = await signOutCourierSession(qc);
    navigate({ to, replace: true });
  };

  const handleToggleAvailability = async () => {
    if (!approved) return;
    if (accepting && liveJobLocksOffline) {
      toast.error(LIVE_JOB_OFFLINE_ERROR);
      return;
    }
    const { nestUpdateMyCourier } = await import("@/lib/nest-accounts");
    try {
      if (!accepting) {
        const { goCourierOnlineWithGps } = await import("@/lib/courier-location");
        await goCourierOnlineWithGps();
      } else {
        await nestUpdateMyCourier({ accepting_jobs: false });
      }
      await qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "לא הצלחנו לעדכן זמינות");
    }
  };

  const { work, account } = courierNavGroups(t, counts);
  const displayName = firstNameOf(me?.full_name) || t.worker;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        dir="rtl"
        className="inset-y-2 right-0 h-auto w-[min(340px,86vw)] max-w-[340px] gap-0 overflow-hidden rounded-l-[1.75rem] border-0 bg-surface p-0 shadow-card-strong sm:max-w-[340px] [&>button]:hidden"
      >
        <SheetTitle className="sr-only">תפריט</SheetTitle>

        <div
          className="flex h-full flex-col"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <CourierAvatar
                    path={(me as { avatar_url?: string | null } | null | undefined)?.avatar_url}
                    name={me?.full_name}
                    size={52}
                  />
                  {accepting && (
                    <span
                      className="absolute bottom-0 end-0 size-3.5 rounded-full bg-primary ring-2 ring-surface"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-[17px] font-extrabold leading-tight text-text-strong">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="סגור תפריט"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-text-strong transition-colors active:bg-border"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>

            <div
              className={cn(
                "mt-4 flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3",
                accepting ? "bg-primary/10" : "bg-muted",
              )}
            >
              <div className="min-w-0 flex-1 text-right">
                <p className="text-sm font-semibold text-text-strong">זמין לקבלת עבודה</p>
                {accepting && liveJobLocksOffline ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                    יש משלוח פעיל — לא ניתן לעבור למצב לא זמין
                  </p>
                ) : null}
              </div>
              <Switch
                checked={accepting}
                onCheckedChange={() => void handleToggleAvailability()}
                disabled={!approved || (accepting && liveJobLocksOffline)}
                aria-label="זמין לקבלת עבודה"
                className="h-6 w-11 shrink-0 data-[state=checked]:bg-primary [&>span]:size-5 data-[state=checked]:[&>span]:translate-x-5"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2" aria-label="תפריט צד">
            <NavSection title="עבודה">
              {work.map((item) => (
                <DrawerNavLink key={item.key} item={item} path={path} onNavigate={closeMenu} />
              ))}
            </NavSection>
            <div className="mx-3 my-2 border-t border-border" />
            <NavSection title="החשבון שלי">
              {account.map((item) => (
                <DrawerNavLink key={item.key} item={item} path={path} onNavigate={closeMenu} />
              ))}
            </NavSection>
          </nav>

          <div className="border-t border-border/80 pt-1">
            <InstallAppSidebarItem variant="light" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mx-2 mb-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#E11900] hover:bg-danger-bg active:bg-danger-bg"
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.9} />
              <span className="flex-1 text-right">יציאה</span>
            </button>
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-hidden />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Persistent desktop sidebar. */
export function CourierDesktopNav() {
  const { data: me } = useDrawerCourier();
  const { data: counts } = useDrawerNavCounts(me);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const { work, account } = courierNavGroups(t, counts);
  const displayName = firstNameOf(me?.full_name) || t.worker;

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-l border-border bg-surface lg:flex">
      <div className="border-b border-border px-5 py-5">
        <p className="text-lg font-extrabold text-text-strong">Goi שליח</p>
        <p className="mt-1 truncate text-sm text-text-muted">{displayName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="תפריט מחשב">
        <NavSection title="עבודה">
          {work.map((item) => (
            <DrawerNavLink key={item.key} item={item} path={path} />
          ))}
        </NavSection>
        <div className="mx-3 my-2 border-t border-border" />
        <NavSection title="החשבון שלי">
          {account.map((item) => (
            <DrawerNavLink key={item.key} item={item} path={path} />
          ))}
        </NavSection>
      </nav>
    </aside>
  );
}

export function CourierMenuButton({ className = "" }: { className?: string }) {
  const { openMenu } = useCourierMenu();
  return (
    <button
      type="button"
      onClick={openMenu}
      aria-label="תפריט"
      className={`size-[38px] min-h-11 min-w-11 grid place-items-center rounded-full bg-surface border border-border text-text-strong active:bg-muted transition-colors shrink-0 lg:hidden ${className}`}
    >
      <Menu className="size-[18px]" strokeWidth={2} aria-hidden />
    </button>
  );
}

/** Header bell — opens courier notifications, with an unread dot. */
export function CourierBellButton({ className = "" }: { className?: string }) {
  const { data: unread = 0 } = useQuery({
    queryKey: ["courier-notification-unread"],
    queryFn: nestMyNotificationUnreadCount,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
  const hasUnread = Number(unread) > 0;
  return (
    <Link
      to="/courier/notifications"
      aria-label={hasUnread ? "התראות חדשות" : "התראות"}
      className={`relative size-[38px] min-h-11 min-w-11 grid place-items-center rounded-full bg-surface border border-border text-text-strong active:bg-muted transition-colors shrink-0 ${className}`}
    >
      <Bell className="size-[18px]" strokeWidth={2} aria-hidden />
      {hasUnread && (
        <span
          className="absolute top-2 right-2 size-2 rounded-full bg-primary-deep ring-2 ring-surface"
          aria-hidden
        />
      )}
    </Link>
  );
}
