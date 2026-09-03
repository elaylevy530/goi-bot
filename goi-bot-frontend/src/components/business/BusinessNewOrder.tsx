import { useState, type Dispatch, type SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { OrderMap } from "@/components/customer/OrderMap";
import { Switch } from "@/components/ui/switch";
import { TIMING_LABELS, type Timing } from "@/config/businessCategories";
import { BizField, bizControlClass } from "@/components/business/BizField";
import { cn } from "@/lib/utils";
import type { DrivingRoute, LatLng } from "@/lib/google-driving-route";

export type ExtraStop = { place: SelectedPlace | null; text: string; name: string; phone: string };

type DeliveryType = { key: string; label: string };
type PricingModel = "fixed_price" | "distance_based" | "quote_request";

const STEPS = ["מסלול", "פרטי משלוח", "סיכום"] as const;
const VEHICLES = ["אופנוע", "רכב", "טנדר"] as const;

type Props = {
  pickupText: string;
  pickup: SelectedPlace | null;
  onPickupText: (v: string) => void;
  onPickupSelect: (p: SelectedPlace) => void;
  pickupError?: string;
  useBusinessAddress: boolean;
  businessPickupAddress: string;
  onUseBusinessAddress: () => void;
  onChangePickupAddress: () => void;
  dropoffText: string;
  dropoff: SelectedPlace | null;
  onDropoffText: (v: string) => void;
  onDropoffSelect: (p: SelectedPlace) => void;
  dropoffError?: string;
  extraStops: ExtraStop[];
  setExtraStops: Dispatch<SetStateAction<ExtraStop[]>>;
  waypoints: LatLng[];
  onRoute: (route: DrivingRoute | null) => void;
  route: DrivingRoute | null;
  pickupContactName: string;
  onPickupContactName: (v: string) => void;
  pickupContactNameError?: string;
  pickupContactPhone: string;
  onPickupContactPhone: (v: string) => void;
  pickupContactPhoneError?: string;
  pickupInstructions: string;
  onPickupInstructions: (v: string) => void;
  pickupReadyNow: boolean;
  onPickupReadyNow: (v: boolean) => void;
  pickupReadyTime: string;
  onPickupReadyTime: (v: string) => void;
  pickupReadyTimeError?: string;
  timing: Timing;
  timings: Timing[];
  onTiming: (t: Timing) => void;
  scheduledAt: string;
  onScheduledAt: (v: string) => void;
  scheduledAtError?: string;
  todayTime: string;
  onTodayTime: (v: string) => void;
  deliveryTypes: DeliveryType[];
  deliveryType: string;
  onDeliveryType: (v: string) => void;
  contents: string;
  onContents: (v: string) => void;
  packageWeight: string;
  onPackageWeight: (v: string) => void;
  vehicle: string;
  onVehicle: (v: string) => void;
  fragile: boolean;
  onFragile: (v: boolean) => void;
  signature: boolean;
  onSignature: (v: boolean) => void;
  recipientName: string;
  onRecipientName: (v: string) => void;
  recipientPhone: string;
  onRecipientPhone: (v: string) => void;
  dropoffFloor: string;
  onDropoffFloor: (v: string) => void;
  dropoffApt: string;
  onDropoffApt: (v: string) => void;
  dropoffEntry: string;
  onDropoffEntry: (v: string) => void;
  dropoffNotes: string;
  onDropoffNotes: (v: string) => void;
  orderNumber: string;
  onOrderNumber: (v: string) => void;
  suggestedPrice: number | null;
  offeredPrice: string;
  onOfferedPrice: (v: string) => void;
  priceError?: string;
  pricingModel: PricingModel;
  onPricingModel: (v: PricingModel) => void;
  basePrice: string;
  onBasePrice: (v: string) => void;
  basePriceError?: string;
  pricePerKm: string;
  onPricePerKm: (v: string) => void;
  pricePerKmError?: string;
  pending: boolean;
  onSubmit: () => void;
  onDraft: () => void;
  onValidateRoute: () => boolean;
  onValidateDetails: () => boolean;
};

export function BusinessNewOrder(props: Props) {
  const [step, setStep] = useState(0);
  const distanceLabel = props.route ? `${props.route.distanceKm.toFixed(1)} ק״מ` : "—";
  const durationLabel = props.route ? `~${props.route.durationMin} דק׳ נסיעה` : null;
  const priceLabel = props.suggestedPrice == null ? "—" : `₪${Math.round(props.suggestedPrice)}`;

  const goNext = () => {
    if (step === 0 && !props.onValidateRoute()) return;
    if (step === 1 && !props.onValidateDetails()) return;
    setStep((s) => Math.min(2, s + 1));
  };

  const ctaLabel =
    step === 0
      ? "המשך לפרטי משלוח"
      : step === 1
        ? "המשך לסיכום"
        : props.pricingModel === "quote_request"
          ? "בקש הצעות משליחים"
          : "שלח לשליחים";

  const routeReady = Boolean(props.pickup && props.dropoff);

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col lg:h-full lg:min-h-0 lg:flex-row">
      <section className="relative h-52 shrink-0 overflow-hidden border-b border-border bg-map-canvas lg:h-auto lg:w-[min(42%,32rem)] lg:border-b-0 lg:border-e">
        <OrderMap
          pickup={props.pickup}
          dropoff={props.dropoff}
          waypoints={props.waypoints}
          onRoute={props.onRoute}
          className="absolute inset-0 h-full w-full"
        />
        {routeReady && (
          <div className="pointer-events-none absolute end-3 top-3 z-20">
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-card-strong">
              <p className="text-sm font-bold text-text-strong">{distanceLabel}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {durationLabel ?? "מחשב זמן נסיעה…"}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end gap-3 border-b border-border px-4 py-3 lg:px-8">
          <ol className="flex items-center gap-2" aria-label="שלבי הזמנה">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-border" aria-hidden />}
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-[11px] font-bold",
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("hidden text-sm sm:inline", i === step ? "font-medium text-text-strong" : "text-text-muted")}>
                    {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6">
          {step === 0 && <RouteStep {...props} />}
          {step === 1 && <DetailsStep {...props} />}
          {step === 2 && <SummaryStep {...props} distanceLabel={distanceLabel} durationLabel={durationLabel} priceLabel={priceLabel} />}
        </div>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 shrink-0 border-t border-border bg-surface px-4 py-3 lg:static lg:bottom-auto lg:px-8">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="h-11 rounded-lg px-4 text-sm font-semibold text-text-subtle hover:bg-muted"
                >
                  חזרה
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={props.onDraft}
                  className="h-11 rounded-lg border border-border px-4 text-sm font-semibold text-text-subtle hover:bg-muted"
                >
                  שמור כטיוטה
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={step === 2 ? props.onSubmit : goNext}
              disabled={props.pending || (step === 0 && (!props.pickup || !props.dropoff))}
              className="flex h-12 items-center justify-center rounded-lg bg-primary-deep px-6 text-sm font-bold text-primary-foreground hover:bg-primary-deep/90 disabled:opacity-50 sm:min-w-56"
            >
              {props.pending ? <Loader2 className="size-4 animate-spin" /> : ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteStep(props: Props) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-strong">נקודות המסלול</h2>
        <p className="mt-1 text-sm text-text-muted">כתובת איסוף ומסירה. המפה מציגה את נתיב הנסיעה.</p>
        {props.route && (
          <p className="mt-2 text-sm font-semibold text-text-strong">
            {props.route.distanceKm.toFixed(1)} ק״מ
            <span className="font-medium text-text-muted"> · ~{props.route.durationMin} דק׳ נסיעה</span>
          </p>
        )}
      </div>
      {props.useBusinessAddress && props.businessPickupAddress ? (
        <div data-field="pickup">
          <BizField label="כתובת איסוף" required error={props.pickupError}>
            <div className={cn("flex items-center justify-between gap-3 rounded-lg border bg-muted px-3 py-3", props.pickupError ? "border-destructive/50" : "border-border")}>
              <button type="button" onClick={props.onChangePickupAddress} className="shrink-0 text-xs font-semibold text-primary">
                כתובת אחרת
              </button>
              <span className="min-w-0 truncate text-sm font-medium text-text-strong">{props.businessPickupAddress}</span>
            </div>
          </BizField>
        </div>
      ) : (
        <div data-field="pickup">
          <AddressAutocomplete
            label="כתובת איסוף"
            placeholder="חפש כתובת איסוף"
            value={props.pickupText}
            onChange={props.onPickupText}
            onSelect={props.onPickupSelect}
            accent="green"
            error={props.pickupError}
          />
          {props.businessPickupAddress ? (
            <button type="button" onClick={props.onUseBusinessAddress} className="mt-1 text-xs font-medium text-primary">
              חזרה לכתובת העסק
            </button>
          ) : null}
        </div>
      )}
      <div data-field="dropoff">
        <AddressAutocomplete
          label="כתובת מסירה"
          placeholder="חפש כתובת מסירה"
          value={props.dropoffText}
          onChange={props.onDropoffText}
          onSelect={props.onDropoffSelect}
          accent="red"
          error={props.dropoffError}
        />
      </div>
      <ExtraStopsEditor stops={props.extraStops} setStops={props.setExtraStops} />
    </div>
  );
}

function DetailsStep(props: Props) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <h2 className="text-base font-bold text-text-strong">איסוף</h2>
        <div data-field="pickupContactName">
          <BizField label="שם איש קשר" required error={props.pickupContactNameError}>
            <input className={bizControlClass(!!props.pickupContactNameError)} value={props.pickupContactName} onChange={(e) => props.onPickupContactName(e.target.value)} />
          </BizField>
        </div>
        <div data-field="pickupContactPhone">
          <BizField label="טלפון באיסוף" required error={props.pickupContactPhoneError}>
            <input className={bizControlClass(!!props.pickupContactPhoneError)} value={props.pickupContactPhone} onChange={(e) => props.onPickupContactPhone(e.target.value)} dir="ltr" />
          </BizField>
        </div>
        <BizField label="הנחיות לשליח">
          <textarea className={cn(bizControlClass(), "h-20 py-2")} value={props.pickupInstructions} onChange={(e) => props.onPickupInstructions(e.target.value)} placeholder="כניסה, קומה, חניה…" />
        </BizField>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
          <Switch checked={props.pickupReadyNow} onCheckedChange={props.onPickupReadyNow} />
          <span className="text-sm font-medium text-text-strong">מוכן לאיסוף עכשיו</span>
        </div>
        {!props.pickupReadyNow && (
          <div data-field="pickupReadyTime">
            <BizField label="שעת מוכנות" required error={props.pickupReadyTimeError}>
              <input type="time" className={bizControlClass(!!props.pickupReadyTimeError)} value={props.pickupReadyTime} onChange={(e) => props.onPickupReadyTime(e.target.value)} dir="ltr" />
            </BizField>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-bold text-text-strong">מסירה</h2>
        <BizField label="שם מקבל">
          <input className={bizControlClass()} value={props.recipientName} onChange={(e) => props.onRecipientName(e.target.value)} />
        </BizField>
        <BizField label="טלפון מקבל">
          <input className={bizControlClass()} value={props.recipientPhone} onChange={(e) => props.onRecipientPhone(e.target.value)} dir="ltr" />
        </BizField>
        <div className="grid grid-cols-3 gap-3">
          <BizField label="קומה">
            <input className={bizControlClass()} value={props.dropoffFloor} onChange={(e) => props.onDropoffFloor(e.target.value)} />
          </BizField>
          <BizField label="דירה">
            <input className={bizControlClass()} value={props.dropoffApt} onChange={(e) => props.onDropoffApt(e.target.value)} />
          </BizField>
          <BizField label="כניסה / קוד">
            <input className={bizControlClass()} value={props.dropoffEntry} onChange={(e) => props.onDropoffEntry(e.target.value)} />
          </BizField>
        </div>
        <BizField label="הערות למסירה">
          <textarea className={cn(bizControlClass(), "h-20 py-2")} value={props.dropoffNotes} onChange={(e) => props.onDropoffNotes(e.target.value)} />
        </BizField>
      </section>

      <section className="space-y-4 lg:col-span-2">
        <h2 className="text-base font-bold text-text-strong">פרטי חבילה ומועד</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <BizField label="מספר הזמנה" hint="מספר אצלכם בעסק — יכול לחזור על עצמו">
            <input
              className={bizControlClass()}
              value={props.orderNumber}
              onChange={(e) => props.onOrderNumber(e.target.value)}
              placeholder="לדוגמה: 1042"
              dir="ltr"
            />
          </BizField>
          <BizField label="סוג חבילה">
            <select className={bizControlClass()} value={props.deliveryType} onChange={(e) => props.onDeliveryType(e.target.value)}>
              {props.deliveryTypes.map((t) => (
                <option key={t.key} value={t.label}>{t.label}</option>
              ))}
            </select>
          </BizField>
          <BizField label="תיאור תכולה">
            <input className={bizControlClass()} value={props.contents} onChange={(e) => props.onContents(e.target.value)} />
          </BizField>
          <BizField label="משקל מוערך">
            <input className={bizControlClass()} value={props.packageWeight} onChange={(e) => props.onPackageWeight(e.target.value)} placeholder="לדוגמה: 1.5 ק״ג" />
          </BizField>
          <BizField label="רכב נדרש">
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => props.onVehicle(v)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium",
                    props.vehicle === v
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-text-subtle hover:bg-muted",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </BizField>
        </div>
        <div data-field="scheduledAt">
          <BizField label="מועד איסוף" error={props.scheduledAtError}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {props.timings.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => props.onTiming(t)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium",
                    props.timing === t
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-text-subtle hover:bg-muted",
                  )}
                >
                  {TIMING_LABELS[t].label}
                </button>
              ))}
            </div>
          </BizField>
        </div>
        {props.timing === "scheduled" && (
          <BizField label="תאריך ושעה" required error={props.scheduledAtError}>
            <input type="datetime-local" className={bizControlClass(!!props.scheduledAtError)} value={props.scheduledAt} onChange={(e) => props.onScheduledAt(e.target.value)} dir="ltr" />
          </BizField>
        )}
        {(props.timing === "today" || props.timing === "within_hour") && (
          <BizField label="שעה מבוקשת">
            <input type="time" className={bizControlClass()} value={props.todayTime} onChange={(e) => props.onTodayTime(e.target.value)} dir="ltr" />
          </BizField>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <Switch checked={props.fragile} onCheckedChange={props.onFragile} />
            <span className="text-sm font-medium text-text-strong">פריט שביר</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <Switch checked={props.signature} onCheckedChange={props.onSignature} />
            <span className="text-sm font-medium text-text-strong">נדרשת חתימת מקבל</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryStep(props: Props & { distanceLabel: string; durationLabel: string | null; priceLabel: string }) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-strong">סיכום ושילוח</h2>
        <p className="mt-1 text-sm text-text-muted">בדקו את המסלול והמחיר לפני השיגור לשליחים.</p>
      </div>
      <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dd className="text-end text-text-strong">{props.pickup?.address || props.pickupText || "—"}</dd>
          <dt className="shrink-0 text-text-muted">מאיפה</dt>
        </div>
        <div className="flex justify-between gap-4">
          <dd className="text-end text-text-strong">{props.dropoff?.address || props.dropoffText || "—"}</dd>
          <dt className="shrink-0 text-text-muted">לאן</dt>
        </div>
        <div className="flex justify-between gap-4">
          <dd className="text-text-strong">{props.distanceLabel}{props.durationLabel ? ` · ${props.durationLabel}` : ""}</dd>
          <dt className="text-text-muted">מסלול</dt>
        </div>
        <div className="flex justify-between gap-4">
          <dd className="text-text-strong">{props.deliveryType || "—"}</dd>
          <dt className="text-text-muted">חבילה</dt>
        </div>
        {props.orderNumber.trim() ? (
          <div className="flex justify-between gap-4">
            <dd className="text-text-strong" dir="ltr">{props.orderNumber.trim()}</dd>
            <dt className="text-text-muted">מספר הזמנה</dt>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dd className="text-text-strong">{TIMING_LABELS[props.timing].label}</dd>
          <dt className="text-text-muted">מועד</dt>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-subtle">מודל תמחור</p>
        {([
          { id: "fixed_price" as const, title: "מחיר קבוע", desc: "סכום שאתם קובעים לשליח" },
          { id: "distance_based" as const, title: "לפי מרחק", desc: "בסיס + תשלום לק״מ" },
          { id: "quote_request" as const, title: "בקשת הצעות", desc: "שליחים מציעים ואתם בוחרים" },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => props.onPricingModel(opt.id)}
            className={cn(
              "flex w-full flex-col items-end rounded-lg border px-3 py-3 text-right",
              props.pricingModel === opt.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-muted",
            )}
          >
            <span className="text-sm font-semibold text-text-strong">{opt.title}</span>
            <span className="text-xs text-text-muted">{opt.desc}</span>
          </button>
        ))}
      </div>

      {props.pricingModel === "fixed_price" && (
        <div data-field="offeredPrice">
          <BizField label="מחיר לשליח" required error={props.priceError} hint={props.suggestedPrice != null ? `מוצע ${props.priceLabel}` : undefined}>
            <input
              className={bizControlClass(!!props.priceError)}
              value={props.offeredPrice}
              onChange={(e) => props.onOfferedPrice(e.target.value)}
              inputMode="numeric"
              placeholder={props.suggestedPrice == null ? "" : String(Math.round(props.suggestedPrice))}
            />
          </BizField>
        </div>
      )}
      {props.pricingModel === "distance_based" && (
        <div className="grid grid-cols-2 gap-3">
          <div data-field="basePrice">
            <BizField label="מחיר בסיס" error={props.basePriceError}>
              <input className={bizControlClass(!!props.basePriceError)} value={props.basePrice} onChange={(e) => props.onBasePrice(e.target.value)} inputMode="numeric" />
            </BizField>
          </div>
          <div data-field="pricePerKm">
            <BizField label="₪ לק״מ" error={props.pricePerKmError}>
              <input className={bizControlClass(!!props.pricePerKmError)} value={props.pricePerKm} onChange={(e) => props.onPricePerKm(e.target.value)} inputMode="numeric" />
            </BizField>
          </div>
        </div>
      )}
      {props.pricingModel === "quote_request" && (
        <p className="rounded-lg bg-muted px-3 py-3 text-sm text-text-subtle">ההזמנה תישלח כבקשת הצעת מחיר. לא יפורסם סכום לשליחים.</p>
      )}
    </div>
  );
}

function ExtraStopsEditor({
  stops,
  setStops,
}: {
  stops: ExtraStop[];
  setStops: Dispatch<SetStateAction<ExtraStop[]>>;
}) {
  return (
    <div className="space-y-2">
      {stops.map((s, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStops((p) => p.filter((_, idx) => idx !== i))} className="text-xs font-medium text-danger-text">
              הסר
            </button>
            <span className="text-xs font-medium text-text-muted">יעד נוסף {i + 2}</span>
          </div>
          <AddressAutocomplete
            label={`יעד ${i + 2}`}
            placeholder="כתובת"
            value={s.text}
            onChange={(v) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, text: v, place: v ? row.place : null } : row)))}
            onSelect={(p) => setStops((prev) => prev.map((row, idx) => (idx === i ? { ...row, place: p, text: p.address } : row)))}
            accent="red"
          />
          <div className="grid grid-cols-2 gap-2">
            <input className={bizControlClass()} value={s.name} onChange={(e) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} placeholder="שם" />
            <input className={bizControlClass()} value={s.phone} onChange={(e) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, phone: e.target.value } : row)))} placeholder="טלפון" dir="ltr" />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setStops((p) => [...p, { place: null, text: "", name: "", phone: "" }])}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-xs font-semibold text-text-muted hover:bg-muted"
      >
        {stops.length === 0 ? "הוסף יעד נוסף לאותו שליח" : "הוסף עוד יעד"}
      </button>
    </div>
  );
}
