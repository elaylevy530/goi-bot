import { useEffect, useState } from "react";
import { useGpsLiveStatus } from "@/hooks/useCourierGpsTracker";
import { Navigation, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

function fmtAge(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `לפני ${s} שנ׳`;
  const m = Math.round(s / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  return `לפני ${h} שע׳`;
}

/**
 * Compact live GPS status strip. Shows whether tracking is active,
 * last fix time, last DB save time, coords, accuracy, and errors.
 * Re-renders every 10s to keep "age" labels fresh.
 */
export function GpsLiveIndicator({ className = "" }: { className?: string }) {
  const s = useGpsLiveStatus();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  if (!s.enabled) {
    return (
      <div dir="rtl" className={`text-[11px] text-slate-400 ${className}`}>
        GPS כבוי — לא נשלחים פינגים
      </div>
    );
  }

  const denied = s.permission === "denied";
  const unsupported = s.permission === "unsupported";
  const waiting = !denied && !unsupported && s.lat == null;
  const ok = !denied && !unsupported && s.lat != null;

  const Icon = denied || unsupported ? AlertTriangle : ok ? CheckCircle2 : Loader2;
  const iconClass = denied || unsupported
    ? "text-rose-600"
    : ok
      ? "text-emerald-600"
      : "text-amber-600 animate-spin";

  const headline = denied
    ? "הרשאת מיקום נדחתה"
    : unsupported
      ? "דפדפן לא תומך ב-GPS"
      : ok
        ? "GPS פעיל ומשדר"
        : "ממתין למיקום הראשון…";

  return (
    <div
      dir="rtl"
      className={`rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-[11px] ${className}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-3.5 shrink-0 ${iconClass}`} />
        <span className="font-semibold text-slate-700">{headline}</span>
        {s.accuracy != null && ok && (
          <span className="text-slate-400">· דיוק ±{Math.round(s.accuracy)}מ׳</span>
        )}
      </div>
      {ok && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-500">
          <span className="flex items-center gap-1">
            <Navigation className="size-3" />
            {s.lat!.toFixed(5)}, {s.lng!.toFixed(5)}
          </span>
          <span>פינג: {fmtAge(s.lastFixAt)}</span>
          <span>שמירה אחרונה: {fmtAge(s.lastSavedAt)}</span>
        </div>
      )}
      {(denied || unsupported) && (
        <div className="mt-1 text-slate-500">
          {denied
            ? "פתח הגדרות → אתר/אפליקציה → מיקום → אפשר"
            : "פתח את האפליקציה בדפדפן שתומך במיקום"}
        </div>
      )}
      {s.error && !denied && !unsupported && (
        <div className="mt-1 text-rose-600">⚠ {s.error}</div>
      )}
    </div>
  );
}
