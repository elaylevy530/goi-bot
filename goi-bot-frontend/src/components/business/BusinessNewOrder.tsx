import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bike,
  Car,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  Send,
  Tag,
} from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { OrderMap } from "@/components/customer/OrderMap";
import { Choices, Modal, Panel, SelectBox } from "@/components/business/goi/GoiUi";
import { useMyBusiness } from "@/components/BusinessShell";
import type { Timing } from "@/config/businessCategories";
import { nestListMyBranches } from "@/lib/nest-domain";
import { canonicalizeVehicleValue } from "@/lib/courier-vehicles";
import type { DrivingRoute, LatLng } from "@/lib/google-driving-route";
import { toast } from "sonner";

export type ExtraStop = { place: SelectedPlace | null; text: string; name: string; phone: string };

type DeliveryType = { key: string; label: string };
type PricingModel = "fixed_price" | "distance_based" | "quote_request";

const GENERIC_KINDS = ["מעטפה", "שקית", "חבילה עד 5 קילו", "חבילה עד 10 קילו", "עד 20 קילו"];
const PAY_OPTIONS = ["כרטיס אשראי", "יתרה", "מזומן"];

type SavedItem = { id: string; name: string; weight?: string; vehicle?: string; quantity?: number };
type Branch = { id: string; branch_name: string; full_address?: string | null; city?: string | null; is_default?: boolean; phone?: string | null };

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
  quantity: number;
  onQuantity: (n: number) => void;
  customerPayment: string;
  onCustomerPayment: (v: string) => void;
  cashCollect: string;
  onCashCollect: (v: string) => void;
  dropoffCity: string;
  onDropoffCity: (v: string) => void;
  dropoffCode: string;
  onDropoffCode: (v: string) => void;
};

function cityFromAddress(address: string) {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  const last = parts[parts.length - 1];
  if (["ישראל", "Israel", "israel"].includes(last) && parts.length >= 2) return parts[parts.length - 2];
  return last;
}

function shortAddress(address: string) {
  return address
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !["ישראל", "Israel", "israel"].includes(s))
    .slice(0, 2)
    .join(", ");
}

async function geocodeClient(address: string): Promise<SelectedPlace | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "il", "accept-language": "he" });
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = data[0];
    if (!hit) return null;
    return { address: hit.display_name || address, lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch {
    return null;
  }
}

export function BusinessNewOrder(props: Props) {
  const { data: me } = useMyBusiness();
  const [mobileExpanded, setMobileExpanded] = useState(!!props.dropoffText);
  const [confirm, setConfirm] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const readyLabel = props.pickupReadyNow ? "מוכן עכשיו" : "15 דקות";

  const { data: branches = [], isFetched: branchesFetched } = useQuery({
    queryKey: ["business-branches", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyBranches() as Promise<Branch[]>,
  });
  const savedItems = useMemo(() => {
    const niche = (me as { niche_details?: { saved_items?: SavedItem[] } } | null)?.niche_details;
    return Array.isArray(niche?.saved_items) ? niche.saved_items : [];
  }, [me]);

  const fallbackBranch = props.businessPickupAddress
    ? { id: "default", branch_name: "כתובת העסק", full_address: props.businessPickupAddress, city: null, is_default: true }
    : null;
  const branchOptions = branches.length ? branches : fallbackBranch ? [fallbackBranch] : [];
  const [branchId, setBranchId] = useState("");
  const selectedBranch = branchOptions.find((b) => b.id === (branchId || branchOptions.find((x) => x.is_default)?.id || branchOptions[0]?.id));
  const activeBranchId = selectedBranch?.id ?? "";

  const genericKinds = useMemo(() => {
    const fromCategory = props.deliveryTypes.map((t) => t.label);
    return Array.from(new Set([...GENERIC_KINDS, ...fromCategory]));
  }, [props.deliveryTypes]);

  const large = /10|20|רכב/.test(props.deliveryType);
  const vehicleLabel = canonicalizeVehicleValue(props.vehicle) === "car" || large ? "רכב" : "קטנוע";

  const distanceLabel = props.route ? `${props.route.distanceKm.toFixed(1)} ק״מ` : "—";
  const durationLabel = props.route ? `${props.route.durationMin} דק׳` : "—";
  const priceLabel = props.suggestedPrice == null ? "—" : `₪${Math.round(props.suggestedPrice)}`;

  const selectBranch = async (id: string) => {
    setBranchId(id);
    const b = branchOptions.find((x) => x.id === id);
    const addr = [b?.full_address, b?.city].filter(Boolean).join(", ");
    if (!addr) return;
    props.onUseBusinessAddress();
    props.onPickupText(addr);
    const place = await geocodeClient(addr);
    if (place) props.onPickupSelect(place);
    if (b?.phone) props.onPickupContactPhone(b.phone);
  };

  const didSelectBranch = useRef(false);
  useEffect(() => {
    if (didSelectBranch.current) return;
    if (me?.id && !branchesFetched) return;
    if (!branchOptions.length) return;
    const id = branchOptions.find((x) => x.is_default)?.id || branchOptions[0]?.id;
    if (!id) return;
    didSelectBranch.current = true;
    void selectBranch(id);
  }, [branchOptions, branchesFetched, me?.id]);

  const review = () => {
    const routeOk = props.onValidateRoute();
    const detailsOk = props.onValidateDetails();
    if (!routeOk || !detailsOk) return;
    if (props.timing === "scheduled" && props.scheduledAt && new Date(props.scheduledAt).getTime() < Date.now()) {
      toast.error("בחרו תאריך ושעה עתידיים");
      return;
    }
    setConfirm(true);
  };

  const timingChoice = props.timing === "scheduled" ? "תזמון" : "עכשיו";

  return (
    <div className={"order-page " + (mobileExpanded ? "order-expanded" : "order-intro")}>
      <div className="order-split">
        <form
          className="order-fields"
          onSubmit={(e) => {
            e.preventDefault();
            review();
          }}
        >
          <div className="order-form-title">
            <h1>הזמנה חדשה</h1>
            <Package size={20} />
          </div>

          <Panel className="pickup-form-card">
            <h2>
              <span className="step-number">1</span>
              איסוף
            </h2>
            <div className="pickup-selected">
              <MapPin size={23} />
              <div data-field="pickup">
                {branchOptions.length > 0 ? (
                  <SelectBox
                    value={activeBranchId}
                    onChange={(v) => void selectBranch(v)}
                    label="סניף איסוף"
                    options={branchOptions.map((b) => ({ value: b.id, label: b.branch_name }))}
                  />
                ) : (
                  <AddressAutocomplete
                    variant="plain"
                    label="כתובת איסוף"
                    placeholder="חפש כתובת איסוף"
                    value={props.pickupText}
                    onChange={props.onPickupText}
                    onSelect={props.onPickupSelect}
                    accent="green"
                    error={props.pickupError}
                  />
                )}
                <p>
                  {selectedBranch?.full_address || props.pickup?.address || props.pickupText || props.businessPickupAddress || "בחרו נקודת איסוף"}
                  {props.pickupError ? ` · ${props.pickupError}` : ""}
                </p>
                {props.businessPickupAddress && branchOptions.length > 0 ? (
                  <button type="button" className="link" onClick={props.onChangePickupAddress}>
                    כתובת איסוף אחרת
                  </button>
                ) : null}
              </div>
              <Check size={21} />
            </div>
            {!props.useBusinessAddress && (
              <div style={{ marginTop: 12 }} className="field">
                <AddressAutocomplete
                  variant="plain"
                  label="כתובת איסוף"
                  placeholder="חפש כתובת איסוף"
                  value={props.pickupText}
                  onChange={props.onPickupText}
                  onSelect={props.onPickupSelect}
                  accent="green"
                  error={props.pickupError}
                />
              </div>
            )}
          </Panel>

          <div className="mobile-order-start">
            <h2>לאן תרצה לשלוח היום?</h2>
            <label className="field" data-field="dropoff">
              כתובת מסירה
              <input
                value={props.dropoffText}
                onChange={(e) => props.onDropoffText(e.target.value)}
                placeholder="הזן כתובת מסירה"
              />
            </label>
            <button type="button" className="btn primary full" onClick={() => setMobileExpanded(true)}>
              המשך להזמנה <ArrowLeft size={17} />
            </button>
          </div>

          <div className="expanded-form-content">
            <Panel>
              <h2>
                <span className="step-number">2</span>
                פרטי הלקוח והמסירה
              </h2>
              <div className="field-grid">
                <label className="field">
                  שם הלקוח
                  <input required value={props.recipientName} onChange={(e) => props.onRecipientName(e.target.value)} placeholder="שם מלא" autoComplete="name" />
                </label>
                <label className="field">
                  טלפון
                  <input required type="tel" value={props.recipientPhone} onChange={(e) => props.onRecipientPhone(e.target.value)} placeholder="050-000-0000" autoComplete="tel" dir="ltr" />
                </label>
              </div>
              <div className="address-grid" data-field="dropoff">
                <div className="field">
                  כתובת המסירה
                  <div className="addr-wrap">
                    <AddressAutocomplete
                      variant="plain"
                      label="כתובת המסירה"
                      placeholder="רחוב ומספר בית"
                      value={props.dropoffText}
                      onChange={props.onDropoffText}
                      onSelect={(p) => {
                        props.onDropoffSelect(p);
                        if (!props.dropoffCity) props.onDropoffCity(cityFromAddress(p.address));
                      }}
                      accent="red"
                      error={props.dropoffError}
                    />
                    <Search className="addr-search" size={18} aria-hidden />
                  </div>
                </div>
                <label className="field">
                  עיר
                  <input required value={props.dropoffCity} onChange={(e) => props.onDropoffCity(e.target.value)} autoComplete="address-level2" />
                </label>
              </div>
              <div className="four-cols compact-fields">
                <label className="field">
                  כניסה
                  <input value={props.dropoffEntry} onChange={(e) => props.onDropoffEntry(e.target.value)} placeholder="—" />
                </label>
                <label className="field">
                  קומה
                  <input value={props.dropoffFloor} onChange={(e) => props.onDropoffFloor(e.target.value)} placeholder="—" />
                </label>
                <label className="field">
                  דירה
                  <input value={props.dropoffApt} onChange={(e) => props.onDropoffApt(e.target.value)} placeholder="—" />
                </label>
                <label className="field">
                  קוד כניסה
                  <input value={props.dropoffCode} onChange={(e) => props.onDropoffCode(e.target.value)} placeholder="—" />
                </label>
              </div>
              <ExtraStopsEditor stops={props.extraStops} setStops={props.setExtraStops} />
            </Panel>

            <Panel>
              <h2>
                <span className="step-number">3</span>
                פרטי המשלוח
              </h2>
              <p className="hint">בחרו אפשרות משלוח מתאימה, או פריט ששמרתם לעסק.</p>
              <h3 className="field-title">אפשרויות גנריות</h3>
              <Choices className="item-choices" label="סוג משלוח" value={props.deliveryType} onChange={props.onDeliveryType} options={genericKinds} />
              {savedItems.length > 0 && (
                <>
                  <h3 className="field-title">פריטים שמורים לעסק</h3>
                  <Choices
                    className="item-choices"
                    label="פריט שמור"
                    value={props.deliveryType}
                    onChange={(v) => {
                      const i = savedItems.find((x) => x.name === v);
                      props.onDeliveryType(v);
                      if (i?.quantity) props.onQuantity(i.quantity);
                      if (i?.weight) props.onPackageWeight(i.weight);
                      if (i?.vehicle) props.onVehicle(i.vehicle === "רכב" ? "car" : "scooter");
                    }}
                    options={savedItems.map((i) => i.name)}
                  />
                </>
              )}
              <button type="button" className="link add-item" onClick={() => setCustom(true)}>
                <Plus size={16} />
                הוסף פריט מותאם
              </button>
              <div className="vehicle-quantity">
                <span>
                  {vehicleLabel === "רכב" ? <Car size={20} /> : <Bike size={20} />}
                  רכב מתאים: <strong>{vehicleLabel}</strong>
                </span>
                <div className="quantity-stepper">
                  <button type="button" aria-label="הפחת כמות" disabled={props.quantity <= 1} onClick={() => props.onQuantity(props.quantity - 1)}>
                    <Minus size={16} />
                  </button>
                  <output aria-label="כמות פריטים">{props.quantity}</output>
                  <button type="button" aria-label="הוסף כמות" disabled={props.quantity >= 20} onClick={() => props.onQuantity(props.quantity + 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </Panel>

            <Panel>
              <h2>
                <span className="step-number">4</span>
                מתי לבצע
              </h2>
              <Choices
                label="מועד משלוח"
                value={timingChoice}
                onChange={(v) => props.onTiming(v === "תזמון" ? "scheduled" : "now")}
                options={["עכשיו", "תזמון"]}
              />
              {props.timing === "scheduled" && (
                <div className="field-grid" data-field="scheduledAt">
                  <label className="field">
                    תאריך
                    <input
                      required
                      type="date"
                      value={props.scheduledAt.slice(0, 10)}
                      onChange={(e) => props.onScheduledAt(`${e.target.value}T${props.scheduledAt.slice(11, 16) || "12:00"}`)}
                    />
                  </label>
                  <label className="field">
                    שעת איסוף
                    <input
                      required
                      type="time"
                      value={props.scheduledAt.slice(11, 16)}
                      onChange={(e) => props.onScheduledAt(`${props.scheduledAt.slice(0, 10) || new Date().toISOString().slice(0, 10)}T${e.target.value}`)}
                    />
                  </label>
                </div>
              )}
            </Panel>

            <Panel>
              <h2>
                <span className="step-number">5</span>
                תשלום
              </h2>
              <Choices label="תשלום" value={props.customerPayment} onChange={props.onCustomerPayment} options={PAY_OPTIONS} />
              {props.customerPayment === "מזומן" && (
                <label className="field">
                  סכום לגבייה מהלקוח
                  <span className="cash-input">
                    <b>₪</b>
                    <input required type="number" min="0" step="0.01" value={props.cashCollect} onChange={(e) => props.onCashCollect(e.target.value)} placeholder="32" />
                  </span>
                  <span className="hint">הסכום מגיע לשליח ומסייע להזמנה</span>
                </label>
              )}
            </Panel>

            <Panel>
              <h2>
                <span className="step-number">6</span>
                הערות למשלוח
              </h2>
              <textarea className="order-note" aria-label="הערות לשליח" value={props.dropoffNotes} onChange={(e) => props.onDropoffNotes(e.target.value)} placeholder="הזן הערות לשליח (אופציונלי)" />
            </Panel>

            <Panel className="order-summary-bar">
              <div className="three-cols">
                <div>
                  <MapPin />
                  <span>מרחק</span>
                  <strong>{distanceLabel}</strong>
                </div>
                <div>
                  <Clock3 />
                  <span>זמן הגעה</span>
                  <strong>{durationLabel}</strong>
                </div>
                <div>
                  <Tag />
                  <span>סכום משלוח</span>
                  <strong>{priceLabel}</strong>
                </div>
              </div>
              <button type="submit" className="btn primary full find-courier" disabled={props.pending}>
                {props.pending ? <Loader2 className="size-4 animate-spin" /> : <Send size={22} />}
                {props.pricingModel === "quote_request" ? "בקש הצעות משליחים" : "מצא שליח"}
              </button>
            </Panel>
          </div>
        </form>

        <div className="order-map">
          <OrderMap
            pickup={props.pickup}
            dropoff={props.dropoff}
            waypoints={props.waypoints}
            onRoute={props.onRoute}
            pickupLabel={selectedBranch?.branch_name ? `איסוף · ${selectedBranch.branch_name}` : "איסוף"}
            dropoffLabel={props.dropoffText ? `מסירה · ${shortAddress(props.dropoffText)}` : "מסירה"}
            className="goi-map"
          />
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="המשלוח מוכן לצאת" description="בדקו את הפרטים לפני יצירת המשלוח.">
        <div className="confirmation-route">
          <div>
            <span className="round-icon">
              <Package size={23} />
            </span>
            <p>
              איסוף
              <strong>{props.pickup?.address || props.pickupText}</strong>
            </p>
          </div>
          <div>
            <span className="round-icon">
              <MapPin />
            </span>
            <p>
              מסירה
              <strong>
                {props.dropoffText}
                {props.dropoffCity ? `, ${props.dropoffCity}` : ""}
              </strong>
            </p>
          </div>
        </div>
        <dl className="detail-dl">
          <dt>שם הלקוח</dt>
          <dd>{props.recipientName || "—"}</dd>
          <dt>טלפון</dt>
          <dd dir="ltr">{props.recipientPhone || "—"}</dd>
          <dt>תכולה</dt>
          <dd>
            {props.quantity} × {props.deliveryType}
          </dd>
          <dt>מתי</dt>
          <dd>{props.timing === "scheduled" ? props.scheduledAt.replace("T", " ") : readyLabel}</dd>
          <dt>מחיר</dt>
          <dd>{priceLabel}</dd>
        </dl>
        <button type="button" className="btn primary full" onClick={() => { setConfirm(false); props.onSubmit(); }} disabled={props.pending}>
          {props.pending ? <Loader2 className="size-4 animate-spin" /> : <Send size={17} />}
          אישור ויצירת משלוח
        </button>
      </Modal>

      <Modal open={custom} onClose={() => setCustom(false)} title="פריט מותאם למשלוח">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customName.trim()) props.onDeliveryType(customName.trim());
            setCustom(false);
            setCustomName("");
          }}
        >
          <label className="field">
            שם הפריט
            <input required value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="למשל: עוגת יום הולדת" />
          </label>
          <div className="save-bar">
            <button type="submit" className="btn primary">
              שמירה
            </button>
          </div>
        </form>
      </Modal>
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
    <div style={{ marginTop: 8 }}>
      {stops.map((s, i) => (
        <div key={i} className="panel" style={{ marginBottom: 8 }}>
          <div className="panel-title">
            <h2>יעד נוסף {i + 2}</h2>
            <button type="button" className="link" onClick={() => setStops((p) => p.filter((_, idx) => idx !== i))}>
              הסר
            </button>
          </div>
          <div className="field">
            {`כתובת יעד ${i + 2}`}
          <AddressAutocomplete
            variant="plain"
            label={`כתובת יעד ${i + 2}`}
            placeholder="כתובת"
            value={s.text}
            onChange={(v) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, text: v, place: v ? row.place : null } : row)))}
            onSelect={(p) => setStops((prev) => prev.map((row, idx) => (idx === i ? { ...row, place: p, text: p.address } : row)))}
            accent="red"
          />
          </div>
          <div className="field-grid">
            <label className="field">
              שם
              <input value={s.name} onChange={(e) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} />
            </label>
            <label className="field">
              טלפון
              <input value={s.phone} onChange={(e) => setStops((p) => p.map((row, idx) => (idx === i ? { ...row, phone: e.target.value } : row)))} dir="ltr" />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="link add-item"
        onClick={() => setStops((p) => [...p, { place: null, text: "", name: "", phone: "" }])}
      >
        <Plus size={16} />
        {stops.length === 0 ? "הוסף יעד נוסף לאותו שליח" : "הוסף עוד יעד"}
      </button>
    </div>
  );
}
