import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { nestCreateJob, nestUpdateJob } from "@/lib/nest-jobs";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { OrderMap } from "@/components/customer/OrderMap";
import { PaypalCheckoutDialog } from "@/components/PaypalCheckoutDialog";
import { notifyCouriersOfQuoteRequest } from "@/lib/whatsapp-quotes.functions";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { geocodeJob } from "@/lib/geocode-job.functions";
import { geocodeAddresses } from "@/lib/geocode.functions";
import {
  getCategory,
  getDeliveryTypesForCategory,
  TIMING_LABELS,
  type Timing,
} from "@/config/businessCategories";


import { getTileVisual, TONE_STYLES } from "@/config/deliveryTypeVisuals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, Radar, Send, ArrowRight, User, Phone, StickyNote,
  Truck, Plus, Menu, Bike, Car, Building2, AlertCircle,
} from "lucide-react";
import timingNowImg from "@/assets/timing-now.png";
import timingHourImg from "@/assets/timing-hour.png";
import timingTodayImg from "@/assets/timing-today.png";
import timingScheduledImg from "@/assets/timing-scheduled.png";

const TIMING_ICONS: Record<Timing, string> = {
  now: timingNowImg,
  within_hour: timingHourImg,
  today: timingTodayImg,
  scheduled: timingScheduledImg,
};

type ExtraStop = { place: SelectedPlace | null; text: string; name: string; phone: string };

type FieldKey =
  | "pickup"
  | "dropoff"
  | "pickupContactName"
  | "pickupContactPhone"
  | "pickupReadyTime"
  | "scheduledAt"
  | "offeredPrice"
  | "basePrice"
  | "pricePerKm";

type FieldErrors = Partial<Record<FieldKey, string>>;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 px-0.5 text-[11px] font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

const fieldInputClass = (hasError: boolean) =>
  cn(
    "w-full rounded-xl border bg-muted pr-9 pl-3 py-2.5 text-sm text-text-strong focus:outline-none focus:ring-2",
    hasError
      ? "border-destructive/50 focus:ring-destructive/30"
      : "border-transparent focus:ring-primary/30",
  );

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2 px-0.5">
      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wide">
        {children}
      </label>
      {hint ? <span className="text-[11px] text-text-muted/80">{hint}</span> : null}
    </div>
  );
}

export const Route = createFileRoute("/business/new-delivery")({
  head: () => ({ meta: [{ title: "משלוח חדש — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    timing: typeof s.timing === "string" ? (s.timing as string) : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  component: NewDeliveryPage,
});

function NewDeliveryPage() {
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const search = Route.useSearch();
  const dispatch = useServerFn(dispatchJobToCouriers);
  const notify = useServerFn(notifyCouriersOfQuoteRequest);
  const geocode = useServerFn(geocodeJob);
  const geocodeAddrs = useServerFn(geocodeAddresses);

  const categoryKey = (me as { business_category?: string } | null)?.business_category ?? null;
  const category = useMemo(() => getCategory(categoryKey), [categoryKey]);
  const deliveryTypes = useMemo(() => getDeliveryTypesForCategory(categoryKey), [categoryKey]);

  const timings = category.timings;


  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState(search.to ?? "");
  const [extraStops, setExtraStops] = useState<ExtraStop[]>([]);
  const validExtraStops = useMemo(() => extraStops.filter((s) => s.place && s.text.trim()), [extraStops]);

  const [deliveryType, setDeliveryType] = useState<string>(deliveryTypes[0]?.label ?? "מוצר");
  useEffect(() => { setDeliveryType(deliveryTypes[0]?.label ?? "מוצר"); }, [deliveryTypes]);

  const [timing, setTiming] = useState<Timing>((search.timing as Timing) ?? timings[0] ?? "now");
  useEffect(() => { if (!timings.includes(timing)) setTiming(timings[0]); }, [timings, timing]);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [attributes, setAttributes] = useState<Set<string>>(new Set());
  const toggleAttr = (k: string) => {
    const n = new Set(attributes);
    if (n.has(k)) n.delete(k); else n.add(k);
    setAttributes(n);
  };

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Pickup contact + instructions — prefilled from business profile
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [pickupReadyNow, setPickupReadyNow] = useState(true);
  const [pickupReadyTime, setPickupReadyTime] = useState("");
  const [pickupPrefilled, setPickupPrefilled] = useState(false);
  // Use business's saved pickup address by default; user can toggle off to enter another
  const [useBusinessAddress, setUseBusinessAddress] = useState(true);
  const businessPickupAddress = ((me as { pickup_address?: string | null } | null)?.pickup_address ?? "").trim();
  useEffect(() => {
    if (!me || pickupPrefilled) return;
    const m = me as {
      pickup_address?: string | null;
      pickup_contact_name?: string | null;
      pickup_contact_phone?: string | null;
      pickup_instructions?: string | null;
      name?: string | null;
      phone?: string | null;
      business_name?: string | null;
    };
    if (m.pickup_address && !pickupText) {
      setPickupText(m.pickup_address);
    }
    setPickupContactName(m.pickup_contact_name || m.name || m.business_name || "");
    setPickupContactPhone(m.pickup_contact_phone || m.phone || "");
    setPickupInstructions(m.pickup_instructions || "");
    setPickupPrefilled(true);
  }, [me, pickupPrefilled, pickupText]);

  // Auto-geocode the business's saved pickup address so `pickup` (with lat/lng) is set
  // without the user having to re-type/select it.
  useEffect(() => {
    if (!useBusinessAddress) return;
    if (!businessPickupAddress) return;
    if (pickup && pickup.address === businessPickupAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await geocodeAddrs({ data: { items: [{ id: "biz", address: businessPickupAddress }] } });
        const r = res?.[0];
        if (cancelled) return;
        if (r && r.lat != null && r.lng != null) {
          setPickup({ address: businessPickupAddress, lat: r.lat, lng: r.lng } as SelectedPlace);
          setPickupText(businessPickupAddress);
        }
      } catch { /* ignore — user can toggle to enter address manually */ }
    })();
    return () => { cancelled = true; };
  }, [useBusinessAddress, businessPickupAddress, pickup, geocodeAddrs]);


  // Vehicle required by the courier
  const defaultVehicle = category.serviceType === "moving" ? "רכב" : "אופנוע";
  const [vehicle, setVehicle] = useState<string>(defaultVehicle);
  useEffect(() => { setVehicle(category.serviceType === "moving" ? "רכב" : "אופנוע"); }, [category.serviceType]);

  // Address details
  const [dropoffGround, setDropoffGround] = useState(false);
  const [dropoffFloor, setDropoffFloor] = useState("");
  const [dropoffApt, setDropoffApt] = useState("");
  const [dropoffEntry, setDropoffEntry] = useState(""); // access / entry code

  // Time-of-day for non-scheduled timings (business chooses when courier should arrive)
  const [todayTime, setTodayTime] = useState<string>("");

  const [pricingModel, setPricingModel] = useState<"fixed_price" | "distance_based" | "quote_request">("fixed_price");
  const [offeredPrice, setOfferedPrice] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("25");
  const [pricePerKm, setPricePerKm] = useState<string>("4");

  const [payDialog, setPayDialog] = useState<{ jobId: string; amount: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const sheetBodyRef = useRef<HTMLDivElement>(null);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const collectFieldErrors = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!pickup) {
      errors.pickup = pickupText.trim()
        ? "בחרו כתובת מהרשימה (לא רק להקליד)"
        : "חובה לבחור כתובת איסוף";
    }
    if (!dropoff) {
      errors.dropoff = dropoffText.trim()
        ? "בחרו כתובת מהרשימה (לא רק להקליד)"
        : "חובה לבחור כתובת מסירה";
    }
    if (!pickupContactName.trim()) {
      errors.pickupContactName = "הזינו שם איש קשר באיסוף";
    }
    if (!pickupContactPhone.trim()) {
      errors.pickupContactPhone = "הזינו טלפון איש קשר באיסוף";
    } else if (!isValidPhone(pickupContactPhone)) {
      errors.pickupContactPhone = "מספר טלפון לא תקין";
    }
    if (!pickupReadyNow && !pickupReadyTime) {
      errors.pickupReadyTime = "בחרו שעה שבה החבילה תהיה מוכנה";
    }
    if (timing === "scheduled" && !scheduledAt) {
      errors.scheduledAt = "בחרו תאריך ושעה למשלוח מתוזמן";
    }
    if (pricingModel === "fixed_price") {
      const price = Number(offeredPrice);
      if (!offeredPrice.trim()) {
        errors.offeredPrice = "הזינו מחיר לשליח";
      } else if (!Number.isFinite(price) || price <= 0) {
        errors.offeredPrice = "המחיר חייב להיות גדול מ־0";
      }
    }
    if (pricingModel === "distance_based") {
      if (!basePrice.trim() || !Number.isFinite(Number(basePrice)) || Number(basePrice) < 0) {
        errors.basePrice = "הזינו מחיר בסיס תקין";
      }
      if (!pricePerKm.trim() || !Number.isFinite(Number(pricePerKm)) || Number(pricePerKm) < 0) {
        errors.pricePerKm = "הזינו מחיר לק״מ תקין";
      }
    }

    return errors;
  };

  const scrollToFirstError = (errors: FieldErrors) => {
    const order: FieldKey[] = [
      "pickup",
      "dropoff",
      "pickupContactName",
      "pickupContactPhone",
      "pickupReadyTime",
      "scheduledAt",
      "offeredPrice",
      "basePrice",
      "pricePerKm",
    ];
    const first = order.find((k) => errors[k]);
    if (!first) return;
    // Wait for expanded sheet to mount before scrolling.
    window.setTimeout(() => {
      const root = sheetBodyRef.current ?? document;
      const el = root.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const attemptSubmit = () => {
    if (!me) {
      toast.error("חסר פרופיל עסק — השלימו את הפרופיל וחזרו לכאן");
      return;
    }
    setExpanded(true);
    const errors = collectFieldErrors();
    setFieldErrors(errors);
    const count = Object.keys(errors).length;
    if (count > 0) {
      toast.error(
        count === 1
          ? "יש להשלים שדה חובה אחד"
          : `יש ${count} שדות שדורשים תיקון`,
      );
      scrollToFirstError(errors);
      return;
    }
    submit.mutate();
  };

  const distanceKm = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const R = 6371;
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((dropoff.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [pickup, dropoff]);

  const suggestedPrice = useMemo(() => {
    const km = distanceKm ?? 3;
    return Math.max(25, Math.round(20 + km * 4));
  }, [distanceKm]);

  const distancePrice = useMemo(() => {
    const km = distanceKm ?? 3;
    const b = Number(basePrice) || 0;
    const perKm = Number(pricePerKm) || 0;
    return Math.max(0, Math.round((b + perKm * km) * 100) / 100);
  }, [distanceKm, basePrice, pricePerKm]);

  const canContinue = !!pickup && !!dropoff;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (canContinue) setExpanded(true); }, [canContinue]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל עסק");
      if (!pickup || !dropoff) throw new Error("חסרות כתובות");

      // Compute deadline + job date/time
      let deliveryDeadline: string | null = null;
      let jobDate: string | null = null;
      let jobTime: string | null = null;
      const now = new Date();
      const applyHHMM = (base: Date, hhmm: string) => {
        const [h, m] = hhmm.split(":").map(Number);
        const d = new Date(base);
        d.setHours(h || 0, m || 0, 0, 0);
        return d;
      };
      if (timing === "now") {
        deliveryDeadline = new Date(now.getTime() + 60 * 60_000).toISOString();
      } else if (timing === "within_hour") {
        if (todayTime) {
          const d = applyHHMM(now, todayTime);
          deliveryDeadline = d.toISOString();
          jobDate = d.toISOString().slice(0, 10);
          jobTime = todayTime;
        } else {
          deliveryDeadline = new Date(now.getTime() + 60 * 60_000).toISOString();
        }
      } else if (timing === "today") {
        if (todayTime) {
          const d = applyHHMM(now, todayTime);
          deliveryDeadline = d.toISOString();
          jobDate = d.toISOString().slice(0, 10);
          jobTime = todayTime;
        } else {
          const end = new Date(now); end.setHours(20, 0, 0, 0);
          deliveryDeadline = end.toISOString();
        }
      } else if (timing === "scheduled" && scheduledAt) {
        const d = new Date(scheduledAt);
        deliveryDeadline = d.toISOString();
        jobDate = scheduledAt.slice(0, 10);
        jobTime = scheduledAt.slice(11, 16);
      }

      const attrList = Array.from(attributes);
      const attrNote = attrList.length
        ? `מאפיינים: ${attrList
            .map((k) => category.attributes.find((a) => a.key === k)?.label ?? k)
            .join(", ")}`
        : "";
      const stopsNote = validExtraStops.length
        ? `יעדים נוספים לאותו שליח: ${validExtraStops
            .map((s, i) => `${i + 2}. ${s.place!.address}${s.name ? ` (${s.name}${s.phone ? ` · ${s.phone}` : ""})` : ""}`)
            .join(" | ")}`
        : "";
      const addressBits: string[] = [];
      if (dropoffGround) addressBits.push("קומת קרקע");
      else {
        if (dropoffFloor) addressBits.push(`קומה ${dropoffFloor}`);
        if (dropoffApt) addressBits.push(`דירה ${dropoffApt}`);
      }
      if (dropoffEntry) addressBits.push(`כניסה/קוד: ${dropoffEntry}`);
      const addressNote = addressBits.length ? `יעד: ${addressBits.join(" · ")}` : "";
      const fullNotes = [attrNote, stopsNote, addressNote, notes].filter(Boolean).join(" · ");

      const price =
        pricingModel === "fixed_price"
          ? Number(offeredPrice) || 0
          : pricingModel === "distance_based"
            ? distancePrice
            : 0;

      const pickupReadyAtIso = (() => {
        if (pickupReadyNow) return null;
        if (!pickupReadyTime) return null;
        return applyHHMM(new Date(), pickupReadyTime).toISOString();
      })();

      const payload = {
        customer_id: me.id,
        customer_name: (me as { business_name?: string; name?: string }).business_name || (me as { name?: string }).name,
        job_type: validExtraStops.length ? "משלוח מרובה נקודות" : "משלוח בודד",
        pickup_address: pickup.address,
        pickup_area: extractCity(pickup.address),
        pickup_lat: pickup.lat ?? null,
        pickup_lng: pickup.lng ?? null,
        pickup_contact_name: pickupContactName.trim() || null,
        pickup_contact_phone: pickupContactPhone.trim() || null,
        pickup_instructions: pickupInstructions.trim() || null,
        pickup_notes: pickupInstructions.trim() || null,
        pickup_ready: pickupReadyNow,
        pickup_ready_at: pickupReadyAtIso,
        dropoff_address: dropoff.address,
        dropoff_area: extractCity(dropoff.address),
        dropoff_lat: dropoff.lat ?? null,
        dropoff_lng: dropoff.lng ?? null,
        recipient_name: recipientName || null,
        recipient_phone: recipientPhone || null,
        dropoff_notes: fullNotes || null,
        package_type: deliveryType,
        fragile: attributes.has("fragile"),
        number_of_packages: 1 + validExtraStops.length,
        vehicle_required: vehicle || null,
        job_date: jobDate,
        job_time: jobTime,
        delivery_deadline: deliveryDeadline,
        matching_model: pricingModel,
        pricing_type: pricingModel,
        base_price: pricingModel === "distance_based" ? Number(basePrice) || 0 : null,
        price_per_km: pricingModel === "distance_based" ? Number(pricePerKm) || 0 : null,
        suggested_courier_payment: price || null,
        customer_price: price || null,
        payment: price,
        estimated_distance_km: distanceKm ? Number(distanceKm.toFixed(1)) : null,
        description: [`קטגוריה: ${category.label}`, deliveryType, validExtraStops.length ? `${validExtraStops.length + 1} יעדים` : null].filter(Boolean).join(" · "),
        invoice_required: (me as { invoice_required?: boolean }).invoice_required ?? false,
        status: "נשלחה לשליחים",
      };



      const data = await nestCreateJob(payload);

      // Geocode fire-and-forget
      geocode({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));

      const hasPayment = !!(me as { payment_method_on_file?: boolean } | null)?.payment_method_on_file;

      if (pricingModel === "quote_request") {
        notify({ data: { jobId: data.id } }).catch((e) => console.error(e));
      } else if (!hasPayment && price > 0) {
        setPayDialog({ jobId: data.id, amount: price });
        return data;
      } else {
        try {
          const res = await dispatch({ data: { jobId: data.id } });
          if (res?.sent) toast.success(`נשלח ל-${res.sent} שליחים ✅`);
          else {
            await nestUpdateJob(data.id, { status: "טיוטה" });
            toast.message("המשלוח נוצר — אין שליחים תואמים כרגע");
          }
        } catch (e) {
          console.error(e);
          await nestUpdateJob(data.id, { status: "טיוטה" });
          toast.error("שיגור נכשל: " + (e as Error).message);
        }
      }
      return data;
    },
    onSuccess: (data) => {
      if (payDialog) return; // wait for payment
      toast.success("המשלוח נוצר");
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="משלוח חדש">
      {payDialog && (
        <PaypalCheckoutDialog
          open={!!payDialog}
          jobId={payDialog.jobId}
          amount={payDialog.amount}
          onCancel={() => {
            const id = payDialog.jobId;
            setPayDialog(null);
            toast.message("התשלום בוטל — המשלוח לא שודר");
            navigate({ to: "/business/order/$id", params: { id } });
          }}
          onPaid={async () => {
            const id = payDialog.jobId;
            setPayDialog(null);
            try {
              const res = await dispatch({ data: { jobId: id } });
              if (res?.sent) toast.success(`נשלח ל-${res.sent} שליחים ✅`);
            } catch (e) { console.error(e); }
            navigate({ to: "/business/order/$id", params: { id } });
          }}
        />
      )}

      <div className="fixed inset-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col bg-bg lg:static lg:inset-auto lg:bottom-auto lg:z-0 lg:min-h-[calc(100vh-8.5rem)]">
        {/* Map on top */}
        <div className={`flex-1 relative ${expanded ? "min-h-[96px]" : "min-h-[240px]"}`}>
          <OrderMap pickup={pickup} dropoff={dropoff} className="absolute inset-0" />

          <button
            type="button"
            onClick={() => navigate({ to: "/business/account" })}
            aria-label="תפריט"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 size-10 rounded-pill bg-surface shadow-card ring-1 ring-black/10 grid place-items-center hover:bg-muted active:scale-95 transition lg:hidden"
          >
            <Menu className="size-5 text-text-strong" strokeWidth={2.4} />
          </button>
          <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 pointer-events-none">
            <div dir="ltr" className="inline-flex items-baseline gap-1.5">
              <span className="font-wordmark text-[26px] font-black italic tracking-tight leading-none text-navy drop-shadow-sm">
                GOI
              </span>
              <span className="text-[10px] font-black text-primary leading-none uppercase tracking-wide">
                Business
              </span>
            </div>
          </div>

          {!pickup && !dropoff && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-surface/95 backdrop-blur rounded-pill px-4 py-2 text-xs font-semibold text-text-muted shadow-card ring-1 ring-black/5">
                בחרו כתובת איסוף ומסירה למטה
              </div>
            </div>
          )}
          {distanceKm && (
            <div className="absolute bottom-3 left-3 bg-navy text-white text-xs font-bold px-3 py-1.5 rounded-pill shadow-card">
              {distanceKm.toFixed(1)} ק"מ
            </div>
          )}
        </div>

        {/* Bottom sheet — wizard body + sticky CTA */}
        <div
          className={cn(
            "relative z-10 flex flex-col flex-shrink-0 bg-surface rounded-t-[1.5rem] shadow-bottom-bar overflow-hidden transition-[height,max-height] duration-300",
            expanded ? "h-[74vh] max-h-[calc(100%-120px)]" : "max-h-[260px]",
          )}
        >
          <div className="w-full flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="w-10 h-1 bg-black/12 rounded-pill" />
          </div>

          {/* Address inputs — fixed at top only when collapsed */}
          {!expanded && (
            <div className="flex-shrink-0 px-3 pt-1 pb-2 space-y-2">
              {useBusinessAddress && businessPickupAddress ? (
                <div data-field="pickup">
                  <BusinessPickupCard
                    address={businessPickupAddress}
                    error={fieldErrors.pickup}
                    onChangeAddress={() => {
                      setUseBusinessAddress(false);
                      setPickup(null);
                      setPickupText("");
                      clearFieldError("pickup");
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-1" data-field="pickup">
                  <AddressAutocomplete
                    label="מאיפה?"
                    placeholder="כתובת איסוף"
                    value={pickupText}
                    onChange={(v) => {
                      setPickupText(v);
                      if (!v) setPickup(null);
                      clearFieldError("pickup");
                    }}
                    onSelect={(p) => {
                      setPickup(p);
                      setPickupText(p.address);
                      clearFieldError("pickup");
                    }}
                    accent="green"
                    error={fieldErrors.pickup}
                  />
                  {businessPickupAddress ? (
                    <button
                      type="button"
                      onClick={() => { setUseBusinessAddress(true); clearFieldError("pickup"); }}
                      className="text-[11px] font-medium text-primary/80 hover:text-primary hover:underline px-1"
                    >
                      השתמש בכתובת העסק
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/business/profile" })}
                      className="text-[11px] font-medium text-text-muted hover:text-primary hover:underline px-1"
                    >
                      שמור כתובת קבועה בפרופיל
                    </button>
                  )}
                </div>
              )}
              <div data-field="dropoff">
                <AddressAutocomplete
                  label="לאן?"
                  placeholder="כתובת מסירה"
                  value={dropoffText}
                  onChange={(v) => {
                    setDropoffText(v);
                    if (!v) setDropoff(null);
                    clearFieldError("dropoff");
                  }}
                  onSelect={(p) => {
                    setDropoff(p);
                    setDropoffText(p.address);
                    clearFieldError("dropoff");
                  }}
                  accent="red"
                  error={fieldErrors.dropoff}
                />
              </div>
            </div>
          )}

          {/* Expanded body — everything scrolls together */}
          {expanded && (
            <div ref={sheetBodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 space-y-5">

              {Object.keys(fieldErrors).length > 0 && (
                <div
                  className="flex items-start gap-2 rounded-card bg-danger-bg border border-destructive/20 px-3 py-2.5 text-[12px] font-medium text-danger-text"
                  role="alert"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>יש להשלים את השדות המסומנים באדום לפני השליחה</span>
                </div>
              )}

              {/* Addresses (scroll with body) */}
              <div className="space-y-2">
                <SectionLabel>כתובות</SectionLabel>
                {useBusinessAddress && businessPickupAddress ? (
                  <div data-field="pickup">
                    <BusinessPickupCard
                      address={businessPickupAddress}
                      error={fieldErrors.pickup}
                      onChangeAddress={() => {
                        setUseBusinessAddress(false);
                        setPickup(null);
                        setPickupText("");
                        clearFieldError("pickup");
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-1" data-field="pickup">
                    <AddressAutocomplete
                      label="מאיפה?"
                      placeholder="כתובת איסוף"
                      value={pickupText}
                      onChange={(v) => {
                        setPickupText(v);
                        if (!v) setPickup(null);
                        clearFieldError("pickup");
                      }}
                      onSelect={(p) => {
                        setPickup(p);
                        setPickupText(p.address);
                        clearFieldError("pickup");
                      }}
                      accent="green"
                      error={fieldErrors.pickup}
                    />
                    {businessPickupAddress ? (
                      <button
                        type="button"
                        onClick={() => { setUseBusinessAddress(true); clearFieldError("pickup"); }}
                        className="text-[11px] font-medium text-primary/80 hover:text-primary hover:underline px-1"
                      >
                        השתמש בכתובת העסק
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/business/profile" })}
                        className="text-[11px] font-medium text-text-muted hover:text-primary hover:underline px-1"
                      >
                        שמור כתובת קבועה בפרופיל
                      </button>
                    )}
                  </div>
                )}
                <div data-field="dropoff">
                  <AddressAutocomplete
                    label="לאן?"
                    placeholder="כתובת מסירה"
                    value={dropoffText}
                    onChange={(v) => {
                      setDropoffText(v);
                      if (!v) setDropoff(null);
                      clearFieldError("dropoff");
                    }}
                    onSelect={(p) => {
                      setDropoff(p);
                      setDropoffText(p.address);
                      clearFieldError("dropoff");
                    }}
                    accent="red"
                    error={fieldErrors.dropoff}
                  />
                </div>
              </div>

              {/* Extra stops (same courier, multiple destinations) */}
              <BusinessExtraStops stops={extraStops} setStops={setExtraStops} />

              {/* Pickup contact + readiness */}
              <div>
                <SectionLabel>פרטי איסוף</SectionLabel>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div data-field="pickupContactName">
                      <div className="relative">
                        <User className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 size-4",
                          fieldErrors.pickupContactName ? "text-destructive" : "text-text-muted",
                        )} />
                        <input
                          type="text"
                          value={pickupContactName}
                          onChange={(e) => {
                            setPickupContactName(e.target.value);
                            clearFieldError("pickupContactName");
                          }}
                          placeholder="שם איש קשר באיסוף"
                          aria-invalid={!!fieldErrors.pickupContactName}
                          className={fieldInputClass(!!fieldErrors.pickupContactName)}
                        />
                      </div>
                      <FieldError message={fieldErrors.pickupContactName} />
                    </div>
                    <div data-field="pickupContactPhone">
                      <div className="relative">
                        <Phone className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 size-4",
                          fieldErrors.pickupContactPhone ? "text-destructive" : "text-text-muted",
                        )} />
                        <input
                          type="tel"
                          value={pickupContactPhone}
                          onChange={(e) => {
                            setPickupContactPhone(e.target.value);
                            clearFieldError("pickupContactPhone");
                          }}
                          placeholder="טלפון באיסוף"
                          aria-invalid={!!fieldErrors.pickupContactPhone}
                          className={fieldInputClass(!!fieldErrors.pickupContactPhone)}
                        />
                      </div>
                      <FieldError message={fieldErrors.pickupContactPhone} />
                    </div>
                  </div>
                  <div className="relative">
                    <StickyNote className="absolute right-3 top-3 size-4 text-text-muted" />
                    <textarea
                      value={pickupInstructions}
                      onChange={(e) => setPickupInstructions(e.target.value)}
                      placeholder="הוראות איסוף (כניסה, קומה, חניה, למי לפנות…)"
                      rows={2}
                      className="w-full rounded-xl border border-transparent bg-muted pr-9 pl-3 py-2.5 text-sm text-text-strong resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPickupReadyNow(true);
                        clearFieldError("pickupReadyTime");
                      }}
                      aria-pressed={pickupReadyNow}
                      className={cn(
                        "flex-1 py-2 rounded-pill text-[11px] font-black transition",
                        pickupReadyNow
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-text-muted",
                      )}
                    >
                      מוכן לאיסוף עכשיו
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupReadyNow(false)}
                      aria-pressed={!pickupReadyNow}
                      className={cn(
                        "flex-1 py-2 rounded-pill text-[11px] font-black transition",
                        !pickupReadyNow
                          ? "bg-navy text-white shadow-sm"
                          : "bg-muted text-text-muted",
                      )}
                    >
                      יהיה מוכן בשעה…
                    </button>
                  </div>
                  {!pickupReadyNow && (
                    <div data-field="pickupReadyTime">
                      <div
                        className={cn(
                          "flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border",
                          fieldErrors.pickupReadyTime ? "border-destructive/50" : "border-transparent",
                        )}
                      >
                        <span className="text-[11px] font-bold text-text-muted shrink-0">מוכן ב־</span>
                        <input
                          type="time"
                          value={pickupReadyTime}
                          onChange={(e) => {
                            setPickupReadyTime(e.target.value);
                            clearFieldError("pickupReadyTime");
                          }}
                          aria-invalid={!!fieldErrors.pickupReadyTime}
                          className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-text-strong text-left"
                          dir="ltr"
                        />
                      </div>
                      <FieldError message={fieldErrors.pickupReadyTime} />
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery type — horizontally scrollable realistic tiles */}
              <div>
                <SectionLabel hint="גררו הצידה ←">מה שולחים?</SectionLabel>
                <div
                  className="-mx-4 px-4 pt-2 flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-4"
                  style={{ scrollbarWidth: "none" }}
                >
                  {deliveryTypes.map((t) => {
                    const on = deliveryType === t.label;
                    const v = getTileVisual(t.key);
                    const tone = TONE_STYLES[v.tone];
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setDeliveryType(t.label)}
                        aria-pressed={on}
                        className={cn(
                          "group relative snap-start shrink-0 w-[76px] rounded-card px-1 pt-1.5 pb-2 text-center transition-all active:scale-[0.94] border-2",
                          on
                            ? `bg-muted ${tone.ring.replace("ring-", "border-")} shadow-card`
                            : "bg-transparent border-transparent opacity-80 hover:opacity-100",
                        )}
                      >
                        <div className="relative w-full aspect-square grid place-items-center">
                          <div
                            className={`absolute inset-2 rounded-pill blur-xl transition-opacity ${on ? "opacity-50" : "opacity-25"}`}
                            style={{ background: tone.glow }}
                            aria-hidden
                          />
                          <img
                            src={v.image}
                            alt={t.label}
                            loading="lazy"
                            width={72}
                            height={72}
                            className={cn(
                              "relative w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] transition-transform duration-200",
                              on ? "scale-105" : "group-hover:scale-105",
                            )}
                          />
                        </div>
                        <div className={cn(
                          "text-[10.5px] font-bold leading-tight mt-0.5 line-clamp-1",
                          on ? "text-text-strong" : "text-text-muted",
                        )}>
                          {t.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>



              {/* Timing — segmented pill row */}
              <div>
                <SectionLabel
                  hint={timing !== "scheduled" ? TIMING_LABELS[timing]?.label : undefined}
                >
                  מתי להזמין שליח?
                </SectionLabel>
                <div className="relative flex items-center gap-1 p-1 rounded-pill bg-muted">
                  {timings.map((t) => {
                    const on = timing === t;
                    const info = TIMING_LABELS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTiming(t);
                          if (t !== "scheduled") clearFieldError("scheduledAt");
                        }}
                        aria-pressed={on}
                        className={cn(
                          "flex-1 relative inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-pill text-xs font-black transition-all",
                          on
                            ? "bg-primary text-primary-foreground shadow-fab"
                            : "text-text-muted hover:text-text-strong",
                        )}
                      >
                        <img
                          src={TIMING_ICONS[t]}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          width={20}
                          height={20}
                          className={cn("size-5 object-contain transition", on && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]")}
                        />
                        <span className="leading-none">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
                {(timing === "today" || timing === "within_hour") && (
                  <div className="mt-2 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                    <span className="text-[11px] font-bold text-text-muted shrink-0">שעת איסוף</span>
                    <input
                      type="time"
                      value={todayTime}
                      onChange={(e) => setTodayTime(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-text-strong text-left"
                      dir="ltr"
                    />
                    {!todayTime && (
                      <span className="text-[10px] text-text-muted">אופציונלי</span>
                    )}
                  </div>
                )}
                {timing === "scheduled" && (
                  <div className="mt-2" data-field="scheduledAt">
                    <div
                      className={cn(
                        "flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border",
                        fieldErrors.scheduledAt ? "border-destructive/50" : "border-transparent",
                      )}
                    >
                      <span className="text-[11px] font-bold text-text-muted shrink-0">תאריך ושעה</span>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => {
                          setScheduledAt(e.target.value);
                          clearFieldError("scheduledAt");
                        }}
                        aria-invalid={!!fieldErrors.scheduledAt}
                        className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-text-strong text-left"
                        dir="ltr"
                      />
                    </div>
                    <FieldError message={fieldErrors.scheduledAt} />
                  </div>
                )}
              </div>

              {/* Vehicle required */}
              <div>
                <SectionLabel>איזה רכב צריך?</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: "אופנוע", label: "אופנוע", Icon: Bike },
                    { key: "רכב", label: "רכב", Icon: Car },
                    { key: "טנדר", label: "טנדר", Icon: Truck },
                  ].map(({ key, label, Icon }) => {
                    const on = vehicle === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVehicle(key)}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition",
                          on
                            ? "bg-navy text-white shadow-sm"
                            : "bg-muted text-text-muted hover:text-text-strong",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={2.2} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dropoff address details */}
              <div>
                <SectionLabel>פרטי היעד</SectionLabel>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setDropoffGround((v) => !v)}
                    aria-pressed={dropoffGround}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[11px] font-bold border transition",
                      dropoffGround
                        ? "bg-navy text-white border-navy"
                        : "bg-surface text-text-muted border-black/10",
                    )}
                  >
                    <Building2 className="size-3.5" strokeWidth={2.4} />
                    קומת קרקע / כניסה ישירה
                  </button>
                  {!dropoffGround && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dropoffFloor}
                        onChange={(e) => setDropoffFloor(e.target.value)}
                        placeholder="קומה"
                        className="rounded-xl border-0 bg-muted px-3 py-2.5 text-sm text-center text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dropoffApt}
                        onChange={(e) => setDropoffApt(e.target.value)}
                        placeholder="דירה"
                        className="rounded-xl border-0 bg-muted px-3 py-2.5 text-sm text-center text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="text"
                        value={dropoffEntry}
                        onChange={(e) => setDropoffEntry(e.target.value)}
                        placeholder="כניסה/קוד"
                        className="rounded-xl border-0 bg-muted px-3 py-2.5 text-sm text-center text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Attributes */}
              {category.attributes.length > 0 && (
                <div>
                  <SectionLabel>מאפיינים</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {category.attributes.map((a) => {
                      const on = attributes.has(a.key);
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => toggleAttr(a.key)}
                          className={cn(
                            "px-3 py-1.5 rounded-pill text-xs font-bold border transition",
                            on
                              ? "bg-navy text-white border-navy"
                              : "bg-surface text-text-muted border-black/10",
                          )}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recipient */}
              <div>
                <SectionLabel>פרטי נמען</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="שם הנמען"
                      className="w-full rounded-xl border-0 bg-muted pr-9 pl-3 py-2.5 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="טלפון נמען"
                      className="w-full rounded-xl border-0 bg-muted pr-9 pl-3 py-2.5 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="relative">
                <StickyNote className="absolute right-3 top-3 size-4 text-text-muted" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות לשליח (קומה, קוד כניסה, ליצור קשר…)"
                  rows={2}
                  className="w-full rounded-xl border-0 bg-muted pr-9 pl-3 py-2.5 text-sm text-text-strong resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Pricing */}
              <div>
                <SectionLabel>מחיר</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { key: "fixed_price", label: "מחיר קבוע" },
                    { key: "distance_based", label: "בסיס + ק״מ" },
                    { key: "quote_request", label: "קבל הצעות" },
                  ].map((opt) => {
                    const on = pricingModel === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setPricingModel(opt.key as "fixed_price" | "distance_based" | "quote_request");
                          clearFieldError("offeredPrice");
                          clearFieldError("basePrice");
                          clearFieldError("pricePerKm");
                        }}
                        className={cn(
                          "py-2 rounded-xl text-[11px] font-bold transition",
                          on ? "bg-navy text-white" : "bg-muted text-text-muted",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {pricingModel === "fixed_price" && (
                  <div data-field="offeredPrice">
                    <div
                      className={cn(
                        "flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5 border",
                        fieldErrors.offeredPrice ? "border-destructive/50" : "border-transparent",
                      )}
                    >
                      <span className="text-lg font-black text-text-muted">₪</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={offeredPrice}
                        onChange={(e) => {
                          setOfferedPrice(e.target.value);
                          clearFieldError("offeredPrice");
                        }}
                        placeholder={String(suggestedPrice)}
                        aria-invalid={!!fieldErrors.offeredPrice}
                        className="flex-1 bg-transparent border-0 outline-none text-lg font-black text-text-strong"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOfferedPrice(String(suggestedPrice));
                          clearFieldError("offeredPrice");
                        }}
                        className="text-[11px] font-bold text-text-muted bg-surface px-2 py-1 rounded-lg shadow-card"
                      >
                        מוצע: ₪{suggestedPrice}
                      </button>
                    </div>
                    <FieldError message={fieldErrors.offeredPrice} />
                  </div>
                )}

                {pricingModel === "distance_based" && (
                  <div className="bg-muted rounded-card p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div data-field="basePrice">
                        <div
                          className={cn(
                            "bg-surface rounded-lg px-3 py-2 border",
                            fieldErrors.basePrice ? "border-destructive/50" : "border-transparent",
                          )}
                        >
                          <div className="text-[10px] font-bold text-text-muted mb-0.5">מחיר בסיס</div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-text-muted">₪</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={basePrice}
                              onChange={(e) => {
                                setBasePrice(e.target.value);
                                clearFieldError("basePrice");
                              }}
                              aria-invalid={!!fieldErrors.basePrice}
                              className="w-full bg-transparent border-0 outline-none text-base font-black text-text-strong"
                            />
                          </div>
                        </div>
                        <FieldError message={fieldErrors.basePrice} />
                      </div>
                      <div data-field="pricePerKm">
                        <div
                          className={cn(
                            "bg-surface rounded-lg px-3 py-2 border",
                            fieldErrors.pricePerKm ? "border-destructive/50" : "border-transparent",
                          )}
                        >
                          <div className="text-[10px] font-bold text-text-muted mb-0.5">₪ לק״מ</div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-text-muted">₪</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              value={pricePerKm}
                              onChange={(e) => {
                                setPricePerKm(e.target.value);
                                clearFieldError("pricePerKm");
                              }}
                              aria-invalid={!!fieldErrors.pricePerKm}
                              className="w-full bg-transparent border-0 outline-none text-base font-black text-text-strong"
                            />
                          </div>
                        </div>
                        <FieldError message={fieldErrors.pricePerKm} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-text-muted">
                      <span>
                        {distanceKm ? `${distanceKm.toFixed(1)} ק״מ` : "מרחק יחושב לפי הכתובות"}
                      </span>
                      <span className="text-primary">≈ ₪{distancePrice}</span>
                    </div>
                  </div>
                )}

                {pricingModel === "quote_request" && (
                  <div className="bg-muted rounded-card px-3 py-2.5 text-xs text-text-muted">
                    שליחים ישלחו הצעות מחיר ותוכלו לבחור מתוכן.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Sticky CTA — sheet footer (above business bottom tabs) */}
          <div className="flex-shrink-0 bg-surface/95 backdrop-blur pt-2.5 pb-3 px-4 border-t border-black/5 shadow-bottom-bar">
            {expanded && Object.keys(fieldErrors).length > 0 && (
              <p className="mb-2 text-center text-[11px] font-medium text-destructive">
                יש שדות שדורשים תיקון — ראו את ההערות האדומות למעלה
              </p>
            )}
            <button
              type="button"
              onClick={attemptSubmit}
              disabled={submit.isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-pill bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-base font-black transition shadow-fab active:scale-[0.98]"
            >
              {submit.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : !expanded || !canContinue ? (
                <>
                  <ArrowRight className="size-5" />
                  המשך להשלמת הפרטים
                </>
              ) : pricingModel === "quote_request" ? (
                <>
                  <Send className="size-5" /> בקש הצעות משליחים
                </>
              ) : (
                <>
                  <Radar className="size-5" /> שלח לשליחים
                  <Truck className="size-5" />
                </>
              )}
            </button>
          </div>


        </div>
      </div>
    </BusinessShell>
  );
}

function BusinessExtraStops({
  stops, setStops,
}: {
  stops: ExtraStop[];
  setStops: React.Dispatch<React.SetStateAction<ExtraStop[]>>;
}) {
  const add = () => setStops((p) => [...p, { place: null, text: "", name: "", phone: "" }]);
  const update = (i: number, patch: Partial<ExtraStop>) =>
    setStops((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setStops((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {stops.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded-card bg-muted/70 p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-text-muted">יעד נוסף {i + 2}</span>
            <button type="button" onClick={() => remove(i)} className="text-[11px] font-bold text-danger-text">הסר</button>
          </div>
          <AddressAutocomplete
            label={`יעד ${i + 2}`}
            placeholder="כתובת מסירה"
            value={s.text}
            onChange={(v) => update(i, { text: v, place: v ? s.place : null })}
            onSelect={(p) => update(i, { place: p, text: p.address })}
            accent="red"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" value={s.name} onChange={(e) => update(i, { name: e.target.value })}
              placeholder="שם הנמען"
              className="w-full rounded-xl bg-surface border border-black/10 px-3 py-2 text-xs font-semibold text-text-strong"
            />
            <input
              type="tel" value={s.phone} onChange={(e) => update(i, { phone: e.target.value })}
              placeholder="טלפון"
              className="w-full rounded-xl bg-surface border border-black/10 px-3 py-2 text-xs font-semibold text-text-strong"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-black/15 text-[12px] font-bold text-text-muted hover:bg-muted transition"
      >
        <Plus className="size-3.5" /> {stops.length === 0 ? "אותו שליח, כמה יעדים" : "הוסף עוד יעד"}
      </button>
    </div>
  );
}

function BusinessPickupCard({
  address,
  onChangeAddress,
  error,
}: {
  address: string;
  onChangeAddress: () => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "rounded-card bg-muted/80 px-3 py-2.5 flex items-center gap-3 border",
          error ? "border-destructive/50" : "border-primary/20",
        )}
      >
        <div className="size-8 rounded-pill bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-text-muted tracking-wide">איסוף מכתובת העסק</div>
          <div className="text-sm font-semibold text-text-strong truncate" title={address}>{address}</div>
        </div>
        <button
          type="button"
          onClick={onChangeAddress}
          className="text-[11px] font-medium text-text-muted hover:text-text-strong hover:underline shrink-0"
        >
          כתובת אחרת
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

// "Herzliya Pituach, Herzliya, Israel" → "Herzliya"; picks the city segment
// (2nd-to-last) instead of the country. Falls back to the last segment when
// the address has fewer parts.
function extractCity(address: string): string | null {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const COUNTRY = new Set(["ישראל", "Israel", "israel"]);
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && COUNTRY.has(last)) return parts[parts.length - 2];
  return last;
}
