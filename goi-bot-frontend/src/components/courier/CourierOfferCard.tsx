import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import {
  ChevronsUp,
  Clock,
  CreditCard,
  Home,
  Navigation,
  Phone,
  Route,
  Store,
} from "lucide-react";
import type { MapJob } from "@/components/CourierJobsMap";
import type { CourierTerms } from "@/lib/courier-kind";
import type { DrivingRoute } from "@/lib/google-driving-route";
import { pickupReadyBadge } from "@/lib/pickup-ready";
import { openWaze } from "@/lib/waze";
import { cn } from "@/lib/utils";

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

function streetTitle(address?: string | null, area?: string | null) {
  const full = addressLine(address, area);
  if (full === "—") return full;
  const first = full.split(",")[0]?.trim();
  return first || full;
}

export function CourierOfferCard({
  job,
  distToPickupKm,
  route,
  claiming,
  terms: t,
  onClaim,
  onQuote,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const dragY = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setExpanded(false);
  }, [job.id]);

  const businessName = job.customer_name?.trim() || "בית העסק";
  const isQuote = job.__kind === "quote";
  const payLabel = job.requires_cash ? "מזומן" : "אשראי";
  const packages = Number(job.number_of_packages ?? 0) || 1;
  const tripKm = route?.distanceKm ?? (distToPickupKm != null ? distToPickupKm : null);
  const pickup = addressLine(job.pickup_address, job.pickup_area);
  const dropoff = addressLine(job.dropoff_address, job.dropoff_area);
  const dropTitle = streetTitle(job.dropoff_address, job.dropoff_area);
  const readyBadge = pickupReadyBadge(job, now);
  const packageType = String(job.package_type || job.item_category || job.job_type || "חבילה").trim();
  const packageWeight = String(job.package_size || "").trim() || "—";
  const packageNote = String(job.description || job.dropoff_notes || job.pickup_notes || "").trim() || "—";
  const dropNote = String(job.dropoff_notes || "").trim();
  const pickupPhone = String(job.pickup_contact_phone || "").trim();
  const recipientPhone = String(job.recipient_phone || "").trim();

  const onHandleTouchStart = (e: TouchEvent) => {
    dragY.current = e.touches[0]?.clientY ?? null;
  };
  const onHandleTouchEnd = (e: TouchEvent) => {
    if (dragY.current == null) return;
    const y = e.changedTouches[0]?.clientY;
    if (y == null) return;
    const dy = y - dragY.current;
    dragY.current = null;
    if (dy < -36) setExpanded(true);
    if (dy > 36) setExpanded(false);
  };

  return (
    <div data-job-id={job.id} dir="rtl" className="snap-center w-full shrink-0">
      <article
        className={cn(
          "overflow-hidden rounded-[1.75rem] bg-surface shadow-card-strong border border-border transition-[max-height] duration-300",
          expanded ? "max-h-[78dvh]" : "max-h-[none]",
        )}
      >
        <button
          type="button"
          className="flex w-full flex-col items-center gap-1 pt-2.5 pb-1"
          onClick={() => setExpanded((v) => !v)}
          onTouchStart={onHandleTouchStart}
          onTouchEnd={onHandleTouchEnd}
          aria-expanded={expanded}
        >
          <span className="h-1 w-10 rounded-full bg-border-strong/80" aria-hidden />
          {expanded ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
              <ChevronsUp className="size-3.5 rotate-180" aria-hidden />
              החלק למטה
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
              <ChevronsUp className="size-3.5" aria-hidden />
              החלק למעלה לפרטים
            </span>
          )}
        </button>

        <div className={cn("px-3 pb-3", expanded && "overflow-y-auto max-h-[calc(78dvh-3rem)]")}>
          <RewardBanner
            isQuote={isQuote}
            payment={Number(job.payment ?? 0)}
          />

          {expanded ? (
            <ExpandedBody
              businessName={businessName}
              pickup={pickup}
              dropTitle={dropTitle}
              dropoffArea={job.dropoff_area}
              readyBadge={readyBadge}
              dropNote={dropNote}
              packageType={packageType}
              packages={packages}
              packageWeight={packageWeight}
              packageNote={packageNote}
              tripKm={tripKm}
              payLabel={payLabel}
              pickupPhone={pickupPhone}
              recipientPhone={recipientPhone}
              pickupNav={pickup}
              dropoffNav={dropoff}
            />
          ) : (
            <CollapsedBody
              businessName={businessName}
              pickup={pickup}
              dropTitle={dropTitle}
              dropoffArea={job.dropoff_area}
              tripKm={tripKm}
              payLabel={payLabel}
            />
          )}

          {isQuote ? (
            <button
              type="button"
              onClick={() => onQuote(job)}
              className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-[#35AD29] px-3 text-[16px] font-extrabold text-white shadow-fab active:scale-[0.99]"
            >
              הגש הצעת מחיר
            </button>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={() => onClaim(job)}
              className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-[#35AD29] px-3 text-[16px] font-extrabold text-white shadow-fab disabled:opacity-60 active:scale-[0.99]"
            >
              לקחתי את {t.theJob}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function RewardBanner({ isQuote, payment }: { isQuote: boolean; payment: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1F5C2E] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-right text-white">
          {isQuote ? (
            <p className="text-3xl font-black leading-none">₪?</p>
          ) : (
            <p className="text-3xl font-black leading-none tabular-nums">
              {payment.toFixed(0)} ₪
            </p>
          )}
          <p className="mt-1 text-[12px] font-semibold text-white/85">
            התגמול שלך עבור המשלוח
          </p>
        </div>
        <img
          src="/courier/reward-wallet.png"
          alt=""
          className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
          draggable={false}
        />
      </div>
    </div>
  );
}

function CollapsedBody({
  businessName,
  pickup,
  dropTitle,
  dropoffArea,
  tripKm,
  payLabel,
}: {
  businessName: string;
  pickup: string;
  dropTitle: string;
  dropoffArea?: string | null;
  tripKm: number | null;
  payLabel: string;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="relative pr-1">
        <div className="absolute right-[15px] top-7 bottom-7 border-r border-dashed border-border-strong" aria-hidden />
        <div className="relative flex items-start gap-3">
          <span className="z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#35AD29] text-white shadow-sm">
            <Store className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] font-bold text-[#35AD29]">איסוף</p>
            <p className="truncate text-[15px] font-extrabold text-text-strong">{businessName}</p>
            <p className="truncate text-[12px] text-text-subtle">{pickup}</p>
          </div>
        </div>
        <div className="relative mt-3 flex items-start gap-3">
          <span className="z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#E86B3A] text-white shadow-sm">
            <Home className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] font-bold text-[#E86B3A]">מסירה</p>
            <p className="truncate text-[15px] font-extrabold text-text-strong">{dropTitle}</p>
            <p className="truncate text-[12px] text-text-subtle">{dropoffArea || "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border border-y border-border py-2.5">
        <MetaCell
          icon={<Route className="size-4 text-primary" />}
          label="מרחק מסלול"
          value={tripKm != null ? formatKm(tripKm) : "—"}
        />
        <MetaCell
          icon={<CreditCard className="size-4 text-primary" />}
          label="אמצעי תשלום"
          value={payLabel}
        />
      </div>
    </div>
  );
}

function ExpandedBody({
  businessName,
  pickup,
  dropTitle,
  dropoffArea,
  readyBadge,
  dropNote,
  packageType,
  packages,
  packageWeight,
  packageNote,
  tripKm,
  payLabel,
  pickupPhone,
  recipientPhone,
  pickupNav,
  dropoffNav,
}: {
  businessName: string;
  pickup: string;
  dropTitle: string;
  dropoffArea?: string | null;
  readyBadge: string | null;
  dropNote: string;
  packageType: string;
  packages: number;
  packageWeight: string;
  packageNote: string;
  tripKm: number | null;
  payLabel: string;
  pickupPhone: string;
  recipientPhone: string;
  pickupNav: string;
  dropoffNav: string;
}) {
  return (
    <div className="mt-3 space-y-4">
      <section>
        <h3 className="mb-2 text-right text-[13px] font-extrabold text-text-strong">פרטי המשלוח</h3>
        <div className="relative pr-1">
          <div className="absolute right-[15px] top-8 bottom-10 border-r border-dashed border-border-strong" aria-hidden />

          <div className="relative flex items-start gap-3">
            <span className="z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#35AD29] text-white">
              <Store className="size-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[11px] font-bold text-[#35AD29]">איסוף</p>
              <p className="text-[15px] font-extrabold text-text-strong">{businessName}</p>
              <p className="text-[12px] text-text-subtle">{pickup}</p>
              {readyBadge && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#E8F8E6] px-2.5 py-1 text-[11px] font-bold text-[#1F7A2E]">
                  <Clock className="size-3.5" aria-hidden />
                  {readyBadge}
                </span>
              )}
              <ActionRow
                phone={pickupPhone}
                onNavigate={() => openWaze(pickupNav)}
              />
            </div>
          </div>

          <div className="relative mt-4 flex items-start gap-3">
            <span className="z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#E86B3A] text-white">
              <Home className="size-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[11px] font-bold text-[#E86B3A]">מסירה</p>
              <p className="text-[15px] font-extrabold text-text-strong">{dropTitle}</p>
              <p className="text-[12px] text-text-subtle">{dropoffArea || "—"}</p>
              {dropNote && (
                <p className="mt-1 text-[12px] font-semibold text-text-strong">{dropNote}</p>
              )}
              <ActionRow
                phone={recipientPhone}
                onNavigate={() => openWaze(dropoffNav)}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-right text-[13px] font-extrabold text-text-strong">פרטי החבילה</h3>
        <dl className="divide-y divide-border text-right">
          <PkgRow label="סוג" value={packageType} />
          <PkgRow label="כמות" value={packages === 1 ? "חבילה אחת" : `${packages} חבילות`} />
          <PkgRow label="משקל" value={packageWeight} />
          <PkgRow label="הערה" value={packageNote} />
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border px-3 py-2.5 text-right">
          <div className="flex items-center justify-between gap-2">
            <Route className="size-4 text-primary" aria-hidden />
            <p className="text-[11px] font-bold text-text-muted">מרחק מסלול</p>
          </div>
          <p className="mt-1 text-[15px] font-extrabold tabular-nums text-text-strong">
            {tripKm != null ? formatKm(tripKm) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border px-3 py-2.5 text-right">
          <div className="flex items-center justify-between gap-2">
            <CreditCard className="size-4 text-primary" aria-hidden />
            <p className="text-[11px] font-bold text-text-muted">אמצעי תשלום</p>
          </div>
          <p className="mt-1 text-[15px] font-extrabold text-text-strong">{payLabel}</p>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ phone, onNavigate }: { phone: string; onNavigate: () => void }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onNavigate}
        className="grid size-9 place-items-center rounded-full border border-border text-text-strong active:bg-muted"
        aria-label="נווט"
      >
        <Navigation className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (phone) window.location.href = `tel:${phone}`;
        }}
        disabled={!phone}
        className="grid size-9 place-items-center rounded-full border border-border text-text-strong active:bg-muted disabled:opacity-40"
        aria-label="חייג"
      >
        <Phone className="size-4" />
      </button>
    </div>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-2">
      {icon}
      <div className="text-right">
        <p className="text-[10px] font-bold text-text-muted">{label}</p>
        <p className="text-[13px] font-extrabold text-text-strong">{value}</p>
      </div>
    </div>
  );
}

function PkgRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dd className="text-[13px] font-bold text-text-strong">{value}</dd>
      <dt className="text-[12px] font-bold text-text-muted">{label}</dt>
    </div>
  );
}
