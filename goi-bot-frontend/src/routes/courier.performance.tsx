import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  CalendarDays,
  ChevronLeft,
  Coffee,
  MapPin,
  Package,
  Pizza,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { CourierBellButton, CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nestListMyCourierOutcomes } from "@/lib/nest-domain";
import { useCourierTerms } from "@/lib/courier-kind";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/performance")({
  head: () => ({ meta: [{ title: "ביצועים — Goi" }] }),
  component: PerformancePage,
});

type Period = "today" | "week" | "month" | "custom";

type JobRef = {
  id?: string;
  payment?: number | null;
  total_distance_km?: number | null;
  distance_km?: number | null;
  estimated_distance_km?: number | null;
  customer_name?: string | null;
  job_number?: string | number | null;
  pickup_area?: string | null;
  dropoff_area?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  job_type?: string | null;
  item_category?: string | null;
  package_type?: string | null;
};

type OutcomeRow = {
  id?: string;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  was_cancelled?: boolean | null;
  tip_amount?: number | null;
  jobs?: JobRef | null;
};

const PREVIEW_COUNT = 5;

const chartConfig = {
  income: { label: "הכנסה", color: "var(--primary)" },
} satisfies ChartConfig;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function kmOf(o: OutcomeRow) {
  const j = o.jobs;
  return Number(j?.total_distance_km ?? j?.distance_km ?? j?.estimated_distance_km ?? 0);
}

function payOf(o: OutcomeRow) {
  return Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0);
}

function isCompleted(o: OutcomeRow) {
  return !!o.delivered_at && !o.was_cancelled;
}

function inRange(o: OutcomeRow, start: Date, end: Date) {
  const raw = o.delivered_at || o.cancelled_at || o.created_at;
  if (!raw) return false;
  const at = new Date(raw);
  return at >= start && at <= end;
}

function fmt(n: number, digits = 0) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: digits }).format(n);
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function relativeDayLabel(daysAgo: number) {
  if (daysAgo === 0) return "היום";
  if (daysAgo === 1) return "אתמול";
  if (daysAgo === 2) return "לפני יומיים";
  return `לפני ${daysAgo} ימים`;
}

function CategoryIcon({ job }: { job?: JobRef | null }) {
  const raw = `${job?.item_category ?? ""} ${job?.job_type ?? ""} ${job?.package_type ?? ""}`.toLowerCase();
  const Icon = /pizza|פיצה/.test(raw)
    ? Pizza
    : /coffee|קפה/.test(raw)
      ? Coffee
      : /food|מזון|מסעדה|burger|המבורגר|sushi|סושי/.test(raw)
        ? UtensilsCrossed
        : Truck;
  return <Icon className="size-5" aria-hidden />;
}

function rangeFor(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "today") {
    return { start: startOfDay(now), end: endOfDay(now), label: "היום", summary: "סיכום עבור היום" };
  }
  if (period === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(now), label: "השבוע", summary: "סיכום עבור השבוע" };
  }
  if (period === "month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end: endOfDay(now), label: "החודש", summary: "סיכום עבור החודש" };
  }
  const start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
  const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
  return { start, end, label: "מותאם אישית", summary: "סיכום מותאם" };
}

function previousRange(period: Period, start: Date, end: Date) {
  if (period === "today") {
    const y = new Date(start);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }
  const ms = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms + 1);
  return { start: prevStart, end: prevEnd };
}

function comparisonCopy(period: Period) {
  if (period === "today") return "ביצועים בהשוואה לאתמול";
  if (period === "week") return "ביצועים בהשוואה לשבוע שעבר";
  if (period === "month") return "ביצועים בהשוואה לחודש שעבר";
  return "ביצועים בהשוואה לתקופה הקודמת";
}

function PerformancePage() {
  const t = useCourierTerms();
  const { data: me } = useMyCourier();
  const [period, setPeriod] = useState<Period>("today");
  const today = startOfDay(new Date());
  const [customFrom, setCustomFrom] = useState(toDateInput(today));
  const [customTo, setCustomTo] = useState(toDateInput(today));
  const [showAll, setShowAll] = useState(false);

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);
  const prev = useMemo(() => previousRange(period, range.start, range.end), [period, range.start, range.end]);

  const { data: rows = [], dataUpdatedAt, isLoading } = useQuery({
    queryKey: ["performance-outcomes", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: () => nestListMyCourierOutcomes() as Promise<OutcomeRow[]>,
  });

  const completed = useMemo(() => rows.filter(isCompleted), [rows]);
  const inPeriod = useMemo(
    () => completed.filter((o) => inRange(o, range.start, range.end)),
    [completed, range.start, range.end],
  );
  const prevPeriod = useMemo(
    () => completed.filter((o) => inRange(o, prev.start, prev.end)),
    [completed, prev.start, prev.end],
  );
  const allInPeriod = useMemo(
    () => rows.filter((o) => (isCompleted(o) || o.was_cancelled) && inRange(o, range.start, range.end)),
    [rows, range.start, range.end],
  );

  const income = inPeriod.reduce((s, o) => s + payOf(o), 0);
  const prevIncome = prevPeriod.reduce((s, o) => s + payOf(o), 0);
  const tips = inPeriod.reduce((s, o) => s + Number(o.tip_amount ?? 0), 0);
  const km = inPeriod.reduce((s, o) => s + kmOf(o), 0);
  const jobs = inPeriod.length;
  const avg = jobs > 0 ? income / jobs : 0;
  const delta = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : income > 0 ? 100 : 0;
  const showDelta = prevIncome > 0 || income > 0;

  const chartData = useMemo(() => {
    const days = period === "month" ? 30 : 7;
    if (period === "custom") {
      const span = Math.min(31, Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000)));
      const points: { label: string; income: number }[] = [];
      for (let i = span - 1; i >= 0; i--) {
        const d = startOfDay(range.end);
        d.setDate(d.getDate() - i);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const sum = completed
          .filter((o) => o.delivered_at && new Date(o.delivered_at) >= d && new Date(o.delivered_at) < next)
          .reduce((s, o) => s + payOf(o), 0);
        points.push({
          label: d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }),
          income: Math.round(sum * 10) / 10,
        });
      }
      return points;
    }
    const points: { label: string; income: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const sum = completed
        .filter((o) => o.delivered_at && new Date(o.delivered_at) >= d && new Date(o.delivered_at) < next)
        .reduce((s, o) => s + payOf(o), 0);
      points.push({
        label: relativeDayLabel(i),
        income: Math.round(sum * 10) / 10,
      });
    }
    return points;
  }, [completed, period, range.end, range.start]);

  const visibleJobs = showAll
    ? [...allInPeriod].sort((a, b) => {
        const aAt = new Date(a.delivered_at || a.cancelled_at || 0).getTime();
        const bAt = new Date(b.delivered_at || b.cancelled_at || 0).getTime();
        return bAt - aAt;
      })
    : [...inPeriod]
        .sort((a, b) => new Date(b.delivered_at ?? 0).getTime() - new Date(a.delivered_at ?? 0).getTime())
        .slice(0, PREVIEW_COUNT);

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : "";

  const tabs: { key: Period; label: string }[] = [
    { key: "today", label: "היום" },
    { key: "week", label: "השבוע" },
    { key: "month", label: "החודש" },
    { key: "custom", label: "מותאם אישית" },
  ];

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">ביצועים</h1>
            <CourierBellButton className="size-11 border-0 shadow-card" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <Select
              value={period}
              onValueChange={(value) => {
                setPeriod(value as Period);
                setShowAll(false);
              }}
            >
              <SelectTrigger
                aria-label="בחירת תקופה"
                className="min-h-11 w-full rounded-card border-border bg-surface text-sm font-bold text-text-strong shadow-card"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl" className="text-right">
                {tabs.map((tab) => (
                  <SelectItem key={tab.key} value={tab.key} className="text-right font-bold">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {period === "custom" && (
              <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
                <div className="space-y-1.5">
                  <Label className="block text-right text-xs text-text-subtle">מתאריך</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="min-h-11 rounded-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-right text-xs text-text-subtle">עד תאריך</Label>
                  <Input
                    type="date"
                    dir="ltr"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="min-h-11 rounded-card"
                  />
                </div>
              </div>
            )}

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary-soft text-primary">
                    <CalendarDays className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-base font-extrabold text-text-strong">{range.summary}</p>
                    <p className="mt-1 text-sm text-text-subtle">{formatLongDate(range.end)}</p>
                  </div>
                </div>
                <div className="flex max-w-[48%] shrink flex-col items-end gap-2 pt-0.5 text-left">
                  {updatedAt && (
                    <p className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                      <span>עודכן לאחרונה: {updatedAt}</span>
                    </p>
                  )}
                  {showDelta && (
                    <p className="flex items-start gap-1.5 text-sm font-semibold leading-snug text-primary">
                      <TrendingUp
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          delta < 0 && "rotate-180 text-destructive",
                        )}
                        aria-hidden
                      />
                      <span>
                        {comparisonCopy(period)} {delta >= 0 ? "+" : ""}
                        {fmt(delta, 0)}%
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                icon={<Truck className="size-4" />}
                value={String(jobs)}
                label={t.jobPlural}
              />
              <MetricCard
                icon={<Wallet className="size-4" />}
                value={`₪ ${fmt(income)}`}
                label={'סה"כ הכנסה'}
              />
              <MetricCard
                icon={<MapPin className="size-4" />}
                value={fmt(km, 1)}
                label={'קילומטרים'}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                icon={<Wallet className="size-4" />}
                value={`₪ ${fmt(tips)}`}
                label={'סה"כ טיפים'}
              />
              <MetricCard
                icon={<TrendingUp className="size-4" />}
                value={`₪ ${fmt(avg, 1)}`}
                label="למשלוח"
              />
            </div>

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-3 text-right text-sm font-extrabold text-text-strong">הכנסה לאורך התקופה</h2>
              <div dir="ltr" className="h-48">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      interval={chartData.length > 8 ? 4 : 0}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      tickFormatter={(v) => String(v)}
                    />
                    <ChartTooltip
                      cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
                      content={<ChartTooltipContent formatter={(value) => `₪${fmt(Number(value), 1)}`} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="var(--color-income)"
                      strokeWidth={2.5}
                      fill="url(#incomeFill)"
                      dot={{ r: 3, fill: "var(--color-income)", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-right text-sm font-extrabold text-text-strong">
                {t.jobPlural} אחרונים
              </h2>
              {isLoading ? (
                <p className="py-10 text-center text-sm text-text-muted">טוען…</p>
              ) : visibleJobs.length === 0 ? (
                <div className="rounded-card border border-border bg-surface py-12 text-center text-sm text-text-muted">
                  <Package className="mx-auto mb-2 size-8 opacity-50" aria-hidden />
                  אין {t.jobPlural} בטווח הזה
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-card border border-border bg-surface px-3 shadow-card">
                  {visibleJobs.map((o) => (
                    <DeliveryRow
                      key={String(o.id ?? o.jobs?.id ?? o.delivered_at)}
                      row={o}
                      jobWord={t.job}
                    />
                  ))}
                </ul>
              )}
            </section>

            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-primary bg-surface text-sm font-bold text-primary active:bg-primary-soft"
            >
              {showAll ? "הצג פחות" : `צפה בכל ה${t.jobPlural}`}
              <ChevronLeft className={cn("size-4", showAll && "rotate-90")} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function MetricCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-card border border-border bg-surface p-3 shadow-card">
      <div className="mb-2 flex justify-end">
        <span className="grid size-8 place-items-center rounded-pill bg-primary-soft text-primary">
          {icon}
        </span>
      </div>
      <p className="text-right text-lg font-black tabular-nums leading-none text-text-strong sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-right text-[11px] font-medium text-text-subtle">{label}</p>
    </div>
  );
}

function formatRowWhen(d: Date) {
  const date = d.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

function DeliveryRow({ row, jobWord }: { row: OutcomeRow; jobWord: string }) {
  const cancelled = !!row.was_cancelled;
  const at = row.delivered_at || row.cancelled_at;
  const when = at ? new Date(at) : null;
  const title = row.jobs?.customer_name || row.jobs?.job_type || row.jobs?.item_category || jobWord;
  const jobNo = row.jobs?.job_number ? `#${row.jobs.job_number}` : "";
  const amount = payOf(row);
  const km = kmOf(row);
  const time = when
    ? when.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <li className="flex items-center gap-2 py-3 sm:gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-pill bg-primary-soft text-primary">
        <CategoryIcon job={row.jobs} />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-sm font-bold text-text-strong">{title}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {when ? formatRowWhen(when) : jobWord}
        </p>
      </div>
      {jobNo && (
        <p className="w-16 shrink-0 truncate text-center text-[11px] text-text-subtle sm:w-20">
          {jobWord} {jobNo}
        </p>
      )}
      <div className="shrink-0 text-center">
        <span
          className={cn(
            "inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-bold",
            cancelled ? "bg-danger-bg text-danger-text" : "bg-primary text-primary-foreground",
          )}
        >
          {cancelled ? "בוטל" : "הושלם"}
        </span>
        <p className="mt-1 text-[11px] text-text-muted">{time}</p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-sm font-extrabold tabular-nums text-primary">₪ {fmt(amount, 1)}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">{fmt(km, 1)} ק״מ</p>
      </div>
    </li>
  );
}
