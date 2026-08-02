import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign, Package, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { nestGetJobOutcome, nestListJobs, type NestJob } from "@/lib/nest-jobs";

type PresetKey = "today" | "yesterday" | "week" | "month" | "custom";

type ReportOutcome = {
  id?: string;
  delivered_at: string;
  was_cancelled?: boolean | null;
  was_late?: boolean | null;
  customer_rating?: number | null;
  tip_amount?: number | null;
  jobs?: NestJob | null;
};

function rangeFor(preset: PresetKey, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  switch (preset) {
    case "today": {
      return { start: startOfDay(now), end: endOfDay(now), label: "היום" };
    }
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y), label: "אתמול" };
    }
    case "week": {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      return { start: startOfDay(s), end: endOfDay(now), label: "7 ימים אחרונים" };
    }
    case "month": {
      const s = new Date(now); s.setDate(s.getDate() - 29);
      return { start: startOfDay(s), end: endOfDay(now), label: "30 ימים אחרונים" };
    }
    case "custom": {
      const s = customStart ? new Date(customStart) : startOfDay(now);
      const e = customEnd ? new Date(customEnd) : endOfDay(now);
      return { start: startOfDay(s), end: endOfDay(e), label: "טווח מותאם" };
    }
  }
}

export function CourierReports() {
  const { data: me } = useMyCourier();
  const [preset, setPreset] = useState<PresetKey>("today");
  const [cStart, setCStart] = useState<string>("");
  const [cEnd, setCEnd] = useState<string>("");

  const range = useMemo(() => rangeFor(preset, cStart, cEnd), [preset, cStart, cEnd]);

  const { data: outcomes = [], isLoading } = useQuery({
    queryKey: ["reports", me?.id, range.start.toISOString(), range.end.toISOString()],
    enabled: !!me?.id,
    queryFn: async () => {
      const jobs = await nestListJobs({ limit: 200 });
      const mine = jobs.filter((j) => j.selected_courier_id === me!.id);
      const rows = await Promise.all(
        mine.map(async (job) => {
          const outcome = await nestGetJobOutcome(job.id).catch(() => null);
          if (!outcome?.delivered_at) return null;
          const delivered = new Date(outcome.delivered_at);
          if (delivered < range.start || delivered > range.end) return null;
          return { ...outcome, jobs: job } as ReportOutcome;
        }),
      );
      return rows
        .filter(Boolean)
        .sort((a, b) => new Date(b!.delivered_at).getTime() - new Date(a!.delivered_at).getTime()) as ReportOutcome[];
    },
  });

  const done = outcomes.filter((o) => !o.was_cancelled);
  const totalEarned = done.reduce((s, o) => s + Number(o.jobs?.payment ?? 0), 0);
  const totalTips = outcomes.reduce((s, o) => s + Number(o.tip_amount ?? 0), 0);
  const rated = outcomes.filter((o) => o.customer_rating != null);
  const avgRating = rated.length ? (rated.reduce((s, o) => s + Number(o.customer_rating), 0) / rated.length) : null;
  const lateCount = outcomes.filter((o) => o.was_late).length;

  return (
    <div className="space-y-4">
      {/* Preset chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {(["today", "yesterday", "week", "month", "custom"] as PresetKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setPreset(k)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-all",
              preset === k
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
            )}
          >
            {k === "today" && "היום"}
            {k === "yesterday" && "אתמול"}
            {k === "week" && "שבוע"}
            {k === "month" && "חודש"}
            {k === "custom" && "מותאם"}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <Card className="rounded-2xl">
          <CardContent className="p-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-bold mb-1 block text-end">מתאריך</label>
              <Input type="date" value={cStart} onChange={(e) => setCStart(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold mb-1 block text-end">עד תאריך</label>
              <Input type="date" value={cEnd} onChange={(e) => setCEnd(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Range label */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <CalendarDays className="size-3.5" /> {range.label}
        </span>
        <span className="text-[11px] text-slate-400">
          {range.start.toLocaleDateString("he-IL")} — {range.end.toLocaleDateString("he-IL")}
        </span>
      </div>

      {/* Big earnings card */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 text-white">
        <CardContent className="p-5 text-end">
          <div className="text-xs opacity-80 font-bold flex items-center gap-1 justify-end mb-1">
            <TrendingUp className="size-3.5" /> סה״כ הכנסות
          </div>
          <div className="text-4xl font-black leading-none">{totalEarned.toFixed(0)} ₪</div>
          {totalTips > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
              + {totalTips.toFixed(0)} ₪ טיפים
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatBlock icon={<Package className="size-4 text-blue-600" />} label="משלוחים" value={done.length} />
        <StatBlock icon={<Star className="size-4 fill-amber-400 text-amber-400" />} label="דירוג" value={avgRating ? avgRating.toFixed(1) : "—"} />
        <StatBlock icon={<DollarSign className="size-4 text-emerald-600" />} label="ממוצע" value={done.length ? `${(totalEarned / done.length).toFixed(0)} ₪` : "—"} />
      </div>

      {lateCount > 0 && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-[11px] font-semibold text-orange-800 text-end">
          {lateCount} משלוחים באיחור בטווח הזה
        </div>
      )}

      {/* Deliveries list */}
      <div className="space-y-2">
        {isLoading && <div className="text-center text-sm text-slate-400 py-8">טוען...</div>}
        {!isLoading && outcomes.length === 0 && (
          <Card className="rounded-2xl"><CardContent className="py-10 text-center text-sm text-slate-500">
            אין משלוחים בטווח הזה
          </CardContent></Card>
        )}
        {outcomes.map((o) => (
          <Card key={o.id ?? o.jobs?.id ?? o.delivered_at} className="rounded-xl border-slate-200 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-end shrink-0">
                  <div className="text-base font-extrabold text-[#35AD29] leading-none">{Number(o.jobs?.payment ?? 0).toFixed(0)} ₪</div>
                  {(o.tip_amount ?? 0) > 0 && <div className="text-[10px] text-amber-600 font-semibold mt-0.5">+{Number(o.tip_amount).toFixed(0)} טיפ</div>}
                </div>
                <div className="flex-1 text-end min-w-0">
                  <div className="flex items-center justify-end gap-1.5 mb-0.5">
                    {o.was_late && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">איחור</Badge>}
                    {o.customer_rating != null && (
                      <span className="flex items-center gap-0.5 text-amber-600 text-[11px] font-bold">
                        <Star className="size-3 fill-amber-400 text-amber-400" />{o.customer_rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700 min-w-0">
                    <span className="truncate">{o.jobs?.pickup_area ?? "—"}</span>
                    <span className="text-slate-300 shrink-0">←</span>
                    <span className="truncate font-semibold">{o.jobs?.dropoff_area ?? "—"}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(o.delivered_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {o.jobs?.customer_name && <> · {o.jobs.customer_name}</>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-none">
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold mb-1">
          {icon}{label}
        </div>
        <div className="text-lg font-black text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}

export default CourierReports;
