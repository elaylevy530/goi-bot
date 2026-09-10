import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Car,
  Check,
  Clock3,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Tag,
  User,
  Utensils,
} from "lucide-react";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { OrderMap } from "@/components/customer/OrderMap";
import { Choices, Modal, Panel, SelectBox } from "@/components/business/goi/GoiUi";
import { useMyBusiness } from "@/components/BusinessShell";
import type { Timing } from "@/config/businessCategories";
import { nestListMyBranches } from "@/lib/nest-domain";
import { canonicalizeVehicleValue } from "@/lib/courier-vehicles";
import { haversineKm, type DrivingRoute, type LatLng } from "@/lib/google-driving-route";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import packBagImg from "@/assets/order/pack-bag.png";
import packBagsImg from "@/assets/order/pack-bags.png";
import packBoxImg from "@/assets/order/pack-box.png";

export type ExtraStop = { place: SelectedPlace | null; text: string; name: string; phone: string };

type DeliveryType = { key: string; label: string };
type PricingModel = "fixed_price" | "distance_based" | "city_radius" | "quote_request";

const GENERIC_KINDS = ["מעטפה", "שקית", "חבילה עד 5 קילו", "חבילה עד 10 קילו", "עד 20 קילו"];
const PAY_OPTIONS = ["כרטיס אשראי", "יתרה", "מזומן"];
const READY_MINS = [15, 30, 45, 60] as const;

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

type PackVisual = "bag" | "bags" | "box";
type PackCard = { key: string; label: string; visual: PackVisual; item?: SavedItem };

function looksLikeFood(text: string) {
  return /פיצה|מסעד|אוכל|מאפה|קפה|בייקרי|מזון|קונדיטור|bakery|pizza|food/.test(text);
}

function packVisual(name: string, qty?: number): PackVisual {
  const n = name.toLowerCase();
  if (/מארז|פיצה|קופס|גדול|box|pizza|עוג/.test(n) || (qty != null && qty >= 4)) return "box";
  if (/2-3|שקיות|bags/.test(n) || qty === 2 || qty === 3) return "bags";
  if (/שקית|מעטפה|bag/.test(n) || qty === 1) return "bag";
  return qty && qty >= 2 ? "bags" : "bag";
}

function buildPackCards(saved: SavedItem[], deliveryTypes: DeliveryType[]): PackCard[] {
  const cards: PackCard[] = saved.slice(0, 3).map((item) => ({
    key: item.id || item.name,
    label: item.name,
    visual: packVisual(item.name, item.quantity),
    item,
  }));
  const used = new Set(cards.map((c) => c.label));
  for (const t of deliveryTypes) {
    if (cards.length >= 3) break;
    if (used.has(t.label)) continue;
    used.add(t.label);
    cards.push({ key: t.key, label: t.label, visual: packVisual(t.label) });
  }
  for (const g of GENERIC_KINDS) {
    if (cards.length >= 3) break;
    if (used.has(g)) continue;
    used.add(g);
    cards.push({ key: g, label: g, visual: packVisual(g) });
  }
  const rank = { box: 0, bags: 1, bag: 2 };
  return cards.sort((a, b) => rank[a.visual] - rank[b.visual]);
}

function PackArt({ visual }: { visual: PackVisual }) {
  return <img className="pack-photo" src={visual === "box" ? packBoxImg : visual === "bags" ? packBagsImg : packBagImg} alt="" />;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function HebrewClockFace({ hour, minute }: { hour: number; minute: number }) {
  const hDeg = ((hour % 12) + minute / 60) * 30;
  const mDeg = minute * 6;
  return (
    <svg className="he-clock-face" viewBox="0 0 160 160" aria-hidden>
      <circle className="he-clock-ring" cx="80" cy="80" r="74" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <text key={i} className="he-clock-num" x={80 + Math.cos(a) * 56} y={80 + Math.sin(a) * 56} textAnchor="middle" dominantBaseline="middle">
            {i + 1}
          </text>
        );
      })}
      <line className="he-clock-hour" x1="80" y1="80" x2="80" y2="42" transform={`rotate(${hDeg} 80 80)`} />
      <line className="he-clock-min" x1="80" y1="80" x2="80" y2="28" transform={`rotate(${mDeg} 80 80)`} />
      <circle className="he-clock-hub" cx="80" cy="80" r="5" />
    </svg>
  );
}

function HebrewTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const raw = value && /^\d{2}:\d{2}$/.test(value) ? value : "12:00";
  const hour = Number(raw.slice(0, 2));
  const minute = Number(raw.slice(3, 5));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  useEffect(() => {
    if (!open) return;
    hourRef.current?.querySelector("button.on")?.scrollIntoView({ block: "center" });
    minRef.current?.querySelector("button.on")?.scrollIntoView({ block: "center" });
  }, [open, hour, minute]);

  return (
    <>
      <button type="button" className="he-clock-trigger" onClick={() => setOpen(true)}>
        <Clock3 size={18} />
        <span>שעת איסוף</span>
        <b dir="ltr">{raw}</b>
      </button>
      {open &&
        createPortal(
          <div
            className="he-clock-overlay"
            role="dialog"
            aria-label="בחירת שעה"
            onClick={() => setOpen(false)}
          >
            <div className="he-clock-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
              <h3>בחרו שעת איסוף</h3>
              <HebrewClockFace hour={hour} minute={minute} />
              <p className="he-clock-digital" dir="ltr">
                {raw}
              </p>
              <div className="he-clock-cols">
                <div>
                  <small>שעה</small>
                  <div className="he-clock-list" ref={hourRef}>
                    {hours.map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        className={hr === hour ? "on" : undefined}
                        onClick={() => onChange(`${pad2(hr)}:${pad2(minute)}`)}
                      >
                        {pad2(hr)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <small>דקה</small>
                  <div className="he-clock-list" ref={minRef}>
                    {minutes.map((min) => (
                      <button
                        key={min}
                        type="button"
                        className={min === minute ? "on" : undefined}
                        onClick={() => onChange(`${pad2(hour)}:${pad2(min)}`)}
                      >
                        {pad2(min)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" className="btn primary full" onClick={() => setOpen(false)}>
                אישור
              </button>
            </div>
          </div>,
          document.querySelector(".goi-biz") ?? document.body,
        )}
    </>
  );
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
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [showApt, setShowApt] = useState(false);
  const [changePickup, setChangePickup] = useState(false);
  const [sheetDay, setSheetDay] = useState<"today" | "other">("today");
  const [readyMins, setReadyMins] = useState<(typeof READY_MINS)[number]>(15);

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
  const packCards = useMemo(
    () => buildPackCards(savedItems, props.deliveryTypes),
    [savedItems, props.deliveryTypes],
  );
  const businessName = me?.business_name || me?.name || selectedBranch?.branch_name || "העסק";
  const originAddress = selectedBranch?.full_address || props.pickup?.address || props.pickupText || props.businessPickupAddress || "";
  const foodBiz = looksLikeFood(
    `${businessName} ${(me as { business_niche?: string } | null)?.business_niche || ""} ${(me as { business_category?: string } | null)?.business_category || ""} ${packCards.map((c) => c.label).join(" ")}`,
  );
  const computedKm =
    props.route?.distanceKm ??
    (props.pickup && props.dropoff
      ? haversineKm({ lat: props.pickup.lat, lng: props.pickup.lng }, { lat: props.dropoff.lat, lng: props.dropoff.lng })
      : null);
  const computedMins =
    props.route?.durationMin ?? (computedKm != null ? Math.max(1, Math.round(computedKm * 3)) : null);
  const etaRange =
    computedMins != null ? `${Math.max(1, computedMins - 2)}-${computedMins + 2} דק׳` : "—";
  const sheetTime =
    props.timing === "scheduled"
      ? props.scheduledAt.slice(11, 16) || props.todayTime || props.pickupReadyTime
      : props.pickupReadyTime || props.todayTime;

  const large = /10|20|רכב/.test(props.deliveryType);
  const vehicleLabel = canonicalizeVehicleValue(props.vehicle) === "car" || large ? "רכב" : "קטנוע";

  const distanceLabel = computedKm != null ? `${computedKm.toFixed(1)} ק״מ` : "—";
  const durationLabel = computedMins != null ? `${computedMins} דק׳` : "—";
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

  const applyPack = (card: PackCard) => {
    props.onDeliveryType(card.label);
    if (card.item?.quantity) props.onQuantity(card.item.quantity);
    if (card.item?.weight) props.onPackageWeight(card.item.weight);
    if (card.item?.vehicle) props.onVehicle(card.item.vehicle);
  };

  const applyReadyMins = (mins: (typeof READY_MINS)[number]) => {
    setReadyMins(mins);
    props.onPickupReadyNow(false);
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    props.onPickupReadyTime(`${hh}:${mm}`);
  };

  const setSheetTime = (value: string) => {
    if (props.timing === "now") {
      props.onPickupReadyTime(value);
      return;
    }
    props.onTodayTime(value);
    const date = sheetDay === "other" && props.scheduledAt.slice(0, 10) ? props.scheduledAt.slice(0, 10) : todayStamp();
    props.onScheduledAt(`${date}T${value}`);
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

  useEffect(() => {
    if (!packCards.length) return;
    if (packCards.some((c) => c.label === props.deliveryType)) return;
    applyPack(packCards[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packCards]);

  const review = () => {
    const routeOk = props.onValidateRoute();
    const detailsOk = props.onValidateDetails();
    if (!routeOk || !detailsOk) return;
    if (props.timing === "scheduled" && props.scheduledAt && new Date(props.scheduledAt).getTime() < Date.now()) {
      toast.error("בחרו תאריך ושעה עתידיים");
      return;
    }
    props.onSubmit();
  };

  const nextFromMobileDetails = () => {
    if (!props.dropoff) {
      toast.error("יש לבחור כתובת מסירה מהרשימה");
      return;
    }
    if (!props.recipientName.trim()) {
      toast.error("יש להזין שם לקוח");
      return;
    }
    if (props.recipientPhone.replace(/\D/g, "").length < 9) {
      toast.error("יש להזין מספר טלפון תקין");
      return;
    }
    setMobileStep(1);
  };

  const timingChoice = props.timing === "scheduled" ? "תזמון" : "עכשיו";

  return (
    <div className={`order-page ${mobileExpanded ? "order-expanded" : "order-intro"} mobile-order-step-${mobileStep}`}>
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
            pickupLabel={cityFromAddress(props.pickup?.address || props.pickupText || originAddress) || "איסוף"}
            dropoffLabel={props.dropoffText ? cityFromAddress(props.dropoffText) || shortAddress(props.dropoffText) : "מסירה"}
            className="goi-map"
          />
          <div className="mobile-map-chrome">
            {!mobileExpanded && (
              <button
                type="button"
                className="mobile-new-cta"
                onClick={() => {
                  if (props.timing === "now") applyReadyMins(readyMins);
                  setMobileStep(0);
                  setMobileExpanded(true);
                }}
              >
                <Plus size={22} strokeWidth={2.4} />
                <span>
                  <strong>משלוח חדש</strong>
                  <small>מיידי או מתוזמן</small>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <form
        className="mobile-order-sheet"
        onSubmit={(e) => {
          e.preventDefault();
          review();
        }}
      >
        <button type="button" className="mobile-sheet-handle" aria-label="סגור" onClick={() => setMobileExpanded(false)} />
        <div className="mobile-sheet-scroll">
          <div className="mobile-step-head">
            <div className="mobile-step-copy">
              <small>שלב {mobileStep + 1} מתוך 2</small>
              <strong>{["פרטי המשלוח", "מועד, תשלום וסיכום"][mobileStep]}</strong>
            </div>
            <div className="mobile-step-dots" aria-hidden="true">
              {[0, 1].map((step) => (
                <span key={step} className={step <= mobileStep ? "on" : undefined} />
              ))}
            </div>
          </div>
          {mobileStep === 0 && (
            <section className="mobile-step-panel">
          <div className="mobile-pickup-row">
            <span className="mobile-store-icon">{foodBiz ? <Utensils size={18} /> : <Package size={18} />}</span>
            <div>
              <strong>{businessName}</strong>
              <p>{shortAddress(originAddress) || "כתובת איסוף"}</p>
            </div>
            <button type="button" className="link" onClick={() => setChangePickup((v) => !v)}>
              שינוי
            </button>
          </div>
          {changePickup && (
            <div className="mobile-pickup-edit">
              {branchOptions.length > 1 ? (
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
            </div>
          )}

          <div className="mobile-drop-card" data-field="dropoff">
            <MapPin size={18} />
            <div>
              <small>כתובת מסירה</small>
              <AddressAutocomplete
                variant="plain"
                label="כתובת מסירה"
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
            </div>
          </div>
          <button type="button" className="mobile-apt-toggle" onClick={() => setShowApt((v) => !v)}>
            + כניסה, קומה ודירה (אופציונלי)
          </button>
          {showApt && (
            <div className="mobile-apt-grid">
              <label className="field">
                כניסה
                <input value={props.dropoffEntry} onChange={(e) => props.onDropoffEntry(e.target.value)} />
              </label>
              <label className="field">
                קומה
                <input value={props.dropoffFloor} onChange={(e) => props.onDropoffFloor(e.target.value)} />
              </label>
              <label className="field">
                דירה
                <input value={props.dropoffApt} onChange={(e) => props.onDropoffApt(e.target.value)} />
              </label>
            </div>
          )}
            </section>
          )}

          {mobileStep === 0 && (
            <section className="mobile-step-panel">
          <div className="mobile-contact-grid">
            <label className="field">
              <span>
                <User size={14} /> שם הלקוח
              </span>
              <input required value={props.recipientName} onChange={(e) => props.onRecipientName(e.target.value)} placeholder="יוסי לוי" autoComplete="name" />
            </label>
            <label className="field">
              <span>
                <Phone size={14} /> טלפון
              </span>
              <input
                required
                type="tel"
                value={props.recipientPhone}
                onChange={(e) => {
                  const value = e.target.value;
                  props.onRecipientPhone(value);
                }}
                placeholder="050-1234567"
                dir="ltr"
                autoComplete="tel"
              />
            </label>
          </div>

          <label className="field mobile-notes">
            <span>
              <MessageSquare size={14} /> הערות לשליח (אופציונלי)
            </span>
            <input value={props.dropoffNotes} onChange={(e) => props.onDropoffNotes(e.target.value)} placeholder="להתקשר כשמגיעים" />
          </label>
            </section>
          )}

          {mobileStep === 0 && (
            <section className="mobile-step-panel">
          <h3 className="mobile-section-title">מה שולחים?</h3>
          <div className="pack-grid">
            {packCards.map((card) => {
              const chosen = props.deliveryType === card.label;
              return (
                <button
                  key={card.key}
                  type="button"
                  className={cn("pack-card", chosen && "chosen")}
                  onClick={() => {
                    applyPack(card);
                    window.setTimeout(nextFromMobileDetails, 180);
                  }}
                >
                  {chosen && (
                    <span className="pack-check">
                      <Check size={12} />
                    </span>
                  )}
                  <PackArt visual={card.visual} />
                  <strong>{card.label}</strong>
                </button>
              );
            })}
          </div>
              <div className="mobile-step-actions">
                <button type="button" className="btn primary full" onClick={nextFromMobileDetails}>המשך למועד ותשלום</button>
              </div>
            </section>
          )}

          {mobileStep === 1 && (
            <section className="mobile-step-panel">
          <h3 className="mobile-section-title">מתי לאסוף?</h3>
          <div className="mobile-seg">
            <button
              type="button"
              className={props.timing === "now" ? "on" : undefined}
              onClick={() => {
                props.onTiming("now");
                applyReadyMins(readyMins);
              }}
            >
              עכשיו
            </button>
            <button
              type="button"
              className={props.timing !== "now" ? "on" : undefined}
              onClick={() => {
                props.onTiming("scheduled");
                props.onPickupReadyNow(false);
                const t = sheetTime || "19:30";
                props.onScheduledAt(`${todayStamp()}T${t}`);
              }}
            >
              לתזמן
            </button>
          </div>
          {props.timing === "now" ? (
            <div className="mobile-ready">
              <p>תוך כמה זמן ההזמנה מוכנה</p>
              <div className="mobile-ready-mins">
                {READY_MINS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={readyMins === mins ? "on" : undefined}
                    onClick={() => {
                      applyReadyMins(mins);
                    }}
                  >
                    {mins} דק׳
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mobile-seg">
                <button type="button" className={sheetDay === "today" ? "on" : undefined} onClick={() => setSheetDay("today")}>
                  היום
                </button>
                <button type="button" className={sheetDay === "other" ? "on" : undefined} onClick={() => setSheetDay("other")}>
                  <CalendarDays size={15} /> יום אחר
                </button>
              </div>
              {sheetDay === "other" && (
                <label className="field">
                  תאריך
                  <input
                    type="date"
                    value={props.scheduledAt.slice(0, 10) || todayStamp()}
                    onChange={(e) => props.onScheduledAt(`${e.target.value}T${sheetTime || "12:00"}`)}
                  />
                </label>
              )}
              <HebrewTimePicker value={sheetTime || "12:00"} onChange={setSheetTime} />
            </>
          )}
              <div className="mobile-step-actions">
                <button type="button" className="btn outline" onClick={() => setMobileStep(0)}>חזרה</button>
              </div>
            </section>
          )}

          {mobileStep === 1 && (
            <section className="mobile-step-panel">
          <div className="mobile-cash-row">
            <span>
              <strong>תשלום מזומן</strong>
              <small>תשלום יגבה מהלקוח</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={props.customerPayment === "מזומן"}
              className={cn("mobile-switch", props.customerPayment === "מזומן" && "on")}
              onClick={() => props.onCustomerPayment(props.customerPayment === "מזומן" ? "כרטיס אשראי" : "מזומן")}
            />
          </div>
          {props.customerPayment === "מזומן" && (
            <label className="field">
              סכום לגבייה
              <span className="cash-input">
                <b>₪</b>
                <input required type="number" min="0" step="0.01" value={props.cashCollect} onChange={(e) => props.onCashCollect(e.target.value)} placeholder="32" />
              </span>
            </label>
          )}

          <div className="mobile-quote-card">
            <div className="mobile-quote">
              <div>
                <small>מחיר משלוח</small>
                <strong>{priceLabel.replace("₪", "")} ₪</strong>
              </div>
              <div>
                <small>מרחק</small>
                <strong>{distanceLabel}</strong>
              </div>
              <div>
                <small>הגעת שליח</small>
                <strong>{etaRange}</strong>
              </div>
            </div>
            <button type="submit" className="btn primary full find-courier" disabled={props.pending}>
              {props.pending ? <Loader2 className="size-4 animate-spin" /> : null}
              מצא שליח
            </button>
            <p className="mobile-quote-note">
              <Lock size={12} />
              מחיר משוער · ללא התחייבות עד האישור
            </p>
          </div>
            </section>
          )}
        </div>
      </form>

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
