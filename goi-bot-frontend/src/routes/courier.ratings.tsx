import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Shield,
  Star,
  Target,
  ThumbsUp,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { CourierAvatar } from "@/components/CourierAvatar";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { nestGetMyCourierStats, nestListMyCourierOutcomes } from "@/lib/nest-domain";
import { useCourierTerms } from "@/lib/courier-kind";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/ratings")({
  head: () => ({ meta: [{ title: "דירוגים וביצועים — Goi" }] }),
  component: RatingsPage,
});

type RangeKey = "7" | "30" | "month";

type JobRef = {
  customer_name?: string | null;
  pickup_area?: string | null;
  dropoff_area?: string | null;
  heading_to_pickup_at?: string | null;
  arrived_at_pickup_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
};

type OutcomeRow = {
  id?: string;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  picked_up_at?: string | null;
  was_cancelled?: boolean | null;
  was_late?: boolean | null;
  customer_rating?: number | null;
  customer_comment?: string | null;
  jobs?: JobRef | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function minutesBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms / 60_000;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

function fmt(n: number, digits = 0) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

function ratingLabel(score: number | null) {
  if (score == null) return "אין דירוג עדיין";
  if (score >= 4.7) return "מצוין!";
  if (score >= 4.3) return "טוב מאוד";
  if (score >= 3.8) return "טוב";
  return "אפשר להשתפר";
}

function rangeFor(key: RangeKey) {
  const now = new Date();
  const end = now;
  if (key === "7") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end, prevStart: new Date(start.getTime() - 7 * 86_400_000), prevEnd: new Date(start.getTime() - 1), label: "7 הימים האחרונים" };
  }
  if (key === "month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "החודש הנוכחי" };
  }
  const start = startOfDay(now);
  start.setDate(start.getDate() - 29);
  return { start, end, prevStart: new Date(start.getTime() - 30 * 86_400_000), prevEnd: new Date(start.getTime() - 1), label: "30 הימים האחרונים" };
}

function inRange(o: OutcomeRow, start: Date, end: Date) {
  const raw = o.delivered_at || o.cancelled_at || o.created_at;
  if (!raw) return false;
  const at = new Date(raw);
  return at >= start && at <= end;
}

function pickupMins(o: OutcomeRow) {
  const start = o.jobs?.heading_to_pickup_at;
  const end = o.jobs?.arrived_at_pickup_at || o.jobs?.picked_up_at || o.picked_up_at;
  return minutesBetween(start, end);
}

function deliveryMins(o: OutcomeRow) {
  const start = o.jobs?.picked_up_at || o.picked_up_at;
  const end = o.jobs?.delivered_at || o.delivered_at;
  return minutesBetween(start, end);
}

function RatingsPage() {
  const t = useCourierTerms();
  const { data: me } = useMyCourier();
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const range = rangeFor(rangeKey);

  const { data: statsRow } = useQuery({
    queryKey: ["courier-ratings-stats", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestGetMyCourierStats(),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["courier-ratings-outcomes", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60_000,
    queryFn: () => nestListMyCourierOutcomes() as Promise<OutcomeRow[]>,
  });

  const ratedAll = rows.filter((o) => o.customer_rating != null && Number(o.customer_rating) > 0);
  const liveAvg = avg(ratedAll.map((o) => Number(o.customer_rating)));
  const score = liveAvg ?? (statsRow?.avg_rating != null ? Number(statsRow.avg_rating) : null);

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = ratedAll.filter((o) => Math.round(Number(o.customer_rating)) === star).length;
    const pct = ratedAll.length ? Math.round((count / ratedAll.length) * 100) : 0;
    return { star, count, pct };
  });

  const lastMonthStart = startOfDay(new Date());
  lastMonthStart.setDate(lastMonthStart.getDate() - 29);
  const ratingsLastMonth = ratedAll.filter((o) => inRange(o, lastMonthStart, new Date())).length;

  const completedAll = rows.filter((o) => o.delivered_at && !o.was_cancelled);
  const cancelledAll = rows.filter((o) => o.was_cancelled);
  const finishedAll = completedAll.length + cancelledAll.length;
  const completionPct = finishedAll ? Math.round((completedAll.length / finishedAll) * 100) : null;
  const onTimeAll = completedAll.filter((o) => !o.was_late);
  const onTimePct = completedAll.length ? Math.round((onTimeAll.length / completedAll.length) * 100) : null;
  const pickupAvgAll = avg(completedAll.map(pickupMins).filter((n): n is number => n != null));
  const deliveryAvgAll = avg(completedAll.map(deliveryMins).filter((n): n is number => n != null));

  const current = rows.filter((o) => inRange(o, range.start, range.end));
  const previous = rows.filter((o) => inRange(o, range.prevStart, range.prevEnd));

  const kpi = (set: OutcomeRow[]) => {
    const done = set.filter((o) => o.delivered_at && !o.was_cancelled);
    const cancelled = set.filter((o) => o.was_cancelled);
    const rated = done.filter((o) => o.customer_rating != null);
    const onTime = done.filter((o) => !o.was_late);
    return {
      jobs: done.length,
      rating: avg(rated.map((o) => Number(o.customer_rating))),
      pickup: avg(done.map(pickupMins).filter((n): n is number => n != null)),
      delivery: avg(done.map(deliveryMins).filter((n): n is number => n != null)),
      onTime: done.length ? (onTime.length / done.length) * 100 : null,
      cancelled: cancelled.length,
    };
  };

  const nowKpi = kpi(current);
  const prevKpi = kpi(previous);

  const reviews = useMemo(
    () =>
      ratedAll
        .slice()
        .sort((a, b) => new Date(b.delivered_at ?? 0).getTime() - new Date(a.delivered_at ?? 0).getTime()),
    [ratedAll],
  );
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">דירוגים וביצועים</h1>
            <div className="size-11 shrink-0" aria-hidden />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <section className="overflow-hidden rounded-card bg-primary-deep p-4 text-primary-foreground shadow-card-strong">
              <div className="flex items-center gap-3">
                <CourierAvatar
                  path={(me as { avatar_url?: string | null } | null)?.avatar_url}
                  name={me?.full_name}
                  size={64}
                  className="ring-2 ring-primary-foreground/30"
                />
                <div className="min-w-0 flex-1 text-center">
                  <p className="flex items-center justify-center gap-1 text-4xl font-black leading-none">
                    {score != null ? fmt(score, 1) : "—"}
                    <Star className="size-6 fill-warning text-warning" aria-hidden />
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary-foreground/90">{ratingLabel(score)}</p>
                </div>
                <div className="w-[42%] space-y-1">
                  {dist.map((d) => (
                    <div key={d.star} className="flex items-center gap-1.5">
                      <span className="w-3 text-[10px] font-bold tabular-nums">{d.star}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-primary-foreground/15">
                        <div
                          className={cn(
                            "h-full rounded-pill",
                            d.star >= 4 ? "bg-primary" : d.star === 3 ? "bg-warning" : "bg-destructive",
                          )}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                      <span className="w-7 text-left text-[10px] tabular-nums text-primary-foreground/80">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-primary-foreground/15 pt-3">
                <HeroStat icon={<Shield className="size-3.5" />} value={completionPct != null ? `${completionPct}%` : "—"} label={`אחוז השלמת ${t.jobPlural}`} />
                <HeroStat icon={<Clock className="size-3.5" />} value={pickupAvgAll != null ? `${fmt(pickupAvgAll)} דק'`: "—"} label="זמן הגעה ממוצע לאיסוף" />
                <HeroStat icon={<Target className="size-3.5" />} value={onTimePct != null ? `${onTimePct}%` : "—"} label="אחוז מסירה בזמן" />
                <HeroStat icon={<ThumbsUp className="size-3.5" />} value={String(ratingsLastMonth)} label="דירוגים בחודש האחרון" />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-text-strong">
                  מדדי ביצוע עיקריים
                  <Info className="size-3.5 text-text-muted" aria-hidden />
                </h2>
                <label className="sr-only" htmlFor="ratings-range">טווח תאריכים</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-primary" />
                  <select
                    id="ratings-range"
                    value={rangeKey}
                    onChange={(e) => setRangeKey(e.target.value as RangeKey)}
                    className="min-h-11 appearance-none rounded-pill border border-border bg-surface py-2 pl-3 pr-8 text-xs font-bold text-text-strong"
                  >
                    <option value="7">7 הימים האחרונים</option>
                    <option value="30">30 הימים האחרונים</option>
                    <option value="month">החודש הנוכחי</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-sm text-text-muted">טוען…</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard icon={<CheckCircle2 className="size-4" />} value={String(nowKpi.jobs)} label={`${t.jobPlural} שביצעתי`} trend={deltaText(nowKpi.jobs, prevKpi.jobs, "count")} upIsGood />
                  <KpiCard icon={<Timer className="size-4" />} value={nowKpi.rating != null ? fmt(nowKpi.rating, 1) : "—"} label="דירוג לקוחות ממוצע" trend={deltaText(nowKpi.rating, prevKpi.rating, "score")} upIsGood />
                  <KpiCard icon={<Target className="size-4" />} value={nowKpi.pickup != null ? `${fmt(nowKpi.pickup)} דק'` : "—"} label="זמן הגעה ממוצע לאיסוף" trend={deltaText(nowKpi.pickup, prevKpi.pickup, "mins")} upIsGood={false} />
                  <KpiCard icon={<MapPin className="size-4" />} value={nowKpi.delivery != null ? `${fmt(nowKpi.delivery)} דק'` : "—"} label="זמן מסירה ממוצע" trend={deltaText(nowKpi.delivery, prevKpi.delivery, "mins")} upIsGood={false} />
                  <KpiCard icon={<Clock className="size-4" />} value={nowKpi.onTime != null ? `${fmt(nowKpi.onTime)}%` : "—"} label="אחוז מסירה בזמן" trend={deltaText(nowKpi.onTime, prevKpi.onTime, "pct")} upIsGood />
                  <KpiCard icon={<XCircle className="size-4" />} value={String(nowKpi.cancelled)} label="ביטולים" trend={deltaText(nowKpi.cancelled, prevKpi.cancelled, "count")} upIsGood={false} danger />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-text-strong">דירוגים אחרונים מלקוחות</h2>
                {reviews.length > 3 && (
                  <button type="button" onClick={() => setShowAllReviews((v) => !v)} className="min-h-11 text-sm font-bold text-primary">
                    {showAllReviews ? "הצג פחות" : "הצג הכל"}
                  </button>
                )}
              </div>
              {visibleReviews.length === 0 ? (
                <div className="rounded-card border border-border bg-surface py-10 text-center text-sm text-text-muted">
                  עדיין אין דירוגים מלקוחות
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleReviews.map((o) => (
                    <ReviewRow key={String(o.id ?? o.delivered_at)} row={o} />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-text-strong">השוואה לחודש שעבר</h2>
                <div className="flex items-center gap-3 text-[11px] text-text-subtle">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> החודש</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-border-strong" /> חודש שעבר</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <CompareBar label={t.jobPlural} current={nowKpi.jobs} previous={prevKpi.jobs} />
                <CompareBar label="מסירה בזמן" current={nowKpi.onTime} previous={prevKpi.onTime} suffix="%" />
                <CompareBar label="דירוג ממוצע" current={nowKpi.rating} previous={prevKpi.rating} digits={1} />
                <CompareBar label="ביטולים" current={nowKpi.cancelled} previous={prevKpi.cancelled} invert />
              </div>
            </section>

            <div className="flex items-start gap-2 rounded-card bg-primary-soft px-4 py-3 text-sm font-semibold text-success-text">
              <Trophy className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>שמור על הדירוג! {t.workerPlural} עם דירוג מעל 4.5 מקבלים עדיפות בהצעות {t.jobPlural}.</p>
            </div>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function deltaText(
  current: number | null,
  previous: number | null,
  kind: "count" | "score" | "mins" | "pct",
) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.05 && kind !== "count") return "ללא שינוי לעומת התקופה הקודמת";
  if (diff === 0) return "ללא שינוי לעומת התקופה הקודמת";
  if (kind === "mins") return `${diff > 0 ? "↑" : "↓"} ${fmt(Math.abs(diff))} דק' לעומת התקופה הקודמת`;
  if (kind === "pct") return `${diff > 0 ? "↑" : "↓"} ${fmt(Math.abs(diff))}% לעומת התקופה הקודמת`;
  if (kind === "score") return `${diff > 0 ? "+" : ""}${fmt(diff, 1)} לעומת התקופה הקודמת`;
  const pct = previous ? (diff / previous) * 100 : 100;
  return `${pct > 0 ? "+" : ""}${fmt(pct)}% לעומת התקופה הקודמת`;
}

function isImproved(trend: string | null, upIsGood: boolean) {
  if (!trend) return null;
  if (trend.startsWith("ללא")) return null;
  const up = trend.includes("+") || trend.includes("↑");
  const down = trend.includes("↓") || trend.startsWith("-");
  if (up) return upIsGood;
  if (down) return !upIsGood;
  return null;
}

function HeroStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-center text-primary-foreground/80">{icon}</div>
      <p className="text-sm font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-[9px] leading-tight text-primary-foreground/70">{label}</p>
    </div>
  );
}

function KpiCard({
  icon,
  value,
  label,
  trend,
  upIsGood,
  danger,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  trend: string | null;
  upIsGood: boolean;
  danger?: boolean;
}) {
  const good = isImproved(trend, upIsGood);
  return (
    <div className="min-w-0 rounded-card border border-border bg-surface p-3 shadow-card">
      <div className={cn("mb-2 grid size-8 place-items-center rounded-pill border", danger ? "border-destructive/30 text-destructive" : "border-primary/30 text-primary")}>
        {icon}
      </div>
      <p className="text-xl font-black tabular-nums text-text-strong">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-text-subtle">{label}</p>
      {trend && (
        <p className={cn("mt-1 text-[10px] font-semibold", good == null ? "text-text-muted" : good ? "text-primary" : "text-destructive")}>
          {trend}
        </p>
      )}
    </div>
  );
}

function ReviewRow({ row }: { row: OutcomeRow }) {
  const rating = Number(row.customer_rating);
  const when = row.delivered_at ? new Date(row.delivered_at).toLocaleDateString("he-IL") : "";
  const place = [row.jobs?.customer_name, row.jobs?.pickup_area || row.jobs?.dropoff_area].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start gap-3 rounded-card border border-border bg-surface p-3 shadow-card">
      <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-muted text-text-muted">
        <ThumbsUp className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-extrabold tabular-nums text-text-strong">{fmt(rating, 1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("size-3", n <= Math.round(rating) ? "fill-warning text-warning" : "text-border-strong")} />
              ))}
            </div>
          </div>
          <span className="text-[11px] text-text-muted">{when}</span>
        </div>
        {row.customer_comment && <p className="mt-1 text-sm text-text">{row.customer_comment}</p>}
        {place && <p className="mt-1 text-xs text-text-muted">{place}</p>}
      </div>
    </li>
  );
}

function CompareBar({
  label,
  current,
  previous,
  suffix = "",
  digits = 0,
  invert,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  suffix?: string;
  digits?: number;
  invert?: boolean;
}) {
  const max = Math.max(current ?? 0, previous ?? 0, 1);
  return (
    <div className="text-center">
      <div className="flex h-20 items-end justify-center gap-1.5">
        <div className="flex w-4 flex-col items-center gap-1">
          <span className="text-[9px] font-bold tabular-nums text-primary">{current != null ? `${fmt(current, digits)}${suffix}` : "—"}</span>
          <div className="w-full rounded-t-md bg-primary" style={{ height: `${((current ?? 0) / max) * 56}px` }} />
        </div>
        <div className="flex w-4 flex-col items-center gap-1">
          <span className="text-[9px] font-bold tabular-nums text-text-muted">{previous != null ? `${fmt(previous, digits)}${suffix}` : "—"}</span>
          <div className="w-full rounded-t-md bg-border-strong" style={{ height: `${((previous ?? 0) / max) * 56}px` }} />
        </div>
      </div>
      <p className={cn("mt-2 text-[10px] font-semibold text-text-subtle", invert && "text-text-muted")}>{label}</p>
    </div>
  );
}
