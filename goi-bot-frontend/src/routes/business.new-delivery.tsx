import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { BusinessNewOrder, type ExtraStop } from "@/components/business/BusinessNewOrder";
import { nestCreateJob, nestUpdateJob } from "@/lib/nest-jobs";
import { nestComputePrice, nestGetPricing } from "@/lib/nest-domain";
import { notifyCouriersOfQuoteRequest } from "@/lib/whatsapp-quotes.functions";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { geocodeJob } from "@/lib/geocode-job.functions";
import { geocodeAddresses } from "@/lib/geocode.functions";
import { getCategory, getDeliveryTypesForCategory, type Timing } from "@/config/businessCategories";
import type { SelectedPlace } from "@/components/customer/AddressAutocomplete";
import type { DrivingRoute } from "@/lib/google-driving-route";
import { haversineKm } from "@/lib/google-driving-route";
import { toast } from "sonner";

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

export const Route = createFileRoute("/business/new-delivery")({
  head: () => ({ meta: [{ title: "משלוח חדש — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    timing: typeof s.timing === "string" ? (s.timing as string) : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    vehicle: typeof s.vehicle === "string" ? s.vehicle : undefined,
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
  const waypoints = useMemo(
    () => validExtraStops.map((s) => ({ lat: s.place!.lat, lng: s.place!.lng })),
    [validExtraStops],
  );

  const [deliveryType, setDeliveryType] = useState<string>(deliveryTypes[0]?.label ?? "מוצר");
  useEffect(() => { setDeliveryType(deliveryTypes[0]?.label ?? "מוצר"); }, [deliveryTypes]);

  const [timing, setTiming] = useState<Timing>((search.timing as Timing) ?? timings[0] ?? "now");
  useEffect(() => { if (!timings.includes(timing)) setTiming(timings[0]); }, [timings, timing]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [todayTime, setTodayTime] = useState("");

  const [attributes, setAttributes] = useState<Set<string>>(new Set());
  const toggleAttr = (k: string, on: boolean) => {
    const next = new Set(attributes);
    if (on) next.add(k); else next.delete(k);
    setAttributes(next);
  };

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [packageContents, setPackageContents] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [pickupReadyNow, setPickupReadyNow] = useState(true);
  const [pickupReadyTime, setPickupReadyTime] = useState("");
  const [pickupPrefilled, setPickupPrefilled] = useState(false);
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
    if (m.pickup_address && !pickupText) setPickupText(m.pickup_address);
    setPickupContactName(m.pickup_contact_name || m.name || m.business_name || "");
    setPickupContactPhone(m.pickup_contact_phone || m.phone || "");
    setPickupInstructions(m.pickup_instructions || "");
    setPickupPrefilled(true);
  }, [me, pickupPrefilled, pickupText]);

  useEffect(() => {
    if (!useBusinessAddress || !businessPickupAddress) return;
    if (pickup && pickup.address === businessPickupAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await geocodeAddrs({ data: { items: [{ id: "biz", address: businessPickupAddress }] } });
        const r = res?.[0];
        if (cancelled || r?.lat == null || r?.lng == null) return;
        setPickup({ address: businessPickupAddress, lat: r.lat, lng: r.lng } as SelectedPlace);
        setPickupText(businessPickupAddress);
      } catch { /* user can enter manually */ }
    })();
    return () => { cancelled = true; };
  }, [useBusinessAddress, businessPickupAddress, pickup, geocodeAddrs]);

  const defaultVehicle = category.serviceType === "moving" ? "רכב" : "אופנוע";
  const [vehicle, setVehicle] = useState(defaultVehicle);
  useEffect(() => {
    setVehicle(search.vehicle || (category.serviceType === "moving" ? "רכב" : "אופנוע"));
  }, [category.serviceType, search.vehicle]);

  const [dropoffFloor, setDropoffFloor] = useState("");
  const [dropoffApt, setDropoffApt] = useState("");
  const [dropoffEntry, setDropoffEntry] = useState("");
  const [pricingModel, setPricingModel] = useState<"fixed_price" | "distance_based" | "quote_request">("fixed_price");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [driveRoute, setDriveRoute] = useState<DrivingRoute | null>(null);
  const asDraftRef = useRef(false);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const collectFieldErrors = (scope: "route" | "details" | "all" = "all"): FieldErrors => {
    const errors: FieldErrors = {};
    if (scope === "route" || scope === "all") {
      if (!pickup) {
        errors.pickup = pickupText.trim() ? "בחרו כתובת מהרשימה (לא רק להקליד)" : "חובה לבחור כתובת איסוף";
      }
      if (!dropoff) {
        errors.dropoff = dropoffText.trim() ? "בחרו כתובת מהרשימה (לא רק להקליד)" : "חובה לבחור כתובת מסירה";
      }
    }
    if (scope === "details" || scope === "all") {
      if (!pickupContactName.trim()) errors.pickupContactName = "הזינו שם איש קשר באיסוף";
      if (!pickupContactPhone.trim()) errors.pickupContactPhone = "הזינו טלפון איש קשר באיסוף";
      else if (!isValidPhone(pickupContactPhone)) errors.pickupContactPhone = "מספר טלפון לא תקין";
      if (!pickupReadyNow && !pickupReadyTime) errors.pickupReadyTime = "בחרו שעה שבה החבילה תהיה מוכנה";
      if (timing === "scheduled" && !scheduledAt) errors.scheduledAt = "בחרו תאריך ושעה למשלוח מתוזמן";
    }
    if (scope === "all") {
      if (pricingModel === "fixed_price") {
        const price = Number(offeredPrice);
        if (!offeredPrice.trim()) errors.offeredPrice = "הזינו מחיר לשליח";
        else if (!Number.isFinite(price) || price <= 0) errors.offeredPrice = "המחיר חייב להיות גדול מ־0";
      }
      if (pricingModel === "distance_based") {
        if (!basePrice.trim() || !Number.isFinite(Number(basePrice)) || Number(basePrice) < 0) {
          errors.basePrice = "הזינו מחיר בסיס תקין";
        }
        if (!pricePerKm.trim() || !Number.isFinite(Number(pricePerKm)) || Number(pricePerKm) < 0) {
          errors.pricePerKm = "הזינו מחיר לק״מ תקין";
        }
      }
    }
    return errors;
  };

  const applyErrors = (errors: FieldErrors) => {
    setFieldErrors(errors);
    const count = Object.keys(errors).length;
    if (count === 0) return true;
    toast.error(count === 1 ? "יש להשלים שדה חובה אחד" : `יש ${count} שדות שדורשים תיקון`);
    window.setTimeout(() => {
      const first = Object.keys(errors)[0];
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return false;
  };

  const haversineDistance = useMemo(() => {
    if (!pickup || !dropoff) return null;
    return haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: dropoff.lat, lng: dropoff.lng });
  }, [pickup, dropoff]);

  const distanceKm = driveRoute?.distanceKm ?? haversineDistance;
  const extraStopCount = validExtraStops.length;
  const isHeavy = attributes.has("heavy");
  const { data: priceQuote } = useQuery({
    queryKey: ["compute-price", distanceKm, extraStopCount, isHeavy],
    enabled: distanceKm != null,
    queryFn: () => nestComputePrice({ distanceKm: distanceKm!, extraStops: extraStopCount, isHeavy }),
  });
  const suggestedPrice = priceQuote?.business_total != null ? Math.round(Number(priceQuote.business_total)) : null;

  const { data: activePricing } = useQuery({
    queryKey: ["pricing-active"],
    queryFn: nestGetPricing,
  });
  useEffect(() => {
    if (!activePricing) return;
    if (!basePrice) {
      const base = Number(activePricing.base_price);
      if (Number.isFinite(base)) setBasePrice(String(base));
    }
    if (!pricePerKm) {
      const perKm = Number(activePricing.price_per_km);
      if (Number.isFinite(perKm)) setPricePerKm(String(perKm));
    }
  }, [activePricing, basePrice, pricePerKm]);

  const distancePrice = useMemo(() => {
    if (distanceKm == null) return null;
    const b = Number(basePrice) || 0;
    const perKm = Number(pricePerKm) || 0;
    return Math.max(0, Math.round((b + perKm * distanceKm) * 100) / 100);
  }, [distanceKm, basePrice, pricePerKm]);

  const attemptSubmit = () => {
    asDraftRef.current = false;
    if (!me) {
      toast.error("חסר פרופיל עסק — השלימו את הפרופיל וחזרו לכאן");
      return;
    }
    if (!applyErrors(collectFieldErrors("all"))) return;
    submit.mutate();
  };

  const attemptDraft = () => {
    if (!pickup || !dropoff) {
      toast.error("בחרו כתובת איסוף ומסירה כדי לשמור טיוטה");
      return;
    }
    asDraftRef.current = true;
    submit.mutate();
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל עסק");
      if (!pickup || !dropoff) throw new Error("חסרות כתובות");

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
          const end = new Date(now);
          end.setHours(20, 0, 0, 0);
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
        ? `מאפיינים: ${attrList.map((k) => category.attributes.find((a) => a.key === k)?.label ?? k).join(", ")}`
        : "";
      const stopsNote = validExtraStops.length
        ? `יעדים נוספים לאותו שליח: ${validExtraStops
            .map((s, i) => `${i + 2}. ${s.place!.address}${s.name ? ` (${s.name}${s.phone ? ` · ${s.phone}` : ""})` : ""}`)
            .join(" | ")}`
        : "";
      const addressBits: string[] = [];
      if (dropoffFloor) addressBits.push(`קומה ${dropoffFloor}`);
      if (dropoffApt) addressBits.push(`דירה ${dropoffApt}`);
      if (dropoffEntry) addressBits.push(`כניסה/קוד: ${dropoffEntry}`);
      const addressNote = addressBits.length ? `יעד: ${addressBits.join(" · ")}` : "";
      const fullNotes = [attrNote, stopsNote, addressNote, packageContents && `תכולה: ${packageContents}`, packageWeight && `משקל: ${packageWeight}`, notes].filter(Boolean).join(" · ");

      const price =
        pricingModel === "fixed_price"
          ? Number(offeredPrice) || 0
          : pricingModel === "distance_based"
            ? distancePrice ?? 0
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
        order_number: orderNumber.trim() || null,
        status: asDraftRef.current ? "טיוטה" : "נשלחה לשליחים",
      };

      const data = await nestCreateJob(payload);
      const isDraft = asDraftRef.current;
      asDraftRef.current = false;
      geocode({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));

      if (isDraft) {
        toast.success("הטיוטה נשמרה");
        return data;
      }

      if (pricingModel === "quote_request") {
        notify({ data: { jobId: data.id } }).catch((e) => console.error(e));
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
      toast.success("המשלוח נוצר");
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="משלוח חדש">
      <BusinessNewOrder
        pickupText={pickupText}
        pickup={pickup}
        onPickupText={(v) => { setPickupText(v); if (!v) setPickup(null); clearFieldError("pickup"); }}
        onPickupSelect={(p) => { setPickup(p); setPickupText(p.address); clearFieldError("pickup"); }}
        pickupError={fieldErrors.pickup}
        useBusinessAddress={useBusinessAddress}
        businessPickupAddress={businessPickupAddress}
        onUseBusinessAddress={() => { setUseBusinessAddress(true); clearFieldError("pickup"); }}
        onChangePickupAddress={() => { setUseBusinessAddress(false); setPickup(null); setPickupText(""); clearFieldError("pickup"); }}
        dropoffText={dropoffText}
        dropoff={dropoff}
        onDropoffText={(v) => { setDropoffText(v); if (!v) setDropoff(null); clearFieldError("dropoff"); }}
        onDropoffSelect={(p) => { setDropoff(p); setDropoffText(p.address); clearFieldError("dropoff"); }}
        dropoffError={fieldErrors.dropoff}
        extraStops={extraStops}
        setExtraStops={setExtraStops}
        waypoints={waypoints}
        onRoute={setDriveRoute}
        route={driveRoute}
        pickupContactName={pickupContactName}
        onPickupContactName={(v) => { setPickupContactName(v); clearFieldError("pickupContactName"); }}
        pickupContactNameError={fieldErrors.pickupContactName}
        pickupContactPhone={pickupContactPhone}
        onPickupContactPhone={(v) => { setPickupContactPhone(v); clearFieldError("pickupContactPhone"); }}
        pickupContactPhoneError={fieldErrors.pickupContactPhone}
        pickupInstructions={pickupInstructions}
        onPickupInstructions={setPickupInstructions}
        pickupReadyNow={pickupReadyNow}
        onPickupReadyNow={setPickupReadyNow}
        pickupReadyTime={pickupReadyTime}
        onPickupReadyTime={(v) => { setPickupReadyTime(v); clearFieldError("pickupReadyTime"); }}
        pickupReadyTimeError={fieldErrors.pickupReadyTime}
        timing={timing}
        timings={timings}
        onTiming={setTiming}
        scheduledAt={scheduledAt}
        onScheduledAt={(v) => { setScheduledAt(v); clearFieldError("scheduledAt"); }}
        scheduledAtError={fieldErrors.scheduledAt}
        todayTime={todayTime}
        onTodayTime={setTodayTime}
        deliveryTypes={deliveryTypes}
        deliveryType={deliveryType}
        onDeliveryType={setDeliveryType}
        contents={packageContents}
        onContents={setPackageContents}
        packageWeight={packageWeight}
        onPackageWeight={setPackageWeight}
        vehicle={vehicle}
        onVehicle={setVehicle}
        fragile={attributes.has("fragile")}
        onFragile={(v) => toggleAttr("fragile", v)}
        signature={attributes.has("signature")}
        onSignature={(v) => toggleAttr("signature", v)}
        recipientName={recipientName}
        onRecipientName={setRecipientName}
        recipientPhone={recipientPhone}
        onRecipientPhone={setRecipientPhone}
        dropoffFloor={dropoffFloor}
        onDropoffFloor={setDropoffFloor}
        dropoffApt={dropoffApt}
        onDropoffApt={setDropoffApt}
        dropoffEntry={dropoffEntry}
        onDropoffEntry={setDropoffEntry}
        dropoffNotes={notes}
        onDropoffNotes={setNotes}
        orderNumber={orderNumber}
        onOrderNumber={setOrderNumber}
        suggestedPrice={suggestedPrice}
        offeredPrice={offeredPrice}
        onOfferedPrice={(v) => { setOfferedPrice(v); clearFieldError("offeredPrice"); }}
        priceError={fieldErrors.offeredPrice}
        pricingModel={pricingModel}
        onPricingModel={setPricingModel}
        basePrice={basePrice}
        onBasePrice={(v) => { setBasePrice(v); clearFieldError("basePrice"); }}
        basePriceError={fieldErrors.basePrice}
        pricePerKm={pricePerKm}
        onPricePerKm={(v) => { setPricePerKm(v); clearFieldError("pricePerKm"); }}
        pricePerKmError={fieldErrors.pricePerKm}
        pending={submit.isPending}
        onSubmit={attemptSubmit}
        onDraft={attemptDraft}
        onValidateRoute={() => applyErrors(collectFieldErrors("route"))}
        onValidateDetails={() => applyErrors(collectFieldErrors("details"))}
      />
    </BusinessShell>
  );
}

function extractCity(address: string): string | null {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const COUNTRY = new Set(["ישראל", "Israel", "israel"]);
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && COUNTRY.has(last)) return parts[parts.length - 2];
  return last;
}
