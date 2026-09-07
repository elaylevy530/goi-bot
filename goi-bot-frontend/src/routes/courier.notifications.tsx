import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Bell,
  Bike,
  CheckCheck,
  ExternalLink,
  Inbox,
  Megaphone,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell } from "@/components/CourierShell";
import { ListEmptyState } from "@/components/ListEmptyState";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  COURIER_NOTIFICATION_CATEGORIES,
  COURIER_NOTIFICATION_CATEGORY_LABEL,
  resolveCourierNotificationCategory,
  type CourierNotificationCategory,
  type CourierNotificationFilter,
} from "@/lib/courier-notifications";
import {
  nestListMyCourierNotifications,
  nestMarkAllCourierNotificationsRead,
  nestMarkCourierNotificationRead,
} from "@/lib/nest-domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/notifications")({
  head: () => ({ meta: [{ title: "הודעות ועדכונים — Goi" }] }),
  component: NotificationsPage,
});

type NotificationRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  link_url?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  audience?: string | null;
  courier_id?: string | null;
  category?: string | null;
};

type CategorizedRow = NotificationRow & { resolvedCategory: CourierNotificationCategory };

const CATEGORY_ICON = {
  system: Megaphone,
  bonus: Sparkles,
  wallet: Wallet,
  jobs: Bike,
  personal: User,
} as const;

const FILTERS: { key: CourierNotificationFilter; label: string; icon: typeof Bell }[] = [
  { key: "all", label: "הכל", icon: Bell },
  ...COURIER_NOTIFICATION_CATEGORIES.map((key) => ({
    key,
    label: COURIER_NOTIFICATION_CATEGORY_LABEL[key],
    icon: CATEGORY_ICON[key],
  })),
];

const EMPTY_BY_CATEGORY: Record<CourierNotificationCategory, { title: string; description: string }> = {
  system: { title: "אין עדכוני מערכת", description: "עדכונים כלליים מהמערכת יופיעו כאן." },
  bonus: { title: "אין בונוסים עדיין", description: "הטבות ובונוסים לשליחים יופיעו בקטגוריה הזו." },
  wallet: { title: "אין עדכוני ארנק", description: "משיכות, תשלומים וחשבוניות יופיעו כאן." },
  jobs: { title: "אין עדכוני משלוחים", description: "שינויים בעבודות ובאזורי עבודה יופיעו כאן." },
  personal: { title: "אין הודעות אישיות", description: "הודעות שנשלחו רק אליך יופיעו כאן." },
};

function whenLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `היום · ${time}`;
  if (diff === 1) return `אתמול · ${time}`;
  return `${d.toLocaleDateString("he-IL", { day: "numeric", month: "long" })} · ${time}`;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<CourierNotificationFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["my-courier-notifications"],
    queryFn: () => nestListMyCourierNotifications() as Promise<NotificationRow[]>,
    refetchInterval: 30_000,
  });

  const categorized = useMemo(
    () =>
      notifications.map((row) => ({
        ...row,
        resolvedCategory: resolveCourierNotificationCategory(row),
      })),
    [notifications],
  );

  const counts = useMemo(() => {
    const next: Record<CourierNotificationFilter, number> = {
      all: categorized.length,
      system: 0,
      bonus: 0,
      wallet: 0,
      jobs: 0,
      personal: 0,
    };
    for (const row of categorized) next[row.resolvedCategory] += 1;
    return next;
  }, [categorized]);

  const unreadByCategory = useMemo(() => {
    const next: Record<CourierNotificationFilter, number> = {
      all: 0,
      system: 0,
      bonus: 0,
      wallet: 0,
      jobs: 0,
      personal: 0,
    };
    for (const row of categorized) {
      if (row.read_at) continue;
      next.all += 1;
      next[row.resolvedCategory] += 1;
    }
    return next;
  }, [categorized]);

  const visible = useMemo(
    () => (filter === "all" ? categorized : categorized.filter((row) => row.resolvedCategory === filter)),
    [categorized, filter],
  );

  const invalidateNotificationBadges = () => {
    qc.invalidateQueries({ queryKey: ["my-courier-notifications"] });
    qc.invalidateQueries({ queryKey: ["courier-notification-unread"] });
    qc.invalidateQueries({ queryKey: ["courier-nav-counts"] });
    qc.invalidateQueries({ queryKey: ["my-courier-me"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => nestMarkCourierNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["my-courier-notifications"] });
      const previous = qc.getQueryData<NotificationRow[]>(["my-courier-notifications"]);
      qc.setQueryData<NotificationRow[]>(["my-courier-notifications"], (old = []) =>
        old.map((row) => (row.id === id ? { ...row, read_at: row.read_at ?? new Date().toISOString() } : row)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["my-courier-notifications"], ctx.previous);
      toast.error("לא הצלחנו לסמן את ההודעה");
    },
    onSettled: invalidateNotificationBadges,
  });

  const markAllRead = useMutation({
    mutationFn: nestMarkAllCourierNotificationsRead,
    onSuccess: () => {
      invalidateNotificationBadges();
      toast.success("כל ההודעות סומנו כנקראו");
    },
    onError: () => toast.error("לא הצלחנו לסמן את ההודעות"),
  });

  const openRow = categorized.find((row) => row.id === openId) ?? null;

  function openNotification(row: CategorizedRow) {
    setOpenId(row.id);
    if (!row.read_at) markRead.mutate(row.id);
  }

  const unreadCount = unreadByCategory.all;
  const readCount = notifications.length - unreadCount;
  const listTitle = filter === "all" ? "כל ההודעות" : COURIER_NOTIFICATION_CATEGORY_LABEL[filter];

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">הודעות ועדכונים</h1>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                aria-label="סמן הכל כנקרא"
                className="grid size-11 shrink-0 place-items-center rounded-pill border border-border bg-surface text-primary shadow-card disabled:opacity-50"
              >
                <CheckCheck className="size-4" />
              </button>
            ) : (
              <div className="size-11 shrink-0" aria-hidden />
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-5xl">
            <section className="overflow-hidden rounded-card bg-courier-hero p-4 text-primary-foreground shadow-card-strong">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-right">
                  <p className="text-sm text-primary-foreground/80">הודעות חדשות</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{unreadCount}</p>
                  <p className="mt-2 text-xs text-primary-foreground/70">
                    {unreadCount === 0
                      ? "הכול מעודכן — אין הודעות שלא נקראו"
                      : unreadCount === 1
                        ? "יש הודעה אחת שממתינה לקריאה"
                        : `יש ${unreadCount} הודעות שממתינות לקריאה`}
                  </p>
                </div>
                <div className="grid size-14 shrink-0 place-items-center rounded-card bg-primary-foreground/10">
                  <Bell className="size-7" aria-hidden />
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-surface text-sm font-extrabold text-courier-hero active:bg-primary-soft disabled:opacity-60"
                >
                  <CheckCheck className="size-4" aria-hidden />
                  {markAllRead.isPending ? "מסמן…" : "סמן הכל כנקרא"}
                </button>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-card border border-border bg-surface p-3 shadow-card">
                <p className="text-xs font-bold text-text-strong">חדשות</p>
                <p className="mt-1 text-[11px] text-text-muted">ממתינות לקריאה</p>
                <p className={cn("mt-2 text-xl font-black tabular-nums", unreadCount > 0 ? "text-primary" : "text-text-strong")}>
                  {unreadCount}
                </p>
              </div>
              <div className="rounded-card border border-border bg-surface p-3 shadow-card">
                <p className="text-xs font-bold text-text-strong">נקראו</p>
                <p className="mt-1 text-[11px] text-text-muted">הודעות שכבר ראית</p>
                <p className="mt-2 text-xl font-black tabular-nums text-text-strong">{readCount}</p>
              </div>
            </div>

            <section className="rounded-card border border-border bg-surface p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-text-strong">סינון לפי סוג</h2>
                <p className="text-[11px] text-text-muted">{counts[filter]} בסינון הנוכחי</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const Icon = item.icon;
                  const active = filter === item.key;
                  const unread = unreadByCategory[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 text-xs font-extrabold transition-colors",
                        active
                          ? "border-transparent bg-courier-hero text-primary-foreground shadow-card"
                          : "border-border bg-bg text-text-strong",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {item.label}
                      <span
                        className={cn(
                          "min-w-5 rounded-pill px-1.5 py-0.5 text-[10px] tabular-nums",
                          active ? "bg-primary-foreground/15" : unread > 0 ? "bg-primary-soft text-primary" : "bg-muted text-text-muted",
                        )}
                      >
                        {counts[item.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {isLoading ? (
              <section className="space-y-2">
                <h2 className="text-sm font-extrabold text-text-strong">{listTitle}</h2>
                <ul className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-[4.5rem] animate-pulse rounded-card bg-surface shadow-card" />
                  ))}
                </ul>
              </section>
            ) : visible.length === 0 ? (
              <ListEmptyState
                title={filter === "all" ? "אין הודעות עדיין" : EMPTY_BY_CATEGORY[filter].title}
                description={filter === "all" ? "כשנשלח עדכון מהמערכת — הוא יופיע כאן." : EMPTY_BY_CATEGORY[filter].description}
                icon={<Inbox className="size-6" />}
                action={
                  filter === "all" ? undefined : (
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className="inline-flex min-h-11 items-center rounded-pill bg-courier-hero px-4 text-sm font-extrabold text-primary-foreground"
                    >
                      הצג הכל
                    </button>
                  )
                }
              />
            ) : (
              <section className="space-y-2">
                <h2 className="text-sm font-extrabold text-text-strong">{listTitle}</h2>
                <ul className="flex flex-col gap-2">
                  {visible.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      row={notification}
                      category={notification.resolvedCategory}
                      onOpen={() => openNotification(notification)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      <NotificationDialog row={openRow} onClose={() => setOpenId(null)} />
    </CourierShell>
  );
}

function NotificationCard({
  row,
  category,
  onOpen,
}: {
  row: NotificationRow;
  category: CourierNotificationCategory;
  onOpen: () => void;
}) {
  const unread = !row.read_at;
  const title = row.title?.trim() || "עדכון מהמערכת";
  const Icon = CATEGORY_ICON[category];

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-start gap-3 rounded-card border px-3 py-3 text-right shadow-card",
          unread ? "border-primary/20 bg-primary-soft" : "border-border bg-surface",
        )}
      >
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-pill",
            unread ? "bg-primary/15 text-primary" : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-text-strong">{title}</h3>
              <p className="mt-0.5 text-[11px] font-bold text-text-muted">{COURIER_NOTIFICATION_CATEGORY_LABEL[category]}</p>
            </div>
            {unread ? (
              <span className="shrink-0 rounded-pill bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                חדש
              </span>
            ) : (
              <span className="shrink-0 rounded-pill bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success-text">
                נקרא
              </span>
            )}
          </div>
          {row.body ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text">{row.body}</p> : null}
          <p className="mt-1 text-[11px] text-text-muted">{whenLabel(row.created_at)}</p>
        </div>
      </button>
    </li>
  );
}

function NotificationDialog({
  row,
  onClose,
}: {
  row: CategorizedRow | null;
  onClose: () => void;
}) {
  const shownRef = useRef<CategorizedRow | null>(null);
  if (row) shownRef.current = row;
  const shown = row ?? shownRef.current;
  if (!shown) return null;

  const title = shown.title?.trim() || "עדכון מהמערכת";
  const body = shown.body?.trim() || "אין פירוט נוסף להודעה הזו.";
  const link = shown.link_url?.trim() || "";
  const internal = link.startsWith("/");
  const Icon = CATEGORY_ICON[shown.resolvedCategory];

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-w-md rounded-card border-border bg-surface p-5 text-right shadow-card-strong [&>button]:left-4 [&>button]:right-auto"
      >
        <DialogHeader className="space-y-3 text-right">
          <div className="flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-card bg-primary-soft text-primary">
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-text-muted">
                {COURIER_NOTIFICATION_CATEGORY_LABEL[shown.resolvedCategory]}
              </p>
              <DialogTitle className="mt-1 text-right text-lg font-extrabold text-text-strong">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-right text-[11px] text-text-muted">
                {whenLabel(shown.created_at)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{body}</p>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {link ? (
            internal ? (
              <Link
                to={link}
                onClick={onClose}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-border bg-bg text-sm font-extrabold text-primary"
              >
                <ExternalLink className="size-4" aria-hidden />
                מעבר לקישור
              </Link>
            ) : (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-border bg-bg text-sm font-extrabold text-primary"
              >
                <ExternalLink className="size-4" aria-hidden />
                מעבר לקישור
              </a>
            )
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 w-full items-center justify-center rounded-pill bg-courier-hero text-sm font-extrabold text-primary-foreground"
          >
            סגור
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
