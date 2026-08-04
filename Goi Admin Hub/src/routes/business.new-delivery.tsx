import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Loader2, Radar, Send, ArrowRight, User, Phone, StickyNote,
  ChevronLeft, Truck, Plus, Menu, Bike, Car, Building2,
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

export const Route = createFileRoute("/business/new-delivery")({
  head: () => ({ meta: [{ title: "משלוח חדש — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    timing: typeof s.timing === "string" ? (s.timing as string) : undefined,
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
  const [dropoffText, setDropoffText] = useState("");
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
      if (!pickup) throw new Error("בחר כתובת איסוף");
      if (!dropoff) throw new Error("בחר כתובת מסירה");
      if (!pickupContactName.trim()) throw new Error("הזן שם איש קשר באיסוף");
      if (!pickupContactPhone.trim()) throw new Error("הזן טלפון איש קשר באיסוף");
      if (!pickupReadyNow && !pickupReadyTime) throw new Error("בחר את השעה שבה החבילה תהיה מוכנה לאיסוף");
      if (timing === "scheduled" && !scheduledAt) throw new Error("בחר תאריך ושעה למשלוח מתוזמן");
      if (pricingModel === "fixed_price" && !offeredPrice) throw new Error("הזן מחיר לשליח");


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



      const { data, error } = await supabase.from("jobs").insert(payload as never).select("id, job_number").single();
      if (error) throw new Error(error.message);

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
            await supabase.from("jobs").update({ status: "טיוטה" }).eq("id", data.id);
            toast.message("המשלוח נוצר — אין שליחים תואמים כרגע");
          }
        } catch (e) {
          console.error(e);
          await supabase.from("jobs").update({ status: "טיוטה" }).eq("id", data.id);
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

      <div className="fixed inset-0 bottom-[88px] flex flex-col bg-[#f5f6f8] z-20 pb-[env(safe-area-inset-bottom)]">
        {/* Map on top */}
        <div className={`flex-1 relative ${expanded ? "min-h-[96px]" : "min-h-[240px]"}`}>
          <OrderMap pickup={pickup} dropoff={dropoff} className="absolute inset-0" />

          <button
            type="button"
            onClick={() => navigate({ to: "/business/account" })}
            aria-label="תפריט"
            className="absolute top-3 right-3 z-10 size-10 rounded-full bg-white shadow-lg ring-1 ring-black/10 grid place-items-center hover:bg-[#f5f6f8] active:scale-95 transition"
          >
            <Menu className="size-5 text-[#101418]" strokeWidth={2.4} />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div dir="ltr" className="inline-flex items-baseline gap-1.5">
              <span
                className="text-[26px] font-black italic tracking-tight leading-none"
                style={{ color: "#101418", textShadow: "0 2px 0 rgba(0,0,0,0.12)" }}
              >
                GOI
              </span>
              <span className="text-[10px] font-black text-[#35AD29] leading-none uppercase tracking-wide">
                Business
              </span>
            </div>
          </div>



          {!pickup && !dropoff && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-white/95 backdrop-blur rounded-full px-4 py-2 text-xs font-semibold text-[#101418]/70 shadow-lg ring-1 ring-black/5">
                בחר כתובת איסוף ומסירה למטה
              </div>
            </div>
          )}
          {distanceKm && (
            <div className="absolute bottom-3 left-3 bg-[#101418] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              {distanceKm.toFixed(1)} ק"מ
            </div>
          )}
        </div>

        {/* Bottom sheet */}
        <div
          className={`relative z-10 flex flex-col flex-shrink-0 bg-white rounded-t-3xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] overflow-hidden transition-[height,max-height] duration-300 ${
            expanded ? "h-[74vh] max-h-[calc(100%-120px)]" : "max-h-[260px]"
          }`}
        >
          <div className="w-full flex justify-center pt-2 pb-1" aria-hidden>
            <div className="w-10 h-1 bg-black/15 rounded-full" />
          </div>

          {/* Address inputs — fixed at top only when collapsed */}
          {!expanded && (
            <div className="flex-shrink-0 px-3 pt-1 pb-2 space-y-2">
              {useBusinessAddress && businessPickupAddress ? (
                <BusinessPickupCard
                  address={businessPickupAddress}
                  onChangeAddress={() => { setUseBusinessAddress(false); setPickup(null); setPickupText(""); }}
                />
              ) : (
                <div className="space-y-1">
                  <AddressAutocomplete
                    label="מאיפה?"
                    placeholder="כתובת איסוף"
                    value={pickupText}
                    onChange={(v) => { setPickupText(v); if (!v) setPickup(null); }}
                    onSelect={(p) => { setPickup(p); setPickupText(p.address); }}
                    accent="green"
                  />
                  {businessPickupAddress ? (
                    <button
                      type="button"
                      onClick={() => { setUseBusinessAddress(true); }}
                      className="text-[11px] font-medium text-[#35AD29]/80 hover:text-[#35AD29] hover:underline px-1"
                    >
                      השתמש בכתובת העסק
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/business/profile" })}
                      className="text-[11px] font-medium text-[#101418]/50 hover:text-[#35AD29] hover:underline px-1"
                    >
                      שמור כתובת קבועה בפרופיל
                    </button>
                  )}
                </div>
              )}
              <AddressAutocomplete
                label="לאן?"
                placeholder="כתובת מסירה"
                value={dropoffText}
                onChange={(v) => { setDropoffText(v); if (!v) setDropoff(null); }}
                onSelect={(p) => { setDropoff(p); setDropoffText(p.address); }}
                accent="red"
              />
            </div>
          )}

          {/* Expanded body — everything scrolls together */}
          {expanded && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4 space-y-4">

              {/* Addresses (scroll with body) */}
              <div className="space-y-2">
                {useBusinessAddress && businessPickupAddress ? (
                  <BusinessPickupCard
                    address={businessPickupAddress}
                    onChangeAddress={() => { setUseBusinessAddress(false); setPickup(null); setPickupText(""); }}
                  />
                ) : (
                  <div className="space-y-1">
                    <AddressAutocomplete
                      label="מאיפה?"
                      placeholder="כתובת איסוף"
                      value={pickupText}
                      onChange={(v) => { setPickupText(v); if (!v) setPickup(null); }}
                      onSelect={(p) => { setPickup(p); setPickupText(p.address); }}
                      accent="green"
                    />
                    {businessPickupAddress ? (
                      <button
                        type="button"
                        onClick={() => { setUseBusinessAddress(true); }}
                        className="text-[11px] font-medium text-[#35AD29]/80 hover:text-[#35AD29] hover:underline px-1"
                      >
                        השתמש בכתובת העסק
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/business/profile" })}
                        className="text-[11px] font-medium text-[#101418]/50 hover:text-[#35AD29] hover:underline px-1"
                      >
                        שמור כתובת קבועה בפרופיל
                      </button>
                    )}
                  </div>
                )}
                <AddressAutocomplete
                  label="לאן?"
                  placeholder="כתובת מסירה"
                  value={dropoffText}
                  onChange={(v) => { setDropoffText(v); if (!v) setDropoff(null); }}
                  onSelect={(p) => { setDropoff(p); setDropoffText(p.address); }}
                  accent="red"
                />
              </div>

              {/* Extra stops (same courier, multiple destinations) */}
              <BusinessExtraStops stops={extraStops} setStops={setExtraStops} />

              {/* Pickup contact + readiness */}
              <div>
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-2 px-0.5">
                  פרטי איסוף
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#101418]/40" />
                      <input
                        type="text"
                        value={pickupContactName}
                        onChange={(e) => setPickupContactName(e.target.value)}
                        placeholder="שם איש קשר באיסוף"
                        className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#101418]/40" />
                      <input
                        type="tel"
                        value={pickupContactPhone}
                        onChange={(e) => setPickupContactPhone(e.target.value)}
                        placeholder="טלפון באיסוף"
                        className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <StickyNote className="absolute right-3 top-3 size-4 text-[#101418]/40" />
                    <textarea
                      value={pickupInstructions}
                      onChange={(e) => setPickupInstructions(e.target.value)}
                      placeholder="הוראות איסוף (כניסה, קומה, חניה, למי לפנות…)"
                      rows={2}
                      className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPickupReadyNow(true)}
                      aria-pressed={pickupReadyNow}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-black transition ${
                        pickupReadyNow ? "bg-[#35AD29] text-white shadow-sm" : "bg-[#F5F3EF] text-[#101418]/70"
                      }`}
                    >
                      מוכן לאיסוף עכשיו
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupReadyNow(false)}
                      aria-pressed={!pickupReadyNow}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-black transition ${
                        !pickupReadyNow ? "bg-[#101418] text-white shadow-sm" : "bg-[#F5F3EF] text-[#101418]/70"
                      }`}
                    >
                      יהיה מוכן בשעה…
                    </button>
                  </div>
                  {!pickupReadyNow && (
                    <div className="flex items-center gap-2 bg-[#F5F3EF] rounded-xl px-3 py-2">
                      <span className="text-[11px] font-bold text-[#101418]/60 shrink-0">מוכן ב־</span>
                      <input
                        type="time"
                        value={pickupReadyTime}
                        onChange={(e) => setPickupReadyTime(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-[#101418] text-left"
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>
              </div>





              {/* Delivery type — horizontally scrollable realistic tiles */}

              <div>
                <div className="flex items-baseline justify-between mb-2 px-0.5">
                  <label className="block text-[11px] font-bold text-[#101418]/60 uppercase">
                    מה שולחים?
                  </label>
                  <span className="text-[11px] text-[#101418]/40">גררו הצידה →</span>
                </div>
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
                        className={`group relative snap-start shrink-0 w-[76px] rounded-2xl px-1 pt-1.5 pb-2 text-center transition-all active:scale-[0.94] ${
                          on
                            ? `bg-[#F5F3EF] border-2 ${tone.ring.replace("ring-", "border-")} shadow-[0_4px_12px_-4px_rgba(53,173,41,0.4)]`
                            : "bg-transparent border-2 border-transparent opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="relative w-full aspect-square grid place-items-center">
                          <div
                            className={`absolute inset-2 rounded-full blur-xl transition-opacity ${on ? "opacity-50" : "opacity-25"}`}
                            style={{ background: tone.glow }}
                            aria-hidden
                          />
                          <img
                            src={v.image}
                            alt={t.label}
                            loading="lazy"
                            width={72}
                            height={72}
                            className={`relative w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] transition-transform duration-200 ${on ? "scale-105" : "group-hover:scale-105"}`}
                          />
                        </div>
                        <div className={`text-[10.5px] font-bold leading-tight mt-0.5 line-clamp-1 ${on ? "text-[#101418]" : "text-[#101418]/70"}`}>
                          {t.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>



              {/* Timing — segmented pill row */}
              <div>
                <div className="flex items-baseline justify-between mb-2 px-0.5">
                  <label className="block text-[11px] font-bold text-[#101418]/60 uppercase">
                    מתי להזמין שליח?
                  </label>
                  {timing !== "scheduled" && (
                    <span className="text-[11px] font-bold text-[#35AD29]">
                      {TIMING_LABELS[timing]?.label}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-1 p-1 rounded-full bg-[#F5F3EF]">
                  {timings.map((t) => {
                    const on = timing === t;
                    const info = TIMING_LABELS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTiming(t)}
                        aria-pressed={on}
                        className={`flex-1 relative inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-full text-xs font-black transition-all ${
                          on
                            ? "bg-[#35AD29] text-white shadow-[0_4px_12px_-4px_rgba(53,173,41,0.55)]"
                            : "text-[#101418]/60 hover:text-[#101418]"
                        }`}
                      >
                        <img
                          src={TIMING_ICONS[t]}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          width={20}
                          height={20}
                          className={`size-5 object-contain transition ${on ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" : ""}`}
                        />
                        <span className="leading-none">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
                {(timing === "today" || timing === "within_hour") && (
                  <div className="mt-2 flex items-center gap-2 bg-[#F5F3EF] rounded-xl px-3 py-2">
                    <span className="text-[11px] font-bold text-[#101418]/60 shrink-0">שעת איסוף</span>
                    <input
                      type="time"
                      value={todayTime}
                      onChange={(e) => setTodayTime(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-[#101418] text-left"
                      dir="ltr"
                    />
                    {!todayTime && (
                      <span className="text-[10px] text-[#101418]/40">אופציונלי</span>
                    )}
                  </div>
                )}
                {timing === "scheduled" && (
                  <div className="mt-2 flex items-center gap-2 bg-[#F5F3EF] rounded-xl px-3 py-2">
                    <span className="text-[11px] font-bold text-[#101418]/60 shrink-0">תאריך ושעה</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none text-sm font-bold text-[#101418] text-left"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              {/* Vehicle required */}
              <div>
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-2 px-0.5">
                  איזה רכב צריך?
                </label>
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
                        className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                          on
                            ? "bg-[#101418] text-white shadow-sm"
                            : "bg-[#F5F3EF] text-[#101418]/70 hover:text-[#101418]"
                        }`}
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
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-2 px-0.5">
                  פרטי היעד
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setDropoffGround((v) => !v)}
                    aria-pressed={dropoffGround}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                      dropoffGround
                        ? "bg-[#101418] text-white border-[#101418]"
                        : "bg-white text-[#101418]/70 border-black/10"
                    }`}
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
                        className="rounded-xl border-0 bg-[#F5F3EF] px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dropoffApt}
                        onChange={(e) => setDropoffApt(e.target.value)}
                        placeholder="דירה"
                        className="rounded-xl border-0 bg-[#F5F3EF] px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                      />
                      <input
                        type="text"
                        value={dropoffEntry}
                        onChange={(e) => setDropoffEntry(e.target.value)}
                        placeholder="כניסה/קוד"
                        className="rounded-xl border-0 bg-[#F5F3EF] px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                      />
                    </div>
                  )}
                </div>
              </div>





              {/* Attributes */}
              {category.attributes.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-2">
                    מאפיינים
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {category.attributes.map((a) => {
                      const on = attributes.has(a.key);
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => toggleAttr(a.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                            on
                              ? "bg-[#101418] text-white border-[#101418]"
                              : "bg-white text-[#101418]/70 border-black/10"
                          }`}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#101418]/40" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="שם הנמען"
                    className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#101418]/40" />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="טלפון נמען"
                    className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="relative">
                <StickyNote className="absolute right-3 top-3 size-4 text-[#101418]/40" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות לשליח (קומה, קוד כניסה, ליצור קשר…)"
                  rows={2}
                  className="w-full rounded-xl border-0 bg-[#F5F3EF] pr-9 pl-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#35AD29]/30"
                />
              </div>


              {/* Pricing */}
              <div>
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">מחיר</label>
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
                        onClick={() => setPricingModel(opt.key as "fixed_price" | "distance_based" | "quote_request")}
                        className={`py-2 rounded-xl text-[11px] font-bold transition ${
                          on ? "bg-[#101418] text-white" : "bg-[#F5F3EF] text-[#101418]/70"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {pricingModel === "fixed_price" && (
                  <div className="flex items-center gap-2 bg-[#F5F3EF] rounded-xl px-3 py-2.5">
                    <span className="text-lg font-black text-[#101418]/40">₪</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={offeredPrice}
                      onChange={(e) => setOfferedPrice(e.target.value)}
                      placeholder={String(suggestedPrice)}
                      className="flex-1 bg-transparent border-0 outline-none text-lg font-black text-[#101418]"
                    />
                    <button
                      type="button"
                      onClick={() => setOfferedPrice(String(suggestedPrice))}
                      className="text-[11px] font-bold text-[#101418]/60 bg-white px-2 py-1 rounded-lg shadow-sm"
                    >
                      מוצע: ₪{suggestedPrice}
                    </button>
                  </div>
                )}

                {pricingModel === "distance_based" && (
                  <div className="bg-[#F5F3EF] rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg px-3 py-2">
                        <div className="text-[10px] font-bold text-[#101418]/50 mb-0.5">מחיר בסיס</div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-[#101418]/40">₪</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-base font-black text-[#101418]"
                          />
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2">
                        <div className="text-[10px] font-bold text-[#101418]/50 mb-0.5">₪ לק״מ</div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-[#101418]/40">₪</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={pricePerKm}
                            onChange={(e) => setPricePerKm(e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-base font-black text-[#101418]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#101418]/70">
                      <span>
                        {distanceKm ? `${distanceKm.toFixed(1)} ק״מ` : "מרחק יחושב לפי הכתובות"}
                      </span>
                      <span className="text-[#35AD29]">≈ ₪{distancePrice}</span>
                    </div>
                  </div>
                )}

                {pricingModel === "quote_request" && (
                  <div className="bg-[#F5F3EF] rounded-xl px-3 py-2.5 text-xs text-[#101418]/70">
                    שליחים ישלחו הצעות מחיר ותוכל לבחור מתוכן.
                  </div>
                )}
              </div>



            </div>
          )}


          {/* CTA footer */}
          {expanded && (
            <div className="flex-shrink-0 bg-white pt-2.5 pb-4 px-4 border-t border-black/5 shadow-[0_-10px_20px_rgba(0,0,0,0.04)]">
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending || !canContinue}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#35AD29] hover:bg-[#2d9623] disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-black transition shadow-[0_8px_20px_-6px_rgba(53,173,41,0.55)] active:scale-[0.98]"
              >
                {submit.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : !canContinue ? (
                  <>
                    <ArrowRight className="size-5" />
                    {!pickup ? "בחר כתובת איסוף" : "בחר כתובת מסירה"}
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
          )}


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
        <div key={i} className="space-y-1.5 rounded-2xl bg-black/[0.03] p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#101418]/60">יעד נוסף {i + 2}</span>
            <button type="button" onClick={() => remove(i)} className="text-[11px] font-bold text-[#B00020]">הסר</button>
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
              className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 text-xs font-semibold"
            />
            <input
              type="tel" value={s.phone} onChange={(e) => update(i, { phone: e.target.value })}
              placeholder="טלפון"
              className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 text-xs font-semibold"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-black/20 text-[12px] font-bold text-[#101418]/70 hover:bg-black/5"
      >
        <Plus className="size-3.5" /> {stops.length === 0 ? "אותו שליח, כמה יעדים" : "הוסף עוד יעד"}
      </button>
    </div>
  );
}

function BusinessPickupCard({ address, onChangeAddress }: { address: string; onChangeAddress: () => void }) {
  return (
    <div className="rounded-2xl bg-[#F5F3EF]/70 border border-[#35AD29]/15 px-3 py-2.5 flex items-center gap-3">
      <div className="size-8 rounded-full bg-[#35AD29]/10 flex items-center justify-center shrink-0">
        <Building2 className="size-4 text-[#35AD29]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-[#101418]/50 tracking-wide">איסוף מכתובת העסק</div>
        <div className="text-sm font-semibold text-[#101418] truncate" title={address}>{address}</div>
      </div>
      <button
        type="button"
        onClick={onChangeAddress}
        className="text-[11px] font-medium text-[#101418]/50 hover:text-[#101418] hover:underline shrink-0"
      >
        כתובת אחרת
      </button>
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
