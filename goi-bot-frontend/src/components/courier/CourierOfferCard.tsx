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
  const displayOrderNumber = String(job.order_number ?? "").trim();
  const jobNumber = displayOrderNumber
    ? `#${displayOrderNumber.replace(/^#/, "")}`
    : null;
  const packages = Number(job.number_of_packages ?? 0) || 1;
  const tripKm = route?.distanceKm ?? null;
  const tripMin = route?.durationMin ?? null;
  const pickup = addressLine(job.pickup_address, job.pickup_area);
  const dropoff = addressLine(job.dropoff_address, job.dropoff_area);

  return (
    <div data-job-id={job.id} dir="rtl" className="snap-center w-full shrink-0">
      <article className="overflow-hidden rounded-card bg-surface shadow-card-strong">
        <header className="flex items-center justify-between gap-2 px-3 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <BusinessLogo path={job.customer_logo_path} name={businessName} size={36} />
            <div className="min-w-0 text-right">
              <h3 className="truncate text-sm font-extrabold text-text-strong">{businessName}</h3>
              <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
                {jobNumber && <p className="truncate text-[11px] font-semibold text-text-muted">{jobNumber}</p>}
                {distToPickupKm != null && (
                  <span className="inline-flex items-center gap-0.5 rounded-pill bg-muted px-1.5 py-px text-[10px] font-bold text-text-subtle">
                    <MapPin className="size-2.5 text-primary" aria-hidden />
                    {formatKm(distToPickupKm)} ממך
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-left">
            {isQuote ? (
              <p className="text-xl font-black leading-none text-warning tabular-nums">₪?</p>
            ) : (
              <p className="text-xl font-black leading-none text-text-strong tabular-nums">
                ₪ {Number(job.payment ?? 0).toFixed(0)}
              </p>
            )}
            <p className="mt-0.5 text-[10px] font-semibold text-text-muted">תשלום לשליח</p>
          </div>
        </header>

        <div className="space-y-2.5 px-3 pb-3 pt-2">
          <div className="flex gap-2">
            <div className="flex flex-col items-center pt-0.5" aria-hidden>
              <span className="grid size-6 place-items-center rounded-full bg-success-bg text-primary">
                <ShoppingBag className="size-3.5" />
              </span>
              <span className="my-0.5 w-px flex-1 min-h-3 border-e border-dashed border-primary/50" />
              <span className="grid size-6 place-items-center rounded-full bg-success-bg text-primary">
                <Home className="size-3.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="min-w-0 truncate text-xs font-bold text-text-strong">{pickup}</p>
              <p className="min-w-0 truncate text-xs font-bold text-text-strong">{dropoff}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 border-y border-border py-1.5 text-center">
            <Stat icon={MapPin} value={tripKm != null ? formatKm(tripKm) : "—"} />
            <Stat icon={Clock} value={tripMin != null ? `${tripMin} דק׳` : "—"} />
            <Stat icon={CreditCard} value={payLabel} />
            <Stat icon={Box} value={`פריט ${packages}`} />
          </div>

          {isQuote ? (
            <button
              type="button"
              onClick={() => onQuote(job)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-card bg-primary px-3 text-sm font-extrabold text-primary-foreground shadow-fab active:scale-[0.99]"
            >
              הגש הצעת מחיר
            </button>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={() => onClaim(job)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-card bg-primary px-3 text-sm font-extrabold text-primary-foreground shadow-fab disabled:opacity-60 active:scale-[0.99]"
            >
              לקחתי את {t.theJob}
              <span className="grid size-7 place-items-center rounded-full bg-surface">
                <ChevronsRight className="size-4 text-primary" aria-hidden />
              </span>
            </button>
          )}

          {onDetails && (
            <button
              type="button"
              onClick={() => onDetails(job)}
              className="w-full text-center text-[11px] font-bold text-text-muted"
            >
              פרטים נוספים
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function Stat({ icon: Icon, value }: { icon: typeof Clock; value: string }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Icon className="size-3.5 text-text-muted" aria-hidden />
      <span className="text-[11px] font-bold text-text-strong">{value}</span>
    </div>
  );
}
