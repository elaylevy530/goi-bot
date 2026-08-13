import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { PaymentLockGate } from "@/components/PaymentGate";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Truck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  MultiStopBuilder,
  emptyPickup,
  emptyDropoff,
  type MultiStop,
} from "@/components/MultiStopBuilder";
import { createMultiStopJob } from "@/lib/multi-stop.functions";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { nestComputePrice, nestGetPricing } from "@/lib/nest-domain";

export const Route = createFileRoute("/business/new-multi-delivery")({
  head: () => ({ meta: [{ title: "משלוח מרובה נקודות — Goi" }] }),
  ssr: false,
  component: NewMultiDeliveryPage,
});

function NewMultiDeliveryPage() {
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const createFn = useServerFn(createMultiStopJob);
  const dispatchFn = useServerFn(dispatchJobToCouriers);


  const [stops, setStops] = useState<MultiStop[]>(() => [
    emptyPickup(),
    emptyDropoff(),
  ]);
  const [vehicle, setVehicle] = useState<string>("");
  const [when, setWhen] = useState<"now" | "scheduled">("now");
  const [jobDate, setJobDate] = useState<string>("");
  const [jobTime, setJobTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [pricingType, setPricingType] = useState<"fixed_price" | "distance_based" | "quote_request">("fixed_price");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [pricePerKm, setPricePerKm] = useState<string>("");

  const pickups = stops.filter((s) => s.stop_type === "pickup");
  const dropoffs = stops.filter((s) => s.stop_type === "dropoff");

  const routeKm = useMemo(() => {
    const pts = stops
      .map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (pts.length < 2) return null;
    const R = 6371;
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLon = ((b.lng - a.lng) * Math.PI) / 180;
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      sum += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }
    return sum;
  }, [stops]);

  const extraStopCount = Math.max(0, stops.filter((s) => s.address.trim()).length - 2);
  const { data: priceQuote } = useQuery({
    queryKey: ["compute-price-multi", routeKm, extraStopCount],
    enabled: routeKm != null,
    queryFn: () =>
      nestComputePrice({
        distanceKm: routeKm!,
        extraStops: extraStopCount,
      }),
  });
  const suggestedPrice =
    priceQuote?.business_total != null ? Math.round(Number(priceQuote.business_total)) : null;

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

  const validate = () => {
    if (pickups.length === 0) return "חובה להוסיף לפחות נקודת איסוף אחת";
    if (dropoffs.length === 0) return "חובה להוסיף לפחות נקודת מסירה אחת";
    if (stops.length > 12) return "עד 12 נקודות בסך הכל";
    for (const s of stops) {
      if (!s.address?.trim()) return "כל נקודה חייבת כתובת";
    }
    if (when === "scheduled" && (!jobDate || !jobTime))
      return "אם בחרת תזמון — חובה תאריך ושעה";
    return null;
  };

  const create = useMutation({
    mutationFn: async () => {
      const err = validate();
      if (err) throw new Error(err);
      const res = await createFn({
        data: {
          stops,
          vehicle_required: vehicle || null,
          when: {
            mode: when,
            job_date: when === "scheduled" ? jobDate : null,
            job_time: when === "scheduled" ? jobTime : null,
          },
          notes: notes || null,
          payment: pricingType === "fixed_price"
            ? Number(customPrice) || suggestedPrice || null
            : null,
          pricing_type: pricingType,
          base_price: pricingType === "distance_based" ? Number(basePrice) || 0 : null,
          price_per_km: pricingType === "distance_based" ? Number(pricePerKm) || 0 : null,
          auto_optimize: true,
        },
      });
      // Quote-request jobs wait for courier bids; others dispatch immediately
      if (pricingType !== "quote_request") {
        await dispatchFn({ data: { jobId: res.jobId } });
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(
        pricingType === "quote_request"
          ? `נוצרה בקשת הצעה ${res.jobNumber} — ממתינים להצעות שליחים`
          : `נוצר משלוח ${res.jobNumber} ונשלח לשליחים`,
      );
      navigate({ to: "/business/orders" });
    },
    onError: (e: any) => toast.error(e?.message || "שגיאה ביצירת המשלוח"),
  });

  const hasPayment = !!(me as { payment_method_on_file?: boolean } | null)?.payment_method_on_file;
  if (me && !hasPayment) {
    return (
      <BusinessShell title="משלוח מרובה נקודות">
        <PaymentLockGate title="לא ניתן לשדר משלוח חדש" />
      </BusinessShell>
    );
  }

  return (
    <BusinessShell title="משלוח מרובה נקודות">
      <div className="max-w-3xl mx-auto space-y-5" dir="rtl">

        <Card className="rounded-2xl border-[#35AD29]/30 bg-gradient-to-l from-emerald-50 to-white">
          <CardContent className="p-5 flex gap-3">
            <div className="size-12 rounded-xl bg-[#35AD29] text-white grid place-items-center shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900">משלוח מרובה נקודות</h2>
              <p className="text-sm text-slate-600 mt-1">
                שליח אחד אוסף מכמה נקודות ומוסר לכמה לקוחות — בנסיעה אחת. חוסך בעלויות וקיצור זמני המתנה.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* פרטי משלוח — בראש הדף */}
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold">פרטי משלוח</h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">סוג רכב נדרש</Label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="לא משנה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="הולך רגל">הולך רגל</SelectItem>
                    <SelectItem value="אופניים">אופניים</SelectItem>
                    <SelectItem value="קורקינט / אופנוע">קורקינט / אופנוע</SelectItem>
                    <SelectItem value="רכב">רכב</SelectItem>
                    <SelectItem value="טנדר">טנדר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">מתי?</Label>
                <Select value={when} onValueChange={(v) => setWhen(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">עכשיו (ASAP)</SelectItem>
                    <SelectItem value="scheduled">תזמון</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {when === "scheduled" && (
                <>
                  <div>
                    <Label className="text-xs">תאריך</Label>
                    <Input
                      type="date"
                      value={jobDate}
                      onChange={(e) => setJobDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">שעה</Label>
                    <Input
                      type="time"
                      value={jobTime}
                      onChange={(e) => setJobTime(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <Label className="text-xs">הערות לשליח</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="לדוגמה: מתחילים מהמסעדה, להתקשר 5 דק׳ לפני כל מסירה"
              />
            </div>
          </CardContent>
        </Card>

        {/* נקודות המסלול */}
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-bold mb-3">נקודות המסלול</h3>
            <MultiStopBuilder stops={stops} onChange={setStops} />
            <div className="text-xs text-slate-500 mt-3">
              סה"כ {pickups.length} איסופים · {dropoffs.length} מסירות
            </div>
          </CardContent>
        </Card>

        {/* מסלול הצעת מחיר לשליחים */}
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold">איך מציעים את העבודה לשליחים?</h3>
            <p className="text-xs text-slate-500 -mt-2">
              בחר את שיטת התמחור — לפי זה ההצעה תופץ לשליחים והם יאשרו.
            </p>

            <div className="grid gap-2">
              {[
                { id: "fixed_price", title: "מחיר קבוע", desc: "אתה קובע סכום — הראשון שמאשר לוקח את המשלוח" },
                { id: "distance_based", title: "לפי מרחק (ק״מ)", desc: "מחיר בסיס + ₪ לק״מ — מחושב אוטומטית" },
                { id: "quote_request", title: "בקשת הצעות מחיר", desc: "שליחים מציעים מחיר ואתה בוחר את המתאים" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPricingType(opt.id as any)}
                  className={`text-right rounded-xl border p-3 transition ${
                    pricingType === opt.id
                      ? "border-[#35AD29] bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-bold text-sm">{opt.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {pricingType === "fixed_price" && (
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-600">תשלום לשליח</div>
                  <div className="text-2xl font-extrabold text-[#35AD29]">
                    ₪{customPrice || (suggestedPrice == null ? "—" : suggestedPrice)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder={suggestedPrice == null ? "מחיר לפי תמחור המערכת" : `מומלץ ₪${suggestedPrice}`}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCustomPrice("")}>
                    אוטומטי
                  </Button>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {suggestedPrice == null
                    ? "המחיר יחושב אחרי בחירת כתובות עם מיקום"
                    : `לפי תמחור המערכת · ${stops.length} עצירות · ניתן לערוך`}
                </div>
              </div>
            )}

            {pricingType === "distance_based" && (
              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">מחיר בסיס (₪)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">₪ לק״מ</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={pricePerKm}
                      onChange={(e) => setPricePerKm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  המחיר הסופי יחושב לפי המרחק בפועל בין כל הנקודות.
                </div>
              </div>
            )}

            {pricingType === "quote_request" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                ההצעה תופץ לשליחים מתאימים והם יציעו מחיר. תוכל לבחור את ההצעה המועדפת מתוך "בקשות הצעה" בפאנל.
              </div>
            )}
          </CardContent>
        </Card>



        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t p-4 -mx-4">
          <Button
            disabled={create.isPending}
            onClick={() => create.mutate()}
            className="w-full h-14 bg-[#35AD29] hover:bg-[#2E9A24] text-white text-lg font-bold gap-2"
          >
            {create.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Send className="size-5" />
                שליחה לשליחים
                <Truck className="size-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </BusinessShell>
  );
}
