import {
  Box,
  ChevronsRight,
  Clock,
  CreditCard,
  Home,
  MapPin,
  ShoppingBag,
} from "lucide-react";
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
  onDecline?: (job: MapJob) => void;
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

function clockFromNow(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
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

export function CourierOfferCard({
  job,
  distToPickupKm,
  route,
  claiming,
  terms: t,
  onClaim,
  onQuote,
  onDetails,
}: Props) {
  const businessName = job.customer_name?.trim() || "לקוח פרטי";
  const isQuote = job.__kind === "quote";
  const payLabel = job.requires_cash ? "מזומן" : "אשראי";
  const jobNumber = job.job_number ? `#${String(job.job_number).replace(/^#/, "")}` : null;
  const snap = snapshotOf(job);
  const deadlineRaw =
    job.delivery_deadline
    ?? (typeof snap.delivery_deadline === "string" ? snap.delivery_deadline : null);
  const deadlineClock = formatClock(deadlineRaw);
  const scheduledClock = formatClock(job.job_time);
  const packages = Number(job.number_of_packages ?? 0) || 1;
  const tripKm = route?.distanceKm ?? null;
  const tripMin = route?.durationMin ?? null;
  const pickupEta =
    scheduledClock
    ?? (distToPickupKm != null
      ? clockFromNow(Math.max(8, Math.round(distToPickupKm * 4)))
      : clockFromNow(12));
  const dropoffEta =
    deadlineClock
    ?? (tripMin != null ? clockFromNow(tripMin + 8) : clockFromNow(35));
  const pickup = addressLine(job.pickup_address, job.pickup_area);
  const dropoff = addressLine(job.dropoff_address, job.dropoff_area);

  return (
    <div data-job-id={job.id} dir="rtl" className="snap-center w-full shrink-0">
      <article className="overflow-hidden rounded-[1.5rem] bg-surface shadow-card-strong">
        <header className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BusinessLogo path={job.customer_logo_path} name={businessName} size={48} />
            <div className="min-w-0 text-right">
              <h3 className="truncate text-sm font-extrabold text-text-strong">{businessName}</h3>
              {jobNumber && <p className="mt-0.5 text-xs font-semibold text-text-muted">{jobNumber}</p>}
              {distToPickupKm != null && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-muted px-2 py-0.5 text-[11px] font-bold text-text-subtle">
                  <MapPin className="size-3 text-primary" aria-hidden />
                  {formatKm(distToPickupKm)} ממך
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-left">
            {isQuote ? (
              <p className="text-[1.75rem] font-black leading-none text-warning tabular-nums">₪?</p>
            ) : (
              <p className="text-[1.75rem] font-black leading-none text-text-strong tabular-nums">
                ₪ {Number(job.payment ?? 0).toFixed(0)}
              </p>
            )}
            <p className="mt-1 text-xs font-semibold text-text-muted">תשלום לשליח</p>
          </div>
        </header>

        <div className="space-y-4 px-4 pb-4 pt-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1" aria-hidden>
              <span className="grid size-8 place-items-center rounded-full bg-success-bg text-primary">
                <ShoppingBag className="size-4" />
              </span>
              <span className="my-1 w-px flex-1 min-h-6 border-e border-dashed border-primary/50" />
              <span className="grid size-8 place-items-center rounded-full bg-success-bg text-primary">
                <Home className="size-4" />
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <StopRow
                label="איסוף"
                address={pickup}
                chip={`להגיע לעסק עד ${pickupEta}`}
              />
              <StopRow
                label="מסירה"
                address={dropoff}
                chip={`למסור עד ${dropoffEta}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 border-y border-border py-3 text-center">
            <Stat icon={MapPin} value={tripKm != null ? formatKm(tripKm) : "—"} />
            <Stat icon={Clock} value={tripMin != null ? `${tripMin} דק׳` : "—"} />
            <Stat icon={CreditCard} value={payLabel} />
            <Stat icon={Box} value={`פריט ${packages}`} />
          </div>

          {isQuote ? (
            <button
              type="button"
              onClick={() => onQuote(job)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-card bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-fab active:scale-[0.99]"
            >
              הגש הצעת מחיר
            </button>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={() => onClaim(job)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-card bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-fab disabled:opacity-60 active:scale-[0.99]"
            >
              לקחתי את {t.theJob}
              <span className="grid size-9 place-items-center rounded-full bg-surface">
                <ChevronsRight className="size-5 text-primary" aria-hidden />
              </span>
            </button>
          )}

          {onDetails && (
            <button
              type="button"
              onClick={() => onDetails(job)}
              className="w-full text-center text-xs font-bold text-text-muted"
            >
              פרטים נוספים
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function StopRow({ label, address, chip }: { label: string; address: string; chip: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 text-right">
        <p className="text-[11px] font-semibold text-text-muted">{label}</p>
        <p className="text-sm font-bold leading-snug text-text-strong line-clamp-2">{address}</p>
      </div>
      <span className="shrink-0 rounded-pill bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success-text">
        {chip}
      </span>
    </div>
  );
}

function Stat({ icon: Icon, value }: { icon: typeof Clock; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="size-4 text-text-muted" aria-hidden />
      <span className="text-[11px] font-bold text-text-strong">{value}</span>
    </div>
  );
}
