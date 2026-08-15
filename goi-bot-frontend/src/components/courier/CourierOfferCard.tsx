import { useEffect, useRef, useState } from "react";
import {
  Box,
  Car,
  ChevronsLeft,
  Clock,
  CreditCard,
  Info,
  MapPin,
  Route,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessLogo } from "@/components/BusinessLogo";
import type { MapJob } from "@/components/CourierJobsMap";
import type { CourierTerms } from "@/lib/courier-kind";
import type { DrivingRoute } from "@/lib/google-driving-route";

type Props = {
  job: MapJob;
  distToPickupKm: number | null;
  route: DrivingRoute | null;
  claiming?: boolean;
  terms: CourierTerms;
  onClaim: (job: MapJob) => void;
  onDecline: (job: MapJob) => void;
  onQuote: (job: MapJob) => void;
  onDetails?: (job: MapJob) => void;
};

function addressLine(address?: string | null, area?: string | null) {
  const raw = String(address ?? "").trim();
  if (raw) return raw;
  return String(area ?? "").trim() || "—";
}

function formatKm(km: number) {
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ק״מ`;
}

function formatClock(value?: string | null) {
  if (!value) return null;
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime()) && /[T-]/.test(value)) {
    return asDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  const sliced = String(value).slice(0, 5);
  return /^\d{1,2}:\d{2}$/.test(sliced) ? sliced : null;
}

function snapshotOf(job: MapJob): Record<string, unknown> {
  const raw = job.__raw ?? {};
  return (
    (job as { pricing_snapshot?: Record<string, unknown> }).pricing_snapshot
    ?? raw.pricing_snapshot
    ?? raw.job?.pricing_snapshot
    ?? {}
  );
}

function AcceptTimerChip({ expiresAt }: { expiresAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const mountAtRef = useRef<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const deadline = expiresAt
    ? new Date(expiresAt).getTime()
    : mountAtRef.current + 10 * 60 * 1000;
  const secLeft = Math.max(0, Math.floor((deadline - now) / 1000));
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");
  const expired = secLeft === 0;
  return (
    <Chip
      icon={Timer}
      label={`${mm}:${ss}`}
      tone={expired ? "muted" : "urgent"}
      pulse={!expired && secLeft <= 60}
    />
  );
}

function Chip({
  icon: Icon,
  label,
  tone = "muted",
  pulse = false,
}: {
  icon: typeof Clock;
  label: string;
  tone?: "muted" | "urgent" | "info";
  pulse?: boolean;
}) {
  const toneClass =
    tone === "urgent"
      ? "border-destructive/40 bg-danger-bg text-danger-text"
      : tone === "info"
        ? "border-info-text/20 bg-info-bg text-info-text"
        : "border-border-strong bg-surface text-text-subtle";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-xs font-semibold tabular-nums ${toneClass} ${
        pulse ? "animate-pulse" : ""
      }`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function CourierOfferCard({
  job,
  distToPickupKm,
  route,
  claiming,
  terms: t,
  onClaim,
  onDecline,
  onQuote,
  onDetails,
}: Props) {
  const businessName = job.customer_name?.trim() || "לקוח פרטי";
  const isQuote = job.__kind === "quote";
  const isMove =
    job.service_category === "small_move"
    || job.service_category === "big_move"
    || t.kind === "mover";
  const kindLabel = isMove ? "הובלה" : (job.job_type?.trim() || "משלוח");
  const payLabel = job.requires_cash ? "מזומן" : "אשראי";
  const jobNumber = job.job_number ? `#${String(job.job_number).replace(/^#/, "")}` : null;
  const snap = snapshotOf(job);
  const deadlineRaw =
    job.delivery_deadline
    ?? (typeof snap.delivery_deadline === "string" ? snap.delivery_deadline : null);
  const deadlineClock = formatClock(deadlineRaw);
  const scheduledClock = formatClock(job.job_time);
  const isImmediate = !scheduledClock;
  const packages = Number(job.number_of_packages ?? 0) || 1;
  const vehicle = job.vehicle_required?.trim() || (isMove ? "רכב" : null);
  const distanceKm =
    route?.distanceKm
    ?? (distToPickupKm != null && Number.isFinite(distToPickupKm) ? distToPickupKm : null);
  const seenCount = Number(
    job.matching_couriers_count
    ?? job.__raw?.matching_couriers_count
    ?? job.__raw?.job?.matching_couriers_count
    ?? 0,
  );
  const offerExpiresAt =
    (job.__raw?.offer?.expires_at as string | undefined)
    ?? (job.__raw?.expires_at as string | undefined)
    ?? (job.__raw?.job?.quote_deadline_at as string | undefined)
    ?? (job.__raw?.quote_deadline_at as string | undefined)
    ?? null;
  const pickup = addressLine(job.pickup_address, job.pickup_area);
  const dropoff = addressLine(job.dropoff_address, job.dropoff_area);

  return (
    <div
      data-job-id={job.id}
      dir="rtl"
      className="snap-center shrink-0 w-full relative pt-3"
    >
      {seenCount > 0 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1 rounded-pill bg-navy text-primary-foreground shadow-card px-3 py-1 text-xs font-bold whitespace-nowrap">
            <Zap className="size-3.5 text-warning fill-warning" aria-hidden />
            {seenCount === 1
              ? `1 ${t.worker} ראה את ההצעה`
              : `${seenCount} ${t.workerPlural} ראו את ההצעה`}
          </span>
        </div>
      )}

      <article className="rounded-card bg-surface shadow-card-strong overflow-hidden">
        <header className="bg-primary-deep text-primary-foreground px-3.5 pt-5 pb-3.5 flex items-center gap-3">
          <BusinessLogo
            path={job.customer_logo_path}
            name={businessName}
            size={44}
            className="ring-white/40"
          />
          <div className="min-w-0 flex-1 text-right">
            <h3 className="font-extrabold text-sm leading-tight truncate">{businessName}</h3>
            <p className="text-xs text-primary-foreground/80 mt-0.5 truncate">
              {[jobNumber, `${kindLabel} • ${payLabel}`].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="shrink-0 rounded-card bg-surface text-center px-3 py-2 min-w-16 shadow-card">
            {isQuote ? (
              <p className="text-xl font-extrabold text-warning tabular-nums leading-none">₪?</p>
            ) : (
              <p className="text-xl font-extrabold text-primary tabular-nums leading-none">
                ₪{Number(job.payment ?? 0).toFixed(0)}
              </p>
            )}
            <p className="text-[10px] font-semibold text-text-muted mt-1">תשלום</p>
          </div>
        </header>

        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5 justify-end">
            {!isQuote && <AcceptTimerChip expiresAt={offerExpiresAt} />}
            {distanceKm != null && <Chip icon={Route} label={formatKm(distanceKm)} />}
            <Chip icon={Clock} label={isImmediate ? "מיידי" : scheduledClock!} />}
            {deadlineClock && (
              <Chip icon={Clock} label={`מסירה עד ${deadlineClock}`} tone="urgent" />
            )}
            <Chip icon={Box} label={String(packages)} />
            {vehicle && <Chip icon={Car} label={vehicle} tone="info" />}
            <Chip icon={CreditCard} label={payLabel} tone="info" />
          </div>

          <div className="rounded-card bg-muted px-3 py-2.5">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-0.5" aria-hidden>
                <MapPin className="size-4 text-text-muted" />
                <span className="w-px flex-1 min-h-4 border-r border-dashed border-border-strong my-1" />
                <span className="size-4 rounded-full bg-primary text-primary-foreground grid place-items-center text-[9px] font-extrabold leading-none">
                  A
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-2.5 text-right">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted">איסוף</p>
                  <p className="text-sm font-bold text-text-strong leading-snug line-clamp-2">{pickup}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted">מסירה</p>
                  <p className="text-sm font-bold text-text-strong leading-snug line-clamp-2">{dropoff}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isQuote ? (
              <Button
                type="button"
                className="flex-1 min-h-12 rounded-card font-extrabold text-sm px-3"
                onClick={() => onQuote(job)}
              >
                הגש הצעת מחיר
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 min-h-12 rounded-card font-extrabold bg-gradient-to-l from-primary to-primary/85 shadow-fab text-sm px-3"
                disabled={claiming}
                onClick={() => onClaim(job)}
              >
                <ChevronsLeft className="size-4" aria-hidden />
                {`קח ${t.job} עכשיו והרווח כסף`}
              </Button>
            )}
            {onDetails && (
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-card px-3 shrink-0"
                onClick={() => onDetails(job)}
              >
                <Info className="size-4" aria-hidden />
                פרטים
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-12 rounded-card px-3 shrink-0 border-destructive/40 text-danger-text hover:bg-danger-bg"
              onClick={() => onDecline(job)}
              aria-label="דלג"
            >
              דלג
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
