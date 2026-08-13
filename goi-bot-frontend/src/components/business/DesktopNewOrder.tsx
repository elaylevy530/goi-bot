import { Loader2 } from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { Switch } from "@/components/ui/switch";
import { TIMING_LABELS, type Timing } from "@/config/businessCategories";
import { BizField, bizControlClass } from "@/components/business/BizField";
import { cn } from "@/lib/utils";

type DeliveryType = { key: string; label: string };

type Props = {
  pickupText: string;
  pickup: SelectedPlace | null;
  onPickupText: (v: string) => void;
  onPickupSelect: (p: SelectedPlace) => void;
  pickupError?: string;
  pickupContactName: string;
  onPickupContactName: (v: string) => void;
  pickupContactNameError?: string;
  pickupContactPhone: string;
  onPickupContactPhone: (v: string) => void;
  pickupContactPhoneError?: string;
  pickupInstructions: string;
  onPickupInstructions: (v: string) => void;
  timing: Timing;
  timings: Timing[];
  onTiming: (t: Timing) => void;
  deliveryTypes: DeliveryType[];
  deliveryType: string;
  onDeliveryType: (v: string) => void;
  contents: string;
  onContents: (v: string) => void;
  packageWeight: string;
  onPackageWeight: (v: string) => void;
  fragile: boolean;
  onFragile: (v: boolean) => void;
  signature: boolean;
  onSignature: (v: boolean) => void;
  dropoffText: string;
  dropoff: SelectedPlace | null;
  onDropoffText: (v: string) => void;
  onDropoffSelect: (p: SelectedPlace) => void;
  dropoffError?: string;
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
  distanceKm: number | null;
  suggestedPrice: number | null;
  offeredPrice: string;
  onOfferedPrice: (v: string) => void;
  priceError?: string;
  pending: boolean;
  onSubmit: () => void;
  onDraft: () => void;
};

const STEPS = ["פרטי איסוף", "פרטי מסירה", "סיכום"] as const;

export function DesktopNewOrder(props: Props) {
  const step = !props.pickup ? 0 : !props.dropoff ? 1 : 2;
  const priceLabel =
    props.suggestedPrice == null ? "—" : `₪ ${Math.round(props.suggestedPrice)}`;

  return (
    <div className="hidden space-y-6 p-8 lg:block">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <ol className="flex items-center gap-3" aria-label="שלבי הזמנה">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-10 bg-border" aria-hidden />}
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-bold",
                    i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("text-sm", i <= step ? "font-medium text-text-strong" : "text-text-muted")}>
                  {label}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-panel">
          <h3 className="mb-4 text-base font-bold text-text-strong">פרטי נקודת האיסוף</h3>
          <div className="space-y-4">
            <BizField label="כתובת איסוף" required error={props.pickupError}>
              <AddressAutocomplete
                label="כתובת איסוף"
                placeholder="הזן כתובת מלאה..."
                value={props.pickupText}
                onChange={props.onPickupText}
                onSelect={props.onPickupSelect}
                accent="green"
                error={props.pickupError}
              />
            </BizField>
            <BizField label="שם איש קשר" required error={props.pickupContactNameError}>
              <input className={bizControlClass(!!props.pickupContactNameError)} value={props.pickupContactName} onChange={(e) => props.onPickupContactName(e.target.value)} />
            </BizField>
            <BizField label="טלפון ליצירת קשר" required error={props.pickupContactPhoneError}>
              <input className={bizControlClass(!!props.pickupContactPhoneError)} value={props.pickupContactPhone} onChange={(e) => props.onPickupContactPhone(e.target.value)} dir="ltr" />
            </BizField>
            <BizField label="הנחיות לשליח">
              <textarea className={cn(bizControlClass(), "h-20 py-2")} value={props.pickupInstructions} onChange={(e) => props.onPickupInstructions(e.target.value)} />
            </BizField>
            <BizField label="מועד איסוף מבוקש">
              <select className={bizControlClass()} value={props.timing} onChange={(e) => props.onTiming(e.target.value as Timing)}>
                {props.timings.map((t) => (
                  <option key={t} value={t}>
                    {t === "now" ? "משלוח מיידי (מבוקש כעת)" : TIMING_LABELS[t].label}
                  </option>
                ))}
              </select>
            </BizField>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-panel">
          <h3 className="mb-4 text-base font-bold text-text-strong">פרטי המשלוח</h3>
          <div className="space-y-4">
            <BizField label="סוג חבילה">
              <select className={bizControlClass()} value={props.deliveryType} onChange={(e) => props.onDeliveryType(e.target.value)}>
                {props.deliveryTypes.map((t) => (
                  <option key={t.key} value={t.label}>{t.label}</option>
                ))}
              </select>
            </BizField>
            <BizField label="תיאור תכולה">
              <input className={bizControlClass()} value={props.contents} onChange={(e) => props.onContents(e.target.value)} placeholder="לדוגמה: מוצרי קוסמטיקה" />
            </BizField>
            <BizField label="משקל מוערך">
              <input className={bizControlClass()} value={props.packageWeight} onChange={(e) => props.onPackageWeight(e.target.value)} placeholder="1.5 ק״ג" />
            </BizField>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
              <Switch checked={props.fragile} onCheckedChange={props.onFragile} />
              <span className="text-sm font-medium text-text-strong">פריט שביר / רגיש</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
              <Switch checked={props.signature} onCheckedChange={props.onSignature} />
              <span className="text-sm font-medium text-text-strong">נדרשת חתימת מקבל</span>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-surface p-6 shadow-panel">
          <p className="text-sm font-medium text-text-subtle">הערכת עלות</p>
          <p className="mt-2 text-3xl font-bold text-primary">{priceLabel}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dd className="text-text-strong">{props.distanceKm == null ? "—" : `${props.distanceKm.toFixed(1)} ק״מ`}</dd>
              <dt className="text-text-muted">מרחק</dt>
            </div>
          </dl>
          <BizField label="מחיר לשליח" error={props.priceError}>
            <input
              className={bizControlClass(!!props.priceError)}
              value={props.offeredPrice}
              onChange={(e) => props.onOfferedPrice(e.target.value)}
              placeholder={props.suggestedPrice == null ? "" : String(Math.round(props.suggestedPrice))}
              inputMode="numeric"
            />
          </BizField>
          <button
            type="button"
            onClick={props.onSubmit}
            disabled={props.pending}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {props.pending ? <Loader2 className="size-4 animate-spin" /> : "המשך לסיכום"}
          </button>
          <button
            type="button"
            onClick={props.onDraft}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-primary text-sm font-semibold text-primary"
          >
            שמור כטיוטה
          </button>
        </aside>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-panel">
        <h3 className="mb-4 text-base font-bold text-text-strong">פרטי נקודת המסירה</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <BizField label="כתובת מסירה" required error={props.dropoffError}>
              <AddressAutocomplete
                label="כתובת מסירה"
                placeholder="הזן כתובת מלאה..."
                value={props.dropoffText}
                onChange={props.onDropoffText}
                onSelect={props.onDropoffSelect}
                accent="red"
                error={props.dropoffError}
              />
            </BizField>
          </div>
          <BizField label="שם מקבל" required>
            <input className={bizControlClass()} value={props.recipientName} onChange={(e) => props.onRecipientName(e.target.value)} placeholder="לדוגמה: ישראל ישראלי" />
          </BizField>
          <BizField label="טלפון מקבל" required>
            <input className={bizControlClass()} value={props.recipientPhone} onChange={(e) => props.onRecipientPhone(e.target.value)} placeholder="050-0000000" dir="ltr" />
          </BizField>
          <BizField label="קומה / דירה">
            <input
              className={bizControlClass()}
              value={[props.dropoffFloor, props.dropoffApt].filter(Boolean).join(", ")}
              onChange={(e) => {
                const [floor, apt] = e.target.value.split(",").map((s) => s.trim());
                props.onDropoffFloor(floor || "");
                props.onDropoffApt(apt || "");
              }}
              placeholder="לדוגמה: קומה 2, דירה 6"
            />
          </BizField>
          <BizField label="כניסה / קוד">
            <input className={bizControlClass()} value={props.dropoffEntry} onChange={(e) => props.onDropoffEntry(e.target.value)} placeholder="קוד כניסה" />
          </BizField>
          <div className="md:col-span-2">
            <BizField label="הערות למסירה">
              <textarea className={cn(bizControlClass(), "h-20 py-2")} value={props.dropoffNotes} onChange={(e) => props.onDropoffNotes(e.target.value)} placeholder="כל מידע שיסייע לשליח..." />
            </BizField>
          </div>
        </div>
      </section>
    </div>
  );
}
