import { Link, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CourierAvatar } from "@/components/CourierAvatar";
import { termsFor } from "@/lib/courier-kind";
import { Bell, ChevronLeft, Clock3, Globe, Home, LogOut, Menu, User } from "lucide-react";
import { toast } from "sonner";

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

type MenuItem = {
  key: string;
  label: string;
  to?: string;
  meta?: string;
  icon: typeof Home;
  danger?: boolean;
  onClick?: () => void;
};

function CourierSideDrawer() {
  const { open, setOpen, closeMenu } = useCourierMenu();
  const { data: me } = useDrawerCourier();
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

  const items: MenuItem[] = [
    { key: "home", label: "מסך הבית", to: "/courier/new-jobs", icon: Home },
    { key: "profile", label: "פרופיל אישי", to: "/courier/profile", icon: User },
    {
      key: "history",
      label: t.kind === "mover" ? "היסטוריית הובלות" : "היסטוריית משלוחים",
      to: "/courier/history",
      icon: Clock3,
    },
    { key: "messages", label: "התראות ועדכונים", to: "/courier/messages", icon: Bell, meta: "חדש" },
    {
      key: "lang",
      label: "שפת האפליקציה",
      icon: Globe,
      meta: "עברית",
      onClick: () => toast.message("האפליקציה בעברית"),
    },
    { key: "logout", label: "התנתקות", icon: LogOut, danger: true, onClick: () => void handleSignOut() },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        dir="rtl"
        className="w-[min(280px,85vw)] max-w-[280px] p-0 gap-0 border-0 bg-surface shadow-card-strong [&>button]:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <SheetTitle className="sr-only">תפריט שליח</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-3 justify-end">
              <div className="min-w-0 text-right">
                <p className="text-base font-bold text-text-strong truncate">
                  {me?.full_name?.trim() || t.worker}
                </p>
                <p className="text-xs text-text-subtle mt-0.5">{roleLabel}</p>
              </div>
              <CourierAvatar
                path={(me as { avatar_url?: string | null } | null | undefined)?.avatar_url}
                name={me?.full_name}
                size={48}
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-y-contain py-3" aria-label="תפריט צד">
            {items.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <ChevronLeft className="size-3.5 text-text-muted shrink-0" aria-hidden />
                  {item.meta ? (
                    <span className="text-sm text-text-subtle shrink-0">{item.meta}</span>
                  ) : null}
                  <span
                    className={`flex-1 text-right text-base font-medium truncate ${
                      item.danger ? "text-destructive" : "text-text-strong"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`size-[34px] grid place-items-center rounded-full shrink-0 ${
                      item.danger ? "bg-danger-bg text-destructive" : "bg-bg text-text-strong"
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={2} />
                  </span>
                </>
              );

              const rowClass =
                "flex w-full min-h-14 items-center gap-3 px-5 py-4 border-b border-border bg-surface active:bg-muted transition-colors text-right";

              if (item.to) {
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={closeMenu}
                    className={rowClass}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    closeMenu();
                    item.onClick?.();
                  }}
                  className={rowClass}
                >
                  {content}
                </button>
              );
            })}
          </nav>

          <div
            className="pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
            aria-hidden
          />
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
