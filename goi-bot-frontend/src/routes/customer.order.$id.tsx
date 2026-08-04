import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyOrderFn, cancelMyOrderFn, sendCourierMessageFn,
  getMyQuotesFn, selectMyQuoteFn, repriceMyOrderFn,
} from "@/lib/customer-account.functions";
import {
  getGuestOrderDetailFn, cancelGuestOrderFn, getGuestJobQuotesFn, selectGuestJobQuoteFn,
  repriceGuestOrderFn,
} from "@/lib/guest-order.functions";
import { guestTokenFor } from "@/lib/guest-session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowRight, MapPin, Package, User as UserIcon, Phone, Bike, Ban, ExternalLink, Loader2,
  CheckCircle2, Circle, MessageCircle, Send, Calendar, Clock, CreditCard, Hash, Info, Tag,
  Radar, Star, Zap, Wallet,
} from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/customer/order/$id")({
  head: () => ({ meta: [{ title: "פרטי הזמנה — Goi" }] }),
  component: OrderDetailPage,
});

const STATUS_STYLES: Record<string, string> = {
  "טיוטה": "bg-black/5 text-[#101418]/70",
  "נשלחה לשליחים": "bg-[#E4F0FF] text-[#0B5FCC]",
  "נבחר שליח": "bg-[#F1E7FF] text-[#5B21B6]",
  "פעילה": "bg-[#FFF3D6] text-[#8A6100]",
  "הושלמה": "bg-[#E6F7EF] text-[#0E7A4A]",
  "בוטלה": "bg-red-50 text-red-700",
};

// Mirrors exactly the steps the courier/mover marks in his panel
const TIMELINE = [
  { key: "created", label: "הזמנה נוצרה", desc: "הפרטים נקלטו במערכת" },
  { key: "searching", label: "מחפשים מוביל", desc: "ההזמנה נשלחה למובילים באזור" },
  { key: "assigned", label: "מוביל שובץ", desc: "המוביל אישר את העבודה" },
  { key: "to_pickup", label: "בדרך לאיסוף", desc: "המוביל יצא לכתובת האיסוף" },
  { key: "picked_up", label: "נאסף — בדרך ליעד", desc: "הפריטים נאספו והמוביל בדרך" },
  { key: "delivered", label: "הושלם", desc: "ההובלה בוצעה בהצלחה" },
] as const;

// courier_step values written by the courier panel
function timelineIndex(job: { status: string; courier_step?: string | null; selected_courier_id?: string | null }) {
  const step = job.courier_step ?? null;
  if (job.status === "הושלמה" || step === "נמסר") return 5;
  if (step === "אספתי") return 4;
  if (step === "בדרך לאיסוף") return 3;
  if (step === "שליח אישר" || job.selected_courier_id) return 2;
  if (job.status === "נשלחה לשליחים" || job.status === "ממתינה לתגובות" || job.status === "יש שליחים שאישרו") return 1;
  return 0;
}


const SERVICE_LABEL: Record<string, string> = {
  same_day: "משלוח מיידי",
  scheduled: "משלוח מתוזמן",
  small_move: "הובלה קטנה",
  big_move: "הובלה גדולה",
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getOrder = useServerFn(getMyOrderFn);
  const getGuestOrder = useServerFn(getGuestOrderDetailFn);
  const cancelOrder = useServerFn(cancelMyOrderFn);
  const cancelGuest = useServerFn(cancelGuestOrderFn);
  const sendMsg = useServerFn(sendCourierMessageFn);
  // Guests reach their own order through the tracking token stored locally
  // when they placed it — no account needed.
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  useEffect(() => {
    setGuestToken(guestTokenFor(id));
    setTokenReady(true);
  }, [id]);
  const isGuestOrder = !!guestToken;

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-order", id, isGuestOrder ? "guest" : "auth"],
    enabled: tokenReady,
    refetchInterval: 5000,
    queryFn: () =>
      guestToken
        ? getGuestOrder({ data: { job_id: id, tracking_token: guestToken } })
        : getOrder({ data: { id } }),
  });

  const cancel = useMutation({
    mutationFn: () =>
      guestToken
        ? cancelGuest({ data: { job_id: id, tracking_token: guestToken } })
        : cancelOrder({ data: { id } }),
    onSuccess: () => {
      toast.success("ההזמנה בוטלה");
      qc.invalidateQueries({ queryKey: ["my-order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "לא ניתן לבטל"),
  });

  const repriceGuest = useServerFn(repriceGuestOrderFn);
  const repriceMine = useServerFn(repriceMyOrderFn);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceText, setPriceText] = useState("");
  const reprice = useMutation({
    mutationFn: (p: number) =>
      guestToken
        ? repriceGuest({ data: { job_id: id, tracking_token: guestToken, price: p } })
        : repriceMine({ data: { id, price: p } }),
    onSuccess: () => {
      toast.success("המחיר עודכן וההזמנה נשלחה מחדש לקבוצה");
      setPriceOpen(false);
      qc.invalidateQueries({ queryKey: ["my-order", id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "עדכון המחיר נכשל"),
  });

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [preset, setPreset] = useState<string | null>(null);

  const canChat = !isGuestOrder;
  const sendMessage = useMutation({
    mutationFn: (message: string) => sendMsg({ data: { job_id: id, message } }),
    onSuccess: () => {
      toast.success("ההודעה נשלחה למוביל דרך הבוט");
      setMsgOpen(false);
      setMsgText("");
      setPreset(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "שליחת ההודעה נכשלה"),
  });

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-[#101418]/50">טוען פרטי הזמנה…</div>;
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <p className="text-red-600">לא נמצאה הזמנה.</p>
        <Button asChild variant="outline"><Link to="/customer/activity">חזרה לרשימה</Link></Button>
      </div>
    );
  }

  const { job, courier, payment } = data as typeof data & { payment?: { total: number; payment_mode: string; deposit_percent: number; prepaid: number; remaining: number } };
  const activeStep = timelineIndex(job as any);
  const courierStepLabel = job.status === "בוטלה" ? "בוטלה" : (TIMELINE[activeStep]?.label ?? job.status);

  const canCancel = !job.selected_courier_id && !["הושלמה", "בוטלה", "פעילה"].includes(job.status);
  const canReprice = canCancel && job.pricing_type !== "quote_request";
  const canMessageCourier = Boolean(job.selected_courier_id) && !["הושלמה", "בוטלה"].includes(job.status);

  const presets = [
    "מגיע לאיסוף בעוד כמה דקות?",
    "יש שינוי בכתובת האיסוף",
    "יש שינוי בכתובת המסירה",
    "אנא צלצל לפני שאתה מגיע",
    "עדכון: קוד לבניין / כניסה",
  ];

  const submitMessage = () => {
    const finalText = [preset, msgText.trim()].filter(Boolean).join(preset && msgText.trim() ? " — " : "");
    if (!finalText) { toast.error("הוסף טקסט להודעה"); return; }
    sendMessage.mutate(finalText);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
      <button
        onClick={() => navigate({ to: "/customer/activity" })}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#101418]/60 hover:text-[#101418]"
      >
        <ArrowRight className="size-4" /> חזרה
      </button>

      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-5 relative overflow-hidden">
        <div className="absolute -left-6 -top-10 size-32 rounded-full bg-[#F5C518]/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
              {SERVICE_LABEL[job.service_category ?? ""] ?? "הזמנה"}
            </div>
            <h1 className="text-3xl font-extrabold mt-0.5">#{job.job_number}</h1>
            <div className="text-xs text-white/60 mt-1">
              נפתחה ב-{new Date(job.created_at).toLocaleString("he-IL")}
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLES[job.status] ?? "bg-white/10 text-white"}`}>
            {courierStepLabel}
          </span>

        </div>

        {job.customer_price ? (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-white/70">
              {job.per_job_paid ? "שולם" : job.pricing_type === "quote_request" ? "בהמתנה להצעות" : "לתשלום"}
            </span>
            <span className="text-2xl font-extrabold text-[#F5C518]">₪{Number(job.customer_price).toFixed(0)}</span>
          </div>
        ) : null}
      </div>

      {/* Searching radar — only while awaiting a courier */}
      {!job.selected_courier_id && !["הושלמה", "בוטלה"].includes(job.status) && (
        <SearchingRadar
          jobId={id}
          pricingType={job.pricing_type ?? null}
          guestToken={guestToken}
        />
      )}

      {/* Timeline — vertical with descriptions + realtime */}

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-[#101418]/50 uppercase tracking-widest">התקדמות</div>
          <span className="text-[10px] font-bold text-[#0E7A4A] bg-[#E6F7EF] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[#0E7A4A] animate-pulse" /> בזמן אמת
          </span>
        </div>
        <div className="relative">
          <div className="absolute right-[9px] top-2 bottom-2 w-px bg-black/10" />
          {TIMELINE.map((t, i) => {
            const done = i <= activeStep;
            const isCurrent = i === activeStep;
            return (
              <div key={t.key} className="flex items-start gap-3 relative pb-4 last:pb-0">
                <div className="relative z-10 bg-white">
                  {done ? (
                    <CheckCircle2 className={`size-5 ${isCurrent ? "text-[#F5C518]" : "text-[#0E7A4A]"}`} />
                  ) : (
                    <Circle className="size-5 text-black/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`text-sm ${done ? "font-bold text-[#101418]" : "text-[#101418]/40"}`}>
                      {t.label}
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-[#8A6100] bg-[#FFF3D6] px-1.5 py-0.5 rounded-full">
                        עכשיו
                      </span>
                    )}
                  </div>
                  <div className={`text-xs mt-0.5 ${done ? "text-[#101418]/60" : "text-[#101418]/30"}`}>
                    {t.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route card */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="text-xs font-bold text-[#101418]/50 uppercase tracking-widest mb-4">מסלול</div>
        <div className="relative">
          <div className="absolute right-[9px] top-6 bottom-6 w-px bg-black/10" />
          <div className="flex items-start gap-3 mb-4">
            <div className="size-5 rounded-full bg-[#0E7A4A] ring-4 ring-[#E6F7EF] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#101418]/50 uppercase">איסוף</div>
              <div className="font-semibold text-[#101418] mt-0.5">{job.pickup_address ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-5 rounded-full bg-[#DC2626] ring-4 ring-red-50 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#101418]/50 uppercase">מסירה</div>
              <div className="font-semibold text-[#101418] mt-0.5">{job.dropoff_address ?? "—"}</div>
              {job.recipient_name || job.recipient_phone ? (
                <div className="text-xs text-[#101418]/50 mt-1">
                  {job.recipient_name}{job.recipient_phone ? ` · ${job.recipient_phone}` : ""}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* All order details — organized grid */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="text-xs font-bold text-[#101418]/50 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Info className="size-3.5" /> פרטי ההזמנה
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem icon={Hash} label="מספר הזמנה" value={`#${job.job_number}`} />
          <DetailItem icon={Tag} label="סוג שירות" value={SERVICE_LABEL[job.service_category ?? ""] ?? "—"} />
          {job.job_date && <DetailItem icon={Calendar} label="תאריך" value={new Date(job.job_date).toLocaleDateString("he-IL")} />}
          {job.job_time && <DetailItem icon={Clock} label="שעה" value={String(job.job_time).slice(0, 5)} />}
          <DetailItem
            icon={CreditCard}
            label="תשלום"
            value={job.per_job_paid ? "שולם ✓" : job.pricing_type === "quote_request" ? "בהמתנה להצעות" : "טרם שולם"}
          />
          {job.customer_price ? (
            <DetailItem icon={CreditCard} label="מחיר" value={`₪${Number(job.customer_price).toFixed(0)}`} />
          ) : null}
        </div>

        {(job.guest_name || job.guest_phone) && (
          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="text-[11px] font-bold text-[#101418]/50 uppercase mb-2">שולח</div>
            <div className="text-sm text-[#101418]">
              {job.guest_name ?? "—"}
              {job.guest_phone ? <span className="text-[#101418]/50"> · {job.guest_phone}</span> : null}
            </div>
          </div>
        )}

        {job.description && (
          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="text-[11px] font-bold text-[#101418]/50 uppercase mb-1.5 flex items-center gap-1.5">
              <Package className="size-3.5" /> תיאור / פריטים
            </div>
            <div className="text-sm text-[#101418] whitespace-pre-wrap">{job.description}</div>
          </div>
        )}
      </div>

      {/* Payment summary — what was paid and what's left for the mover */}
      {payment && payment.total > 0 && (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="text-xs font-bold text-[#101418]/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Wallet className="size-3.5" /> תשלום
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#101418]/60">סה״כ ההובלה</span>
              <span className="font-bold">₪{payment.total.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#101418]/60">
                שולם מראש{payment.deposit_percent ? ` (${payment.deposit_percent}% מקדמה)` : ""}
              </span>
              <span className="font-bold text-[#0E7A4A]">₪{payment.prepaid.toFixed(0)}</span>
            </div>
            <div className="mt-2 rounded-xl bg-[#FFF9E6] ring-1 ring-[#F5C518]/40 p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#8A6100] uppercase">להשלמה למוביל בסיום</div>
                <div className="text-[11px] text-[#101418]/50 mt-0.5">במזומן / העברה ישירות למוביל</div>
              </div>
              <div className="text-2xl font-black text-[#101418]">₪{payment.remaining.toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Courier card + message action */}
      {courier && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 space-y-3">
          <div className="flex items-center gap-3">
            {courier.avatar_url ? (
              <img
                src={courier.avatar_url}
                alt={courier.full_name ?? "מוביל"}
                className="size-16 rounded-2xl object-cover ring-2 ring-[#F5C518]/40"
              />
            ) : (
              <div className="size-16 rounded-2xl bg-[#F5C518]/15 text-[#8A6100] grid place-items-center text-xl font-black">
                {(courier.full_name ?? "מ").trim().charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#101418]/50 uppercase">
                {courier.courier_kind === "mover" ? "המוביל שלך" : "השליח שלך"}
              </div>
              <div className="font-extrabold text-lg leading-tight truncate">
                {courier.full_name ?? "מוביל"}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {courier.avg_rating != null && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-[#FFF3D6] text-[#8A6100] px-2 py-0.5 rounded-full">
                    <Star className="size-3 fill-[#F5C518] text-[#F5C518]" />
                    {courier.avg_rating.toFixed(1)}
                  </span>
                )}
                {(courier.vehicle_label || courier.vehicle_type) && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#101418]/60">
                    <Bike className="size-3.5" /> {courier.vehicle_label || courier.vehicle_type}
                  </span>
                )}
                {courier.base_city && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#101418]/60">
                    <MapPin className="size-3.5" /> {courier.base_city}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatBox label="הובלות" value={courier.jobs_completed != null ? String(courier.jobs_completed) : "—"} />
            <StatBox label="בזמן" value={courier.on_time_rate != null ? `${Math.round(courier.on_time_rate)}%` : "—"} />
            <StatBox
              label="ותק"
              value={courier.member_since ? `${new Date(courier.member_since).getFullYear()}` : "—"}
            />
          </div>

          {courier.bio && (
            <div className="text-xs text-[#101418]/60 bg-[#f5f6f8] rounded-xl p-3">{courier.bio}</div>
          )}

          {courier.whatsapp_phone && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/${courier.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                className="rounded-xl bg-[#25D366] text-white text-sm font-bold py-2.5 inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="size-4" /> וואטסאפ
              </a>
              <a
                href={`tel:${courier.whatsapp_phone}`}
                className="rounded-xl bg-[#101418] text-white text-sm font-bold py-2.5 inline-flex items-center justify-center gap-2"
              >
                <Phone className="size-4" /> חיוג
              </a>
            </div>
          )}


          {canMessageCourier && canChat && (
            <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
              <DialogTrigger asChild>
                <button className="w-full rounded-xl bg-[#101418] hover:bg-[#101418]/90 text-white text-sm font-bold py-3 inline-flex items-center justify-center gap-2 transition">
                  <Send className="size-4" /> שלח עדכון / בקשה דרך הבוט
                </button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader className="text-right">
                  <DialogTitle>שליחת עדכון למוביל</DialogTitle>
                  <DialogDescription>
                    ההודעה תישלח למוביל בוואטסאפ דרך הבוט שלנו, עם מספר ההזמנה והשם שלך.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-[#101418]/60 mb-2">תבניות מהירות</div>
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPreset(preset === p ? null : p)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            preset === p
                              ? "bg-[#101418] text-white border-[#101418]"
                              : "bg-white text-[#101418]/70 border-black/10 hover:border-black/25"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#101418]/60 mb-2">
                      {preset ? "פרטים נוספים (אופציונלי)" : "הודעה חופשית"}
                    </div>
                    <Textarea
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder={preset ? "פרט אם צריך…" : "כתוב למוביל מה שאתה רוצה לעדכן…"}
                      className="resize-none"
                    />
                    <div className="text-[11px] text-[#101418]/40 mt-1 text-left">{msgText.length}/500</div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="ghost" onClick={() => setMsgOpen(false)}>ביטול</Button>
                  <Button
                    onClick={submitMessage}
                    disabled={sendMessage.isPending || (!preset && !msgText.trim())}
                    className="bg-[#25D366] hover:bg-[#1eb85a] text-white"
                  >
                    {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    שלח למוביל
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {job.recipient_tracking_token && (
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/track/$token" params={{ token: job.recipient_tracking_token }}>
              <MapPin className="size-4" /> מעקב חי <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
        {canReprice && (
          <Dialog
            open={priceOpen}
            onOpenChange={(o) => {
              setPriceOpen(o);
              if (o) {
                setPriceText(
                  job.customer_price ? String(Math.round(Number(job.customer_price))) : "",
                );
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <Tag className="size-4" /> עריכת מחיר ושליחה מחדש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-sm">
              <DialogHeader className="text-end">
                <DialogTitle>עדכון מחיר ההזמנה</DialogTitle>
                <DialogDescription>
                  המחיר החדש יעודכן בהזמנה וההובלה תישלח מחדש לקבוצת הוואטסאפ.
                </DialogDescription>
              </DialogHeader>
              <div className="text-end space-y-2">
                <label className="text-sm font-bold">מחיר חדש (₪)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-lg font-bold text-end"
                  placeholder="0"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setPriceOpen(false)}>ביטול</Button>
                <Button
                  className="rounded-full"
                  disabled={reprice.isPending || !(Number(priceText) > 0)}
                  onClick={() => reprice.mutate(Number(priceText))}
                >
                  {reprice.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  עדכן ושלח מחדש
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {canCancel && (
          <Button
            variant="destructive"
            className="rounded-full mr-auto"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            ביטול הזמנה
          </Button>
        )}
      </div>
    </div>
  );
}

/* ================= SearchingRadar (Gett-style "matching" screen) ================= */
function SearchingRadar({ jobId, pricingType, guestToken }: { jobId: string; pricingType: string | null; guestToken?: string | null }) {
  const qc = useQueryClient();
  const getQuotes = useServerFn(getMyQuotesFn);
  const selectQuote = useServerFn(selectMyQuoteFn);
  const getGuestQuotes = useServerFn(getGuestJobQuotesFn);
  const selectGuestQuote = useServerFn(selectGuestJobQuoteFn);

  const [detailQuote, setDetailQuote] = useState<any>(null);
  const isQuoteFlow = pricingType === "quote_request";
  const { data: quotes = [] } = useQuery({
    queryKey: ["my-quotes", jobId],
    queryFn: async () => {
      if (!guestToken) return await getQuotes({ data: { job_id: jobId } });
      // Normalize the token-based guest payload into the authenticated shape
      const res = await getGuestQuotes({ data: { job_id: jobId, tracking_token: guestToken } });
      return (res.quotes ?? []).map((q) => ({
        id: q.id,
        price: q.price,
        note: q.note,
        estimated_arrival_minutes: q.eta_minutes,
        courier_rating_snapshot: q.rating,
        courier_completed_jobs_snapshot: q.completed_jobs,
        status: "pending",
        created_at: q.created_at,
        courier_id: q.courier_id,
        couriers: { full_name: q.courier_name, whatsapp_phone: null as string | null },
      }));
    },
    refetchInterval: isQuoteFlow ? 5000 : false,
    enabled: isQuoteFlow,
  });

  const pickQuote = useMutation({
    mutationFn: (quote_id: string) =>
      guestToken
        ? selectGuestQuote({ data: { job_id: jobId, tracking_token: guestToken, quote_id } })
        : selectQuote({ data: { job_id: jobId, quote_id } }),
    onSuccess: () => {
      toast.success("בחרת מוביל! הוא בדרך אליך.");
      qc.invalidateQueries({ queryKey: ["my-order", jobId] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "לא ניתן לבחור הצעה זו"),
  });

  const openQuotes = (quotes as Array<any>).filter((q) => q.status !== "rejected" && q.status !== "cancelled");
  const hasQuotes = openQuotes.length > 0;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#101418] via-[#161a20] to-[#2a2f36] text-white p-6 relative overflow-hidden ring-1 ring-white/5">
      {/* animated radar */}
      <div className="relative mx-auto size-40 mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-[#F5C518]/40 animate-ping"
            style={{ animationDelay: `${i * 0.8}s`, animationDuration: "2.4s" }}
          />
        ))}
        <div className="absolute inset-6 rounded-full bg-[#F5C518]/10 grid place-items-center">
          <div className="absolute inset-3 rounded-full bg-[#F5C518]/20" />
          <Radar className="size-9 text-[#F5C518] relative animate-spin" style={{ animationDuration: "3.5s" }} />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s" }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-8 rounded-full bg-white text-[#101418] grid place-items-center shadow-lg ring-2 ring-[#F5C518]">
            <Bike className="size-4" />
          </div>
        </div>
      </div>

      <div className="text-center relative">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#F5C518] mb-1 inline-flex items-center gap-1.5">
          <Zap className="size-3" /> סורק מובילים
        </div>
        <h3 className="text-xl font-extrabold">
          {isQuoteFlow
            ? hasQuotes ? `${openQuotes.length} הצעות זמינות!` : "אוסף הצעות מחיר…"
            : "מחפשים לך מוביל קרוב…"}
        </h3>
        <p className="text-sm text-white/60 mt-1">
          {isQuoteFlow ? "בחר את ההצעה המתאימה לך למטה" : "המערכת מציעה את ההובלה למובילים באזור. תוך רגעים אחד יאשר."}
        </p>
      </div>

      {isQuoteFlow && hasQuotes && (
        <div className="mt-5 space-y-2 relative">
          {openQuotes
            .sort((a: any, b: any) => Number(a.price) - Number(b.price))
            .map((q: any, i: number) => (
              <button
                key={q.id}
                onClick={() => setDetailQuote(q)}
                className="w-full text-right rounded-2xl bg-white/95 text-[#101418] p-3 flex items-center gap-3 shadow-lg hover:bg-white transition"
              >
                <div className="size-11 rounded-full bg-[#F5C518]/20 text-[#8A6100] grid place-items-center shrink-0 relative">
                  <Bike className="size-5" />
                  {i === 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#0E7A4A] text-white px-1.5 py-0.5 rounded-full">הזול</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{q.couriers?.full_name ?? "מוביל"}</div>
                  <div className="text-[11px] text-[#101418]/60 flex items-center gap-2 flex-wrap mt-0.5">
                    {q.courier_rating_snapshot ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-[#F5C518] text-[#F5C518]" />
                        {Number(q.courier_rating_snapshot).toFixed(1)}
                      </span>
                    ) : null}
                    {q.courier_completed_jobs_snapshot ? <span>· {q.courier_completed_jobs_snapshot} הובלות</span> : null}
                    {q.estimated_arrival_minutes ? <span>· ~{q.estimated_arrival_minutes} דק׳</span> : null}
                  </div>
                  {q.note && <div className="text-[11px] text-[#101418]/70 mt-1 truncate">"{q.note}"</div>}
                </div>
                <div className="text-left shrink-0">
                  <div className="text-lg font-black leading-none">₪{Number(q.price).toFixed(0)}</div>
                  <span className="mt-1.5 inline-block px-3 py-1.5 rounded-full bg-[#101418]/5 text-[#101418] text-[11px] font-black">
                    פרטים ←
                  </span>
                </div>
              </button>
            ))}
          <p className="text-center text-[11px] text-white/50 pt-1">
            לחיצה על הצעה פותחת את פרטי המוביל · אפשר להמשיך להמתין להצעות נוספות
          </p>
        </div>
      )}

      {/* Mover details — choose only from here */}
      <Dialog open={!!detailQuote} onOpenChange={(o) => !o && setDetailQuote(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-[#101418]">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">פרטי המוביל</DialogTitle>
          </DialogHeader>
          {detailQuote && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-full bg-[#F5C518]/20 text-[#8A6100] grid place-items-center shrink-0">
                  <Bike className="size-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-base truncate">{detailQuote.couriers?.full_name ?? "מוביל"}</div>
                  <div className="text-xs text-[#101418]/60 flex items-center gap-1 mt-0.5">
                    <Star className="size-3 fill-[#F5C518] text-[#F5C518]" />
                    {detailQuote.courier_rating_snapshot ? Number(detailQuote.courier_rating_snapshot).toFixed(1) : "חדש"}
                    {detailQuote.couriers?.vehicle_type ? <> · {detailQuote.couriers.vehicle_type}</> : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatBox label="הובלות" value={String(detailQuote.courier_completed_jobs_snapshot ?? 0)} />
                <StatBox label="הגעה" value={detailQuote.estimated_arrival_minutes ? `~${detailQuote.estimated_arrival_minutes}׳` : "—"} />
                <StatBox label="משך" value={detailQuote.estimated_delivery_minutes ? `~${detailQuote.estimated_delivery_minutes}׳` : "—"} />
              </div>

              {detailQuote.note && (
                <div className="rounded-xl bg-[#f5f6f8] p-3 text-sm text-[#101418]/80">"{detailQuote.note}"</div>
              )}

              <div className="rounded-xl bg-[#E6F7EF] p-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0E7A4A]">
                  מחיר ההצעה {detailQuote.is_final_price ? "(סופי)" : ""}
                </span>
                <span className="text-xl font-black text-[#0E7A4A]">₪{Number(detailQuote.price).toFixed(0)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDetailQuote(null)}
                  className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-bold"
                >
                  חזרה להצעות
                </button>
                <button
                  onClick={() => pickQuote.mutate(detailQuote.id)}
                  disabled={pickQuote.isPending}
                  className="flex-1 rounded-xl bg-[#0E7A4A] text-white py-2.5 text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {pickQuote.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  בחר מוביל זה
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f5f6f8] p-2.5 text-center">
      <div className="text-base font-black text-[#101418] leading-none">{value}</div>
      <div className="text-[10px] font-bold text-[#101418]/50 mt-1">{label}</div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f5f6f8] p-3">
      <div className="text-[11px] font-bold text-[#101418]/50 uppercase mb-1 flex items-center gap-1">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-sm font-semibold text-[#101418] truncate">{value}</div>
    </div>
  );
}

