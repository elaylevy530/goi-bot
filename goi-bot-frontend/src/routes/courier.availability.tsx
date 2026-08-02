import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { Slider } from "@/components/ui/slider";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import {
  Loader2, Save, MapPin, Bike, Car, Zap, MoreHorizontal,
  Package, Clock, Route as RouteIcon, UtensilsCrossed,
  Plus, CheckCircle2, Target, CalendarDays, Briefcase, X, ChevronLeft,
  FileText, Sparkles, Check, Ruler, Gauge, Moon, PauseCircle, TrendingUp, Navigation,
} from "lucide-react";


import { toast } from "sonner";
import { useCourierTerms } from "@/lib/courier-kind";

export const Route = createFileRoute("/courier/availability")({
  head: () => ({ meta: [{ title: "זמינות והגדרות בוט — Goi" }] }),
  component: BotPreferencesPage,
});

const CITY_OPTIONS = [
  "כל הארץ","תל אביב","רמת גן","גבעתיים","פתח תקווה","בני ברק",
  "ראשון לציון","חולון","בת ים","הרצליה","רעננה","כפר סבא",
  "נתניה","רחובות","נס ציונה","ירושלים","חיפה","קריות",
  "אשדוד","אשקלון","באר שבע","אחר",
];
const VEHICLES = [
  { value: "קטנוע", icon: Bike },
  { value: "אופניים חשמליים", icon: Zap },
  { value: "רכב", icon: Car },
  { value: "קורקינט חשמלי", icon: Zap },
  { value: "אופניים רגילים", icon: Bike },
  { value: "אחר", icon: MoreHorizontal },
];
const JOB_OPTIONS = [
  { value: "משלוח בודד", icon: Package },
  { value: "משמרת לפי שעה", icon: Clock },
  { value: "קו חלוקה", icon: RouteIcon },
  { value: "משלוחי אוכל", icon: UtensilsCrossed },
  { value: "חבילות / מסמכים", icon: FileText },
];
const DISTANCE_OPTIONS = [
  "רק בתוך העיר שלי",
  "עד 5 ק״מ מחוץ לעיר",
  "עד 10 ק״מ מחוץ לעיר",
  "עד 20 ק״מ מחוץ לעיר",
  "עד 30 ק״מ מחוץ לעיר",
  "כל אזור המרכז",
  "כל הארץ",
];
const DAYS_FULL = [
  { key: "א'", label: "יום ראשון" },
  { key: "ב'", label: "יום שני" },
  { key: "ג'", label: "יום שלישי" },
  { key: "ד'", label: "יום רביעי" },
  { key: "ה'", label: "יום חמישי" },
  { key: "ו'", label: "יום שישי" },
  { key: "שבת", label: "שבת" },
];

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function distanceLabelFromKm(km: number): string {
  if (km >= 50) return "כל הארץ";
  if (km <= 0) return "רק בתוך העיר שלי";
  return `עד ${km} ק״מ מחוץ לעיר`;
}
function kmFromDistanceLabel(label: string | null | undefined): number {
  if (!label) return 8;
  if (label.includes("כל הארץ")) return 50;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 0;
  const m = label.match(/(\d+)/);
  return m ? Math.min(50, parseInt(m[1])) : 8;
}

function Card({ n, icon: Icon, title, sub, right, children }: {
  n?: number; icon: typeof MapPin; title: string; sub?: string;
  right?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <section
      dir="rtl"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-right">
          <div className="flex items-center gap-2 justify-end">
            {n !== undefined && (
              <span className="size-5 rounded-full bg-[#35AD29] text-white grid place-items-center text-[11px] font-bold">
                {n}
              </span>
            )}
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          </div>
          {sub && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{sub}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <span className="size-9 rounded-full bg-emerald-50 grid place-items-center">
            <Icon className="size-[18px] text-[#35AD29]" />
          </span>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

function CitiesGrid({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const allKnown = new Set(CITY_OPTIONS.map((c) => c.toLowerCase()));
  const customCities = value.filter((v) => !allKnown.has(v.toLowerCase()));
  const allOptions = [...CITY_OPTIONS.filter((c) => c !== "אחר"), ...customCities, "אחר"];
  const exists = trimmed.length > 0 && allOptions.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length >= 2 && !exists;
  const handleAdd = () => {
    if (!canAdd) return;
    onChange([...value.filter((x) => x !== "כל הארץ"), trimmed]);
    setQuery("");
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-end mb-3">
          {value.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 bg-emerald-50 text-[#35AD29] text-[13px] font-medium rounded-full px-3 py-1 border border-emerald-100"
            >
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== a))}
                className="opacity-70 hover:opacity-100"
                aria-label={`הסר ${a}`}
              >
                <X className="size-3.5" />
              </button>
              {a}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {allOptions.map((a) => {
          const on = value.includes(a);
          const isAll = a === "כל הארץ";
          return (
            <button
              key={a}
              type="button"
              onClick={() => {
                if (isAll) onChange(on ? [] : ["כל הארץ"]);
                else onChange(toggle(value.filter((x) => x !== "כל הארץ"), a));
              }}
              className={`text-right rounded-lg border px-2.5 py-2 text-[13px] font-medium flex items-center gap-2 transition ${
                on
                  ? "border-[#35AD29] bg-emerald-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#35AD29]/50"
              } ${isAll ? "font-semibold" : ""}`}
            >
              <span
                aria-hidden
                className={`size-4 rounded border grid place-items-center shrink-0 ${
                  on ? "bg-[#35AD29] border-[#35AD29] text-white" : "bg-white border-slate-300"
                }`}
              >
                {on && <Check className="size-3" />}
              </span>
              <span className="flex-1 truncate">{a}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <label className="text-[12px] text-slate-500 block mb-1">הוספת אזור / עיר ידנית</label>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="כתוב עיר או אזור"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            className="text-right h-10"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="shrink-0 h-10 bg-[#35AD29] hover:bg-[#2d9623] text-white gap-1"
          >
            <Plus className="size-4" /> הוסף
          </Button>
        </div>
      </div>
    </div>
  );
}

function BotPreferencesPage() {
  const t = useCourierTerms();
  const { data: me } = useMyCourier();
  const qc = useQueryClient();

  const [availableNow, setAvailableNow] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);

  const [days, setDays] = useState<string[]>([]);
  const [hoursFrom, setHoursFrom] = useState("08:00");
  const [hoursTo, setHoursTo] = useState("22:00");
  const [editHours, setEditHours] = useState(false);

  const [baseCity, setBaseCity] = useState("");
  const [wantedAreas, setWantedAreas] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(8);
  const [distancePreset, setDistancePreset] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);

  // Load & pace + smart engine
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const [pauseUntil, setPauseUntil] = useState<string | null>(null);
  const [autoPauseAfter, setAutoPauseAfter] = useState(0);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [quietEnabled, setQuietEnabled] = useState(false);
  const acceptanceRate = (me as any)?.acceptance_rate as number | null | undefined;
  const offersSent = (me as any)?.offers_sent_total as number | undefined;

  useEffect(() => {
    if (!me) return;
    const approved = me.courier_status === "פעיל" && me.is_paused !== true;
    setAvailableNow(approved && me.accepting_jobs !== false);
    setGpsEnabled((me as any).location_sharing_enabled === true);

    const avail = (me.availability as string[]) ?? [];
    setDays(avail.filter((a) => DAYS_FULL.some((d) => d.key === a)));
    const range = avail.find((a) => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(a));
    if (range) { const [f, t] = range.split("-"); setHoursFrom(f); setHoursTo(t); }
    setBaseCity(me.base_city ?? "");
    setWantedAreas(((me.working_areas as string[]) ?? []));
    const dLabel = (me as any).work_distance_from_base ?? "";
    setDistancePreset(dLabel);
    setRadiusKm(kmFromDistanceLabel(dLabel));
    setVehicleTypes(((me as any).vehicle_types as string[]) ?? (me.vehicle_type ? [me.vehicle_type] : []));
    setJobs((me.job_types as string[]) ?? []);
    setMaxConcurrent(Number((me as any).max_concurrent_jobs ?? 2));
    setPauseUntil((me as any).pause_until ?? null);
    setAutoPauseAfter(Number((me as any).auto_pause_after_declines ?? 0));
    const qs = (me as any).quiet_hours_start as string | null;
    const qe = (me as any).quiet_hours_end as string | null;
    setQuietStart(qs ?? "22:00");
    setQuietEnd(qe ?? "07:00");
    setQuietEnabled(!!(qs && qe));
  }, [me]);

  const allDaysOn = useMemo(() => DAYS_FULL.every((d) => days.includes(d.key)), [days]);

  const save = useMutation({
    mutationFn: async () => {
      if (!me) return;
      const legacyVehicleEnum = ["קטנוע","רכב","אופניים חשמליים","הליכה","קורקינט חשמלי","אופניים רגילים"];
      const firstVehicle = vehicleTypes.find((v) => legacyVehicleEnum.includes(v)) ?? null;
      const availability: string[] = [];
      const finalDistance = distancePreset || distanceLabelFromKm(radiusKm);
      await nestUpdateMyCourier({
        accepting_jobs: availableNow,
        location_sharing_enabled: gpsEnabled,
        availability,
        base_city: baseCity || null,
        working_areas: wantedAreas,
        work_distance_from_base: finalDistance,
        vehicle_type: firstVehicle,
        vehicle_types: vehicleTypes,
        job_types: jobs,
        max_concurrent_jobs: maxConcurrent,
        pause_until: pauseUntil,
        auto_pause_after_declines: autoPauseAfter,
        quiet_hours_start: quietEnabled ? quietStart : null,
        quiet_hours_end: quietEnabled ? quietEnd : null,
      } as Record<string, unknown>);
    },

    onSuccess: () => {
      toast.success("ההגדרות נשמרו ✓ הבוט יתאים את ההצעות שלך");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell title={t.kind === "mover" ? "זמינות והגדרות בוט הובלות" : "זמינות והגדרות בוט"} subtitle={`הגדר את ההעדפות שלך — הבוט ישלח רק ${t.jobPlural} שמתאימות לך`}>
      <div className="max-w-2xl mx-auto space-y-3 pb-6" dir="rtl">

        {/* Intro */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-right">
          <div className="flex items-center gap-2 font-bold text-emerald-900 text-[14px]">
            <Sparkles className="size-4" /> כל מה שתסמן כאן — הבוט יקלוט
          </div>
          <p className="text-[12px] text-emerald-800 mt-1 leading-snug">
            {`לפי ההעדפות שתשמור — הבוט בוחר אילו ${t.jobPlural} לשלוח אליך בוואטסאפ. אפשר לעדכן בכל רגע.`}
          </p>
        </section>

        {/* 1. Accept jobs */}
        <Card
          n={1}
          icon={CheckCircle2}
          title="קבלת עבודות באופן קבוע"
          sub="כאשר האפשרות פעילה, תקבל עבודות באופן קבוע (ניתן לכבות גם מהפאנל)"
          right={<Switch checked={availableNow} onCheckedChange={setAvailableNow} />}
        />

        {/* 1b. GPS sharing */}
        <Card
          icon={Navigation}
          title="שיתוף מיקום (GPS)"
          sub="כשמופעל — הבוט ישלח לך גם הצעות לפי מיקומך בזמן אמת, לא רק לפי האזורים שהגדרת"
          right={<Switch checked={gpsEnabled} onCheckedChange={setGpsEnabled} />}
        />


        {/* 2. Base city */}
        <Card
          n={2}
          icon={MapPin}
          title="עיר בסיס"
          sub="המיקום שממנו אתה יוצא לעבודה בדרך כלל"
        >
          <Input
            value={baseCity}
            onChange={(e) => setBaseCity(e.target.value)}
            placeholder="לדוגמה: תל אביב"
            className="text-right h-10"
          />
        </Card>

        {/* 3. Work areas */}
        <Card
          n={3}
          icon={MapPin}
          title="אזורי עבודה"
          sub="בחר/י את האזורים בהם תרצה לקבל עבודות — אפשר 'כל הארץ'"
        >
          <CitiesGrid value={wantedAreas} onChange={setWantedAreas} />
        </Card>

        {/* 4. Radius */}
        <Card
          n={4}
          icon={Target}
          title="רדיוס עבודה"
          sub={`המרחק המרבי ממיקומך הנוכחי (GPS) לנקודת האיסוף של ${t.theJob}`}
          right={<span className="text-sm font-bold text-slate-900 tabular-nums">{distancePreset || (radiusKm >= 50 ? "כל הארץ" : `${radiusKm} ק״מ`)}</span>}
        >
          <Slider
            value={[radiusKm]}
            onValueChange={(v) => { setRadiusKm(v[0]); setDistancePreset(""); }}
            min={0}
            max={50}
            step={1}
            className="mt-1"
          />
          <div className="flex flex-wrap gap-1.5 justify-end mt-3">
            {DISTANCE_OPTIONS.map((d) => {
              const on = distancePreset === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDistancePreset(on ? "" : d);
                    if (!on) setRadiusKm(kmFromDistanceLabel(d));
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                    on
                      ? "border-[#35AD29] bg-emerald-50 text-[#35AD29]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#35AD29]/50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Card>



        {/* 7. Vehicles */}
        <Card
          n={7}
          icon={Bike}
          title="עם מה אני עובד"
          sub="אפשר לסמן יותר מכלי אחד"
        >
          <div className="grid grid-cols-3 gap-2">
            {VEHICLES.map((v) => {
              const on = vehicleTypes.includes(v.value);
              const Icon = v.icon;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVehicleTypes(toggle(vehicleTypes, v.value))}
                  className={`rounded-xl border-2 p-2.5 flex flex-col items-center gap-1.5 transition-all relative ${
                    on ? "border-[#35AD29] bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  {on && (
                    <span className="absolute top-1 right-1 size-4 rounded-full bg-[#35AD29] grid place-items-center">
                      <Check className="size-2.5 text-white" />
                    </span>
                  )}
                  <Icon className={`size-5 ${on ? "text-[#35AD29]" : "text-slate-400"}`} />
                  <span className="text-[12px] font-medium text-center text-slate-700">{v.value}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 8. Job types */}
        <Card
          n={8}
          icon={Briefcase}
          title="סוגי עבודות מועדפים"
          sub="בחר/י את סוגי העבודות שתרצה לקבל"
        >
          <div className="divide-y divide-slate-100">
            {JOB_OPTIONS.map((j) => {
              const on = jobs.includes(j.value);
              const Icon = j.icon;
              return (
                <div key={j.value} className="flex items-center justify-between py-2.5">
                  <Switch checked={on} onCheckedChange={() => setJobs(toggle(jobs, j.value))} />
                  <div className="flex items-center gap-2 text-slate-900 font-medium text-[14px]">
                    {j.value}
                    <Icon className="size-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setJobs(JOB_OPTIONS.map((j) => j.value))}
            className="w-full mt-2 flex items-center justify-center gap-1 text-[#35AD29] font-semibold text-sm py-1.5 hover:bg-emerald-50/60 rounded-lg transition"
          >
            <Check className="size-4" /> הכול מתאים לי
          </button>
        </Card>

        {/* 9. Load & pace */}
        <Card
          n={9}
          icon={Gauge}
          title="עומס וקצב"
          sub={`כמה ${t.jobPlural} אתה מוכן להחזיק במקביל`}
          right={<span className="text-sm font-bold text-slate-900">{maxConcurrent}</span>}
        >
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxConcurrent(n)}
                className={`rounded-xl border-2 p-2.5 text-center transition ${
                  maxConcurrent === n
                    ? "border-[#35AD29] bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-xl font-bold text-slate-900">{n}</div>
                <div className="text-[11px] text-slate-500">
                  {n === 1 ? "אחד בלבד" : n === 2 ? "מומלץ" : `ריבוי ${t.jobPlural}`}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* 10. Temporary pause */}
        <Card
          n={10}
          icon={PauseCircle}
          title="הפסקה זמנית"
          sub="כיבוי לזמן מוגבל בלי לגעת בשאר ההגדרות"
          right={
            pauseUntil && new Date(pauseUntil) > new Date() ? (
              <span className="text-[12px] font-bold text-orange-600">פעיל</span>
            ) : null
          }
        >
          {pauseUntil && new Date(pauseUntil) > new Date() ? (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPauseUntil(null)}
                className="text-[#35AD29] font-semibold text-sm"
              >
                בטל הפסקה
              </button>
              <div className="text-right text-[13px] text-orange-900">
                בהפסקה עד {new Date(pauseUntil).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPauseUntil(new Date(Date.now() + m * 60 * 1000).toISOString())}
                  className="rounded-xl border-2 border-slate-200 hover:border-[#35AD29]/60 bg-white p-2.5 text-center"
                >
                  <div className="text-sm font-bold text-slate-900">{m < 60 ? `${m} דק׳` : `${m / 60} ש׳`}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* 11. Auto-pause on consecutive declines */}
        <Card
          n={11}
          icon={TrendingUp}
          title="השהיה אוטומטית אחרי דחיות"
          sub="אם דחית/החמצת רצף של הצעות — הבוט ייתן לך 30 דק׳ הפסקה ולא יציק"
          right={<span className="text-sm font-bold text-slate-900">{autoPauseAfter === 0 ? "כבוי" : autoPauseAfter}</span>}
        >
          <div className="grid grid-cols-5 gap-2">
            {[0, 3, 5, 7, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAutoPauseAfter(n)}
                className={`rounded-xl border-2 p-2 text-center transition ${
                  autoPauseAfter === n ? "border-[#35AD29] bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-sm font-bold text-slate-900">{n === 0 ? "כבוי" : n}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* 12. Quiet hours */}
        <Card
          n={12}
          icon={Moon}
          title="שעות שקטות"
          sub="הבוט לא ישלח לך הודעות בטווח הזה, גם אם זמין"
          right={<Switch checked={quietEnabled} onCheckedChange={setQuietEnabled} />}
        >
          {quietEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-slate-500 block mb-1">מתחיל</label>
                <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="text-right" />
              </div>
              <div>
                <label className="text-[12px] text-slate-500 block mb-1">מסתיים</label>
                <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="text-right" />
              </div>
            </div>
          )}
        </Card>

        {/* 13. Performance card (read-only) */}
        {typeof acceptanceRate === "number" && (offersSent ?? 0) > 0 && (
          <Card
            icon={TrendingUp}
            title="הביצועים שלך בבוט"
            sub="ככל שאחוז הקבלה גבוה יותר — תקבל עדיפות בהצעות"
            right={<span className="text-sm font-bold text-[#35AD29]">{Math.round((acceptanceRate ?? 0) * 100)}%</span>}
          >
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#35AD29] transition-all"
                style={{ width: `${Math.min(100, Math.round((acceptanceRate ?? 0) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">מבוסס על {offersSent} הצעות שנשלחו אליך</p>
          </Card>
        )}

        {/* Save */}
        <div className="sticky bottom-2 pt-2">

          <Button
            size="lg"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="w-full h-12 text-base font-bold rounded-xl bg-[#35AD29] hover:bg-[#2d9623] text-white shadow-lg gap-2"
          >
            {save.isPending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            שמירה
          </Button>
        </div>
      </div>
    </CourierShell>
  );
}
