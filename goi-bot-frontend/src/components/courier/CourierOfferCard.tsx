import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import {
  ChevronDown,
  Clock,
  CreditCard,
  Home,
  Route,
  Store,
} from "lucide-react";
import type { MapJob } from "@/components/CourierJobsMap";
import type { CourierTerms } from "@/lib/courier-kind";
import type { DrivingRoute } from "@/lib/google-driving-route";
import { pickupReadyBadge } from "@/lib/pickup-ready";
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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
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
  return full.split(",")[0]?.trim() || full;
}

export function CourierOfferCard({
  job,
  distToPickupKm,
  route,
  claiming,
  terms: t,
  onClaim,
  onQuote,
  expanded: expandedProp,
  onExpandedChange,
}: Props) {
  const [expandedInner, setExpandedInner] = useState(false);
  const expanded = expandedProp ?? expandedInner;
  const [now, setNow] = useState(() => Date.now());
  const dragY = useRef<number | null>(null);

  const setOpen = (next: boolean) => {
    if (expandedProp === undefined) setExpandedInner(next);
    onExpandedChange?.(next);
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when job changes
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
  const packageType = String(job.package_type || job.item_category || "שקית").trim() || "שקית";
  const packageWeight = String(job.package_size || "").trim() || "עד 5 ק״ג";
  const packageNote = String(job.description || job.dropoff_notes || job.pickup_notes || "").trim() || "—";
  const dropNote = String(job.dropoff_notes || "").trim();

  const onHandleTouchStart = (e: TouchEvent) => {
    dragY.current = e.touches[0]?.clientY ?? null;
  };
  const onHandleTouchEnd = (e: TouchEvent) => {
    if (dragY.current == null) return;
    const y = e.changedTouches[0]?.clientY;
    if (y == null) return;
    const dy = y - dragY.current;
    dragY.current = null;
    if (dy < -40) setOpen(true);
    if (dy > 40) setOpen(false);
  };

  const cta = (
    isQuote ? (
      <button
        type="button"
        onClick={() => onQuote(job)}
        className={cn(
          "flex w-full items-center justify-center rounded-xl bg-[#2F7A28] text-[16px] font-extrabold text-white shadow-[0_8px_18px_rgba(47,122,40,0.32)] active:scale-[0.99]",
          expanded ? "h-14" : "h-11 text-[15px]",
        )}
      >
        הגש הצעת מחיר
      </button>
    ) : (
      <button
        type="button"
        disabled={claiming}
        onClick={() => onClaim(job)}
        className={cn(
          "flex w-full items-center justify-center rounded-xl bg-[#2F7A28] text-[16px] font-extrabold text-white shadow-[0_8px_18px_rgba(47,122,40,0.32)] disabled:opacity-60 active:scale-[0.99]",
          expanded ? "h-14" : "h-11 text-[15px]",
        )}
      >
        לקחתי את {t.theJob}
      </button>
    )
  );

  /* -------- Expanded: full-bleed sheet on the map -------- */
  if (expanded) {
    return (
      <div
        data-job-id={job.id}
        dir="rtl"
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex w-full max-h-[min(92%,760px)] flex-col rounded-t-[1.25rem] rounded-b-none bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.22)]"
      >
        <button
          type="button"
          className="flex shrink-0 flex-col items-center gap-0.5 pb-1 pt-2.5"
          onClick={() => setOpen(false)}
          onTouchStart={onHandleTouchStart}
          onTouchEnd={onHandleTouchEnd}
          aria-label="סגור פרטים"
        >
          <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" aria-hidden />
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-text-muted">
            <ChevronDown className="size-3.5" aria-hidden />
            החלק למטה
          </span>
        </button>

        <div className="flex flex-col overflow-hidden px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <RewardBanner isQuote={isQuote} payment={Number(job.payment ?? 0)} compact />

          <div className="mt-2 overflow-hidden">
            <p className="mb-1 text-right text-[13px] font-extrabold text-text-strong">פרטי המשלוח</p>
            <StopsTimeline
              businessName={businessName}
              pickup={pickup}
              dropTitle={dropTitle}
              dropoffArea={job.dropoff_area}
              readyBadge={readyBadge}
              dropNote={dropNote}
              tripKm={tripKm}
              dense
            />

            <p className="mb-1 mt-2 text-right text-[13px] font-extrabold text-text-strong">פרטי החבילה</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-2xl border border-border px-3 py-2.5">
              <PkgChip label="סוג" value={packageType} />
              <PkgChip label="כמות" value={packages === 1 ? "חבילה אחת" : `${packages} חבילות`} />
              <PkgChip label="משקל" value={packageWeight} />
              <PkgChip label="הערה" value={packageNote} />
            </div>
          </div>

          <div className="mt-1.5 shrink-0">{cta}</div>
        </div>
      </div>
    );
  }

  /* -------- Collapsed: ~30% map height, denser -------- */
  return (
    <div data-job-id={job.id} dir="rtl" className="h-full min-h-0 w-full min-w-full shrink-0 snap-center">
      <article className="flex h-full max-h-full flex-col overflow-hidden rounded-t-[1.25rem] rounded-b-none border border-b-0 border-border bg-surface shadow-card-strong">
        <button
          type="button"
          className="flex w-full shrink-0 flex-col items-center gap-0.5 pt-1.5 pb-0.5"
          onClick={() => setOpen(true)}
          onTouchStart={onHandleTouchStart}
          onTouchEnd={onHandleTouchEnd}
          aria-label="פתח פרטים"
        >
          <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" aria-hidden />
          <span className="text-[10px] font-bold text-text-muted">החלק למעלה לפרטים נוספים</span>
        </button>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          <RewardBanner isQuote={isQuote} payment={Number(job.payment ?? 0)} compact />

          <div className="mt-1.5 min-h-0 flex-1 overflow-hidden">
            <StopsTimeline
              businessName={businessName}
              pickup={pickup}
              dropTitle={dropTitle}
              dropoffArea={job.dropoff_area}
              dense
            />
          </div>

          <div className="mt-1.5 grid shrink-0 grid-cols-2 divide-x divide-x-reverse divide-border border-y border-border py-1.5">
            <MetaCell
              icon={<Route className="size-3.5 text-[#35AD29]" />}
              label="מרחק מסלול"
              value={tripKm != null ? formatKm(tripKm) : "—"}
            />
            <MetaCell
              icon={<CreditCard className="size-3.5 text-[#35AD29]" />}
              label="אמצעי תשלום"
              value={payLabel}
            />
          </div>

          <div className="mt-1.5 shrink-0">{cta}</div>
        </div>
      </article>
    </div>
  );
}

function RewardBanner({
  isQuote,
  payment,
  compact = false,
}: {
  isQuote: boolean;
  payment: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl text-white",
        "bg-[linear-gradient(145deg,#4A5F54_0%,#3A4C43_42%,#2F3D36_100%)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.22),0_6px_14px_rgba(0,0,0,0.18)]",
        compact ? "px-3 py-2" : "px-4 py-3.5",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0)_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-8 top-[-40%] h-[140%] w-16 rotate-12 bg-white/15 blur-md"
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0 text-right">
          {isQuote ? (
            <p className={cn("font-black leading-none", compact ? "text-[22px]" : "text-[28px]")}>₪?</p>
          ) : (
            <p className={cn("font-black leading-none tabular-nums", compact ? "text-[22px]" : "text-[28px]")}>
              {payment.toFixed(0)} ₪
            </p>
          )}
          <p className={cn("font-semibold text-white/90", compact ? "mt-0.5 text-[11px]" : "mt-1 text-[12px]")}>
            התגמול שלך עבור המשלוח
          </p>
        </div>
        <img
          src="/courier/reward-wallet.png?v=9"
          alt=""
          className={cn(
            "shrink-0 bg-transparent object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]",
            compact ? "h-12 w-12" : "h-[72px] w-[72px]",
          )}
          draggable={false}
        />
      </div>
    </div>
  );
}

function StopsTimeline({
  businessName,
  pickup,
  dropTitle,
  dropoffArea,
  readyBadge,
  dropNote,
  tripKm,
  dense = false,
}: {
  businessName: string;
  pickup: string;
  dropTitle: string;
  dropoffArea?: string | null;
  readyBadge?: string | null;
  dropNote?: string;
  tripKm?: number | null;
  dense?: boolean;
}) {
  const showTripOnRail = dense && tripKm != null;
  return (
    <div className="relative">
      <div
        className={cn(
          "pointer-events-none absolute right-[15px] border-r border-dashed border-[#C9CDD3]",
          dense ? "top-7 bottom-7" : "top-7 bottom-8",
        )}
        aria-hidden
      />

      <StopRow
        tone="pickup"
        icon={<Store className="size-4" strokeWidth={2.3} />}
        label="איסוף"
        title={businessName}
        subtitle={pickup}
        badge={readyBadge}
        dense={dense}
      />

      {showTripOnRail ? (
        <div className="relative z-10 my-1.5 flex justify-start pr-10">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-text-strong shadow-sm">
            <Route className="size-3 text-[#35AD29]" aria-hidden />
            {formatKm(tripKm)}
          </span>
        </div>
      ) : (
        <div className={dense ? "mt-2.5" : "mt-3"} />
      )}

      <StopRow
        tone="dropoff"
        icon={<Home className="size-4" strokeWidth={2.3} />}
        label="מסירה"
        title={dropTitle}
        subtitle={dropoffArea || "—"}
        note={dropNote}
        dense={dense}
      />
    </div>
  );
}

function StopRow({
  tone,
  icon,
  label,
  title,
  subtitle,
  badge,
  note,
  dense,
}: {
  tone: "pickup" | "dropoff";
  icon: ReactNode;
  label: string;
  title: string;
  subtitle: string;
  badge?: string | null;
  note?: string;
  dense?: boolean;
}) {
  const green = tone === "pickup";
  return (
    <div className="relative flex items-start gap-3">
      <span
        className={cn(
          "z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white shadow-sm",
          green ? "bg-[#35AD29]" : "bg-[#E86B3A]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-right">
        <p className={cn("text-[11px] font-bold", green ? "text-[#35AD29]" : "text-[#E86B3A]")}>
          {label}
        </p>
        <p className={cn("truncate font-extrabold text-text-strong", dense ? "text-[14px]" : "text-[15px]")}>
          {title}
        </p>
        <p className="truncate text-[12px] text-text-subtle">{subtitle}</p>
        {badge && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#E8F8E6] px-2 py-0.5 text-[11px] font-bold text-[#1F7A2E]">
            <Clock className="size-3.5" aria-hidden />
            {badge}
          </span>
        )}
        {note ? (
          <p className="mt-0.5 truncate text-[12px] font-semibold text-text-strong">{note}</p>
        ) : null}
      </div>
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
    <div className="flex items-center justify-center gap-1.5 px-1.5">
      {icon}
      <div className="min-w-0 text-right">
        <p className="text-[9px] font-bold text-text-muted">{label}</p>
        <p className="truncate text-[12px] font-extrabold text-text-strong">{value}</p>
      </div>
    </div>
  );
}

function PkgChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-right">
      <p className="text-[10px] font-bold text-text-muted">{label}</p>
      <p className="truncate text-[12px] font-extrabold text-text-strong">{value}</p>
    </div>
  );
}
