import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CourierAvatar } from "@/components/CourierAvatar";
import { InstallAppSidebarItem } from "@/components/InstallApp";
import { termsFor } from "@/lib/courier-kind";
import { isLivePendingOffer, isOpenBroadcastJobForCourier } from "@/lib/courier-live-jobs";
import { nestListMyCourierNotifications, nestMyNotificationUnreadCount } from "@/lib/nest-domain";
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
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  Star,
  TrendingUp,
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
      const [pendingOffers, openJobs, activeJobs, declinedRows, notifications] = await Promise.all([
        nestListCourierOffers("pending"),
        nestListOpenBroadcastJobs(),
        nestCourierActiveJobCount(),
        nestListCourierDeclines(),
        nestListMyCourierNotifications().catch(() => []),
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
      const unreadNotifications = (notifications as { read_at?: string | null }[]).filter((n) => !n.read_at).length;
      return {
        pendingOffers: unique.size,
        activeJobs,
        unreadNotifications,
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
    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill bg-primary text-primary-foreground text-[10px] font-extrabold">
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
  featured?: boolean;
  match?: (path: string) => boolean;
};

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
  const roleLabel = accepting
    ? `${t.worker} פעיל`
    : approved
      ? `${t.worker} לא פעיל`
      : me?.courier_status
        ? String(me.courier_status)
        : t.worker;

  const handleSignOut = async () => {
    closeMenu();
    await qc.cancelQueries();
    qc.clear();
    const { isNestPreviewReadOnly, nestExitPreview, nestLogout } = await import("@/lib/nest-auth");
    if (isNestPreviewReadOnly()) {
      await nestExitPreview();
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    nestLogout();
    navigate({ to: "/auth", replace: true });
  };

  const handleToggleAvailability = async () => {
    const { nestUpdateMyCourier } = await import("@/lib/nest-accounts");
    try {
      await nestUpdateMyCourier({ accepting_jobs: !accepting });
      await qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    } catch (error) {
      console.error("Failed to toggle availability:", error);
    }
  };

  const items: NavItem[] = [
    {
      key: "new-jobs",
      label: "עבודה זמינה",
      to: "/courier/new-jobs",
      icon: Inbox,
      badge: counts?.pendingOffers ?? 0,
      match: (p) => p === "/courier/new-jobs" || p === "/courier" || p === "/courier/dashboard",
    },
    {
      key: "active",
      label: t.activeJobs,
      to: "/courier/active",
      icon: Navigation,
      badge: counts?.activeJobs ?? 0,
    },
    {
      key: "history",
      label: t.myJobs,
      to: "/courier/performance",
      icon: TrendingUp,
      match: (p) => p === "/courier/performance" || p === "/courier/history",
    },
    {
      key: "wallet",
      label: "ארנק",
      to: "/courier/wallet",
      icon: Wallet,
    },
    {
      key: "share",
      label: "שתף והרוויח",
      to: "/courier/share",
      icon: Gift,
    },
    {
      key: "ratings",
      label: "דירוגים וביצועים",
      to: "/courier/ratings",
      icon: Star,
    },
    {
      key: "work-area",
      label: "אזור עבודה ותמיכה",
      to: "/courier/availability",
      icon: MapPin,
      featured: true,
      match: (p) => p === "/courier/availability",
    },
    {
      key: "notifications",
      label: "הודעות ועדכונים",
      to: "/courier/notifications",
      icon: Bell,
      badge: counts?.unreadNotifications ?? 0,
    },
    {
      key: "messages",
      label: "צ׳אט",
      to: "/courier/messages",
      icon: MessageSquare,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        dir="rtl"
        className="w-[min(300px,88vw)] max-w-[300px] p-0 gap-0 border-0 bg-surface shadow-card-strong [&>button]:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <SheetTitle className="sr-only">תפריט {t.panel}</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={closeMenu}
                aria-label="סגור תפריט"
                className="size-10 grid place-items-center rounded-pill bg-muted text-text-strong active:bg-border transition-colors shrink-0"
              >
                <X className="size-5" />
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0 text-right">
                  <p className="text-base font-bold text-text-strong truncate">
                    {me?.full_name?.trim() || t.worker}
                  </p>
                  <p className="text-xs text-text-subtle mt-0.5">{roleLabel}</p>
                  <p className="text-[11px] text-text-muted mt-1">{t.panel}</p>
                </div>
                <CourierAvatar
                  path={(me as { avatar_url?: string | null } | null | undefined)?.avatar_url}
                  name={me?.full_name}
                  size={48}
                />
              </div>
            </div>
          </div>

          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <Switch
                checked={accepting}
                onCheckedChange={() => void handleToggleAvailability()}
                disabled={!approved}
                aria-label="זמין לקבלת עבודה"
                className="shrink-0 data-[state=checked]:bg-primary"
              />
              <div className="min-w-0 flex-1 text-right">
                <p className="text-sm font-semibold text-text-strong">זמין לקבלת עבודה</p>
                <p className="text-xs text-text-muted mt-0.5">{t.panel}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-1" aria-label="תפריט צד">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.match ? item.match(path) : path === item.to;
              const badge = item.badge ?? 0;

              if (item.featured) {
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full min-h-12 items-center gap-3 px-4 py-3 rounded-pill text-sm font-extrabold transition-colors",
                      active
                        ? "bg-primary-deep text-primary-foreground shadow-card-strong"
                        : "bg-primary text-primary-foreground shadow-fab active:opacity-90",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={2.5} />
                    <span className="flex-1 text-right truncate">{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.key}
                  to={item.to}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full min-h-12 items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-fab"
                      : "text-text-strong hover:bg-muted active:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 text-right truncate">{item.label}</span>
                  {badge > 0 && (
                    active ? (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill bg-primary-foreground/20 text-primary-foreground text-[10px] font-extrabold">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : (
                      <NavBadge value={badge} />
                    )
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border pt-1">
            <InstallAppSidebarItem variant="light" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="m-3 mt-1 flex w-[calc(100%-1.5rem)] items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold text-destructive hover:bg-danger-bg active:bg-danger-bg transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="flex-1 text-right">יציאה</span>
            </button>
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-hidden />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Round menu button used in PWA headers (opens the side drawer). */
export function CourierMenuButton({ className = "" }: { className?: string }) {
  const { openMenu } = useCourierMenu();
  return (
    <button
      type="button"
      onClick={openMenu}
      aria-label="תפריט"
      className={`size-[38px] min-h-11 min-w-11 grid place-items-center rounded-full bg-surface border border-border text-text-strong active:bg-muted transition-colors shrink-0 ${className}`}
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
          className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-surface"
          aria-hidden
        />
      )}
    </Link>
  );
}
