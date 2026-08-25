import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CourierAvatar } from "@/components/CourierAvatar";
import { InstallAppSidebarItem } from "@/components/InstallApp";
import { termsFor } from "@/lib/courier-kind";
import { isLivePendingOffer, isOpenBroadcastJobForCourier } from "@/lib/courier-live-jobs";
import {
  nestCourierActiveJobCount,
  nestListCourierDeclines,
  nestListCourierOffers,
  nestListOpenBroadcastJobs,
} from "@/lib/nest-jobs";
import {
  Inbox,
  LogOut,
  Menu,
  MessageSquare,
  Navigation,
  TrendingUp,
  User,
  X,
} from "lucide-react";

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
        activeJobs,
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

  const items = [
    {
      key: "new-jobs",
      label: t.kind === "mover" ? "הובלות פנויות" : "משלוחים פנויים",
      to: "/courier/new-jobs",
      icon: Inbox,
      badge: (counts?.pendingOffers ?? 0),
    },
    {
      key: "active",
      label: "פעילים",
      to: "/courier/active",
      icon: Navigation,
      badge: counts?.activeJobs ?? 0,
    },
    {
      key: "performance",
      label: "ביצועים",
      to: "/courier/performance",
      icon: TrendingUp,
      badge: 0,
    },
    {
      key: "messages",
      label: "צאט",
      to: "/courier/messages",
      icon: MessageSquare,
      badge: 0,
    },
    {
      key: "profile",
      label: "אזור אישי",
      to: "/courier/profile",
      icon: User,
      badge: 0,
    },
  ] as const;

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

          <nav className="flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-1" aria-label="תפריט צד">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                item.to === "/courier/profile"
                  ? path.startsWith("/courier/profile")
                  : path === item.to ||
                    (item.to === "/courier/new-jobs" &&
                      (path === "/courier" || path === "/courier/dashboard"));
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full min-h-12 items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-fab"
                      : "text-text-strong hover:bg-muted active:bg-muted"
                  }`}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 text-right truncate">{item.label}</span>
                  {item.badge > 0 && (
                    active ? (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill bg-primary-foreground/20 text-primary-foreground text-[10px] font-extrabold">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : (
                      <NavBadge value={item.badge} />
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
