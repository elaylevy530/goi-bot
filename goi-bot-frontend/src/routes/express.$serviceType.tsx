import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { Loader2, ArrowRight, ShieldCheck, Bike, Calendar, Truck, PackageCheck, Sofa, Refrigerator, Bed, Tv, WashingMachine, Armchair, Package, Boxes, Piano, Bike as BikeIcon, Utensils, Home as HomeIcon } from "lucide-react";
import {
  getPricingRulesFn,
  createGuestOrderFn,
  confirmGuestOrderFn,
  createGuestPaypalOrderFn,
  captureGuestPaypalOrderFn,
} from "@/lib/guest-order.functions";
import { getPaypalConfigFn } from "@/lib/paypal-billing.functions";

const VALID = new Set(["same_day", "scheduled", "small_move", "big_move"]);

const META: Record<string, { title: string; icon: any; description: string }> = {
  same_day: { title: "משלוח מהיום להיום", icon: Bike, description: "חבילה, מסמך או מתנה — עכשיו." },
  scheduled: { title: "משלוח מתוזמן", icon: Calendar, description: "בוחרים תאריך ושעה." },
  small_move: { title: "הובלה קטנה", icon: PackageCheck, description: "רהיט, מקרר, ספה." },
  big_move: { title: "הובלה גדולה", icon: Truck, description: "דירה או משרד עם צוות." },
};

export const Route = createFileRoute("/express/$serviceType")({
  beforeLoad: ({ params }) => {
    if (!VALID.has(params.serviceType)) throw redirect({ to: "/" });
  },
  head: ({ params }) => ({
    meta: [
      { title: `${META[params.serviceType]?.title ?? "הזמנה"} — Goi Express` },
      { name: "description", content: META[params.serviceType]?.description ?? "הזמנת משלוח" },
    ],
  }),
  component: ExpressOrderPage,
});

const serif = { fontFamily: "'Instrument Serif', 'David Libre', serif" };

type CreatedOrder = Awaited<ReturnType<typeof createGuestOrderFn>>;

function ExpressOrderPage() {
  const { serviceType } = Route.useParams();
  const navigate = useNavigate();
  const meta = META[serviceType];
  const Icon = meta.icon;

  const getRules = useServerFn(getPricingRulesFn);
  const createOrder = useServerFn(createGuestOrderFn);
  const confirmOrder = useServerFn(confirmGuestOrderFn);

  const { data: rules } = useQuery({ queryKey: ["pricing-rules"], queryFn: () => getRules() });
  const rule = useMemo(() => rules?.find((r: any) => r.service_category === serviceType), [rules, serviceType]);

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    pickup_address: "",
    dropoff_address: "",
    recipient_name: "",
    recipient_phone: "",
    description: "",
    scheduled_at: "",
    pricing_model: "fixed_price" as "fixed_price" | "quote_request",
    offered_price: "",
  });
  const [created, setCreated] = useState<CreatedOrder | null>(null);

  // Prefill from signed-in Nest customer account (if any)
  useEffect(() => {
    (async () => {
      const { fetchNestSession } = await import("@/lib/nest-auth");
      const session = await fetchNestSession();
      if (!session?.roles.includes("customer")) return;
      setForm((f) => ({
        ...f,
        guest_name: f.guest_name || session.profile?.name || "",
        guest_phone:
          f.guest_phone ||
          session.profile?.phone ||
          session.email?.split("@")[0] ||
          "",
      }));
    })();
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        service_category: serviceType as any,
        guest_name: form.guest_name,
        guest_phone: form.guest_phone,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
        recipient_name: form.recipient_name || null,
        recipient_phone: form.recipient_phone || null,
        description: form.description || null,
        scheduled_at: serviceType === "scheduled" && form.scheduled_at
          ? new Date(form.scheduled_at).toISOString()
          : null,
        pricing_model: form.pricing_model,
        offered_price: form.pricing_model === "fixed_price" && form.offered_price
          ? Number(form.offered_price)
          : null,
      };
      return await createOrder({ data: payload });
    },
    onSuccess: async (result) => {
      setCreated(result);
      if (result.payment_mode === "cash_only") {
        await confirmOrder({ data: { job_id: result.job_id, tracking_token: result.tracking_token } });
        navigate({ to: "/express/thanks/$token", params: { token: result.tracking_token } });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה ביצירת ההזמנה"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guest_name || !form.guest_phone || !form.pickup_address || !form.dropoff_address) {
      toast.error("מלא את כל השדות המסומנים");
      return;
    }
    if (form.pricing_model === "fixed_price" && !form.offered_price) {
      toast.error("הזן את המחיר שאתה מציע");
      return;
    }
    create.mutate();
  };

  if (created && created.payment_mode !== "cash_only") {
    return (
      <PaymentStep
        created={created}
        onDone={() => navigate({ to: "/express/thanks/$token", params: { token: created.tracking_token } })}
        onBack={() => setCreated(null)}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f3ee] text-[#0d0d0d]">
      <header className="border-b border-[#0d0d0d]/10 bg-[#f5f3ee]/85 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[#35AD29]">
            <ArrowRight className="size-4" /> חזרה
          </Link>
          <div className="text-xs font-bold uppercase tracking-widest text-[#0d0d0d]/40">Goi Express</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="size-14 rounded-2xl bg-[#35AD29] grid place-items-center text-white shrink-0">
            <Icon className="size-7" />
          </div>
          <div>
            <h1 style={serif} className="text-4xl lg:text-5xl leading-tight">{meta.title}</h1>
            <p className="text-sm text-[#0d0d0d]/60 mt-1">{meta.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-[#0d0d0d]/5">
          <Section title="פרטים שלך">
            <Field label="שם מלא *" value={form.guest_name} onChange={(v) => setForm({ ...form, guest_name: v })} />
            <Field label="טלפון נייד *" type="tel" placeholder="05X-XXX-XXXX" value={form.guest_phone} onChange={(v) => setForm({ ...form, guest_phone: v })} />
          </Section>

          <Section title="איסוף">
            <Field label="כתובת איסוף *" value={form.pickup_address} onChange={(v) => setForm({ ...form, pickup_address: v })} placeholder="רחוב, מספר, עיר" />
          </Section>

          <Section title="יעד">
            <Field label="כתובת מסירה *" value={form.dropoff_address} onChange={(v) => setForm({ ...form, dropoff_address: v })} placeholder="רחוב, מספר, עיר" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="שם המקבל (אם שונה)" value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} />
              <Field label="טלפון המקבל" type="tel" value={form.recipient_phone} onChange={(v) => setForm({ ...form, recipient_phone: v })} />
            </div>
          </Section>

          {serviceType === "scheduled" && (
            <Section title="תזמון">
              <Field label="תאריך ושעה" type="datetime-local" value={form.scheduled_at} onChange={(v) => setForm({ ...form, scheduled_at: v })} />
            </Section>
          )}

          <Section title="פרטי המשלוח">
            {(serviceType === "small_move" || serviceType === "big_move") && (
              <MoveCategoryPicker
                selected={form.description}
                onChange={(desc) => setForm({ ...form, description: desc })}
              />
            )}
            <label className="block">
              <span className="text-sm font-semibold text-[#0d0d0d]/70 mb-1.5 block">
                {(serviceType === "small_move" || serviceType === "big_move") ? "תיאור נוסף / הערות" : "תיאור החבילה / הפריט"}
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder={(serviceType === "small_move" || serviceType === "big_move")
                  ? "למשל: קומה 3 בלי מעלית, יש פירוק ארון, צריך גם עטיפה..."
                  : "למשל: מעטפה A4, קרטון קטן, מתנה..."}
                className="w-full px-4 py-3 rounded-xl border border-[#0d0d0d]/15 bg-white focus:border-[#35AD29] focus:ring-2 focus:ring-[#35AD29]/20 outline-none transition-all"
              />
            </label>
          </Section>

          <Section title="איך לקבוע את המחיר?">
            <div className="grid sm:grid-cols-2 gap-3">
              {rule?.allow_customer_fixed_price && (
                <PricingOption
                  active={form.pricing_model === "fixed_price"}
                  title="אני מציע מחיר"
                  desc="השליחים רואים את המחיר ומאשרים אם מתאים"
                  onClick={() => setForm({ ...form, pricing_model: "fixed_price" })}
                />
              )}
              {rule?.allow_customer_quote && (
                <PricingOption
                  active={form.pricing_model === "quote_request"}
                  title="בקש הצעות מחיר"
                  desc="השליחים שולחים הצעות ואתה בוחר"
                  onClick={() => setForm({ ...form, pricing_model: "quote_request" })}
                />
              )}
            </div>
            {form.pricing_model === "fixed_price" && (
              <Field
                label={`המחיר שלך (מינימום: ₪${rule?.min_price ?? 0})`}
                type="number"
                value={form.offered_price}
                onChange={(v) => setForm({ ...form, offered_price: v })}
                placeholder="למשל: 45"
              />
            )}
          </Section>

          {rule && (
            <div className="bg-[#f5f3ee] rounded-2xl p-4 text-sm">
              <div className="font-semibold text-[#0d0d0d]/70 mb-1">אופן תשלום:</div>
              <div className="text-[#0d0d0d]">
                {rule.payment_mode === "cash_only" && "תשלום במזומן ישירות לשליח."}
                {rule.payment_mode === "deposit" && `מקדמה של ${rule.deposit_percent}% בפייפאל, השאר במזומן לשליח.`}
                {rule.payment_mode === "full_upfront" && "תשלום מלא מראש בפייפאל."}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-4 bg-primary-deep text-white rounded-2xl text-base font-bold hover:bg-primary-deep/90 disabled:opacity-60 transition-colors"
          >
            {create.isPending ? <Loader2 className="size-5 animate-spin" /> : <>המשך להזמנה <ArrowRight className="size-4 rotate-180" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-[#0d0d0d]/40">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0d0d0d]/70 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-[#0d0d0d]/15 bg-white focus:border-[#35AD29] focus:ring-2 focus:ring-[#35AD29]/20 outline-none transition-all"
      />
    </label>
  );
}

function PricingOption({ active, title, desc, onClick }: {
  active: boolean; title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right p-4 rounded-2xl border-2 transition-all ${
        active ? "border-[#35AD29] bg-[#35AD29]/5" : "border-[#0d0d0d]/10 bg-white hover:border-[#0d0d0d]/20"
      }`}
    >
      <div className="font-bold text-sm mb-1">{title}</div>
      <div className="text-xs text-[#0d0d0d]/60">{desc}</div>
    </button>
  );
}

const MOVE_CATEGORIES = [
  { key: "ספה", label: "ספה", icon: Sofa },
  { key: "מיטה", label: "מיטה", icon: Bed },
  { key: "ארון", label: "ארון", icon: HomeIcon },
  { key: "כורסה", label: "כורסה", icon: Armchair },
  { key: "מקרר", label: "מקרר", icon: Refrigerator },
  { key: "מכונת כביסה", label: "מכונת כביסה", icon: WashingMachine },
  { key: "טלוויזיה", label: "טלוויזיה", icon: Tv },
  { key: "שולחן", label: "שולחן/כיסאות", icon: Utensils },
  { key: "פסנתר", label: "פסנתר", icon: Piano },
  { key: "אופניים", label: "אופניים", icon: BikeIcon },
  { key: "קרטונים", label: "קרטונים", icon: Boxes },
  { key: "חבילה", label: "אחר", icon: Package },
] as const;

function MoveCategoryPicker({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  const items = selected
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const active = new Set(items);
  const toggle = (key: string) => {
    const next = new Set(active);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(Array.from(next).join(", "));
  };
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-[#0d0d0d]/70 block">מה מעבירים? (בחרו קטגוריות)</span>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {MOVE_CATEGORIES.map(({ key, label, icon: Icon }) => {
          const isOn = active.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 border-2 transition-all active:scale-95 ${
                isOn
                  ? "border-[#35AD29] bg-[#35AD29]/10 text-[#0d0d0d]"
                  : "border-[#0d0d0d]/10 bg-white text-[#0d0d0d]/70 hover:border-[#0d0d0d]/25"
              }`}
            >
              <Icon className={`size-6 ${isOn ? "text-[#35AD29]" : "text-[#0d0d0d]/60"}`} strokeWidth={2} />
              <span className="text-[11px] font-bold leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>
      {active.size > 0 && (
        <div className="text-[11px] text-[#0d0d0d]/50">נבחרו: {Array.from(active).join(", ")}</div>
      )}
    </div>
  );
}

function PaymentStep({ created, onDone, onBack }: {
  created: CreatedOrder; onDone: () => void; onBack: () => void;
}) {
  const getCfg = useServerFn(getPaypalConfigFn);
  const createPP = useServerFn(createGuestPaypalOrderFn);
  const capturePP = useServerFn(captureGuestPaypalOrderFn);
  const { data: cfg } = useQuery({ queryKey: ["paypal-config"], queryFn: () => getCfg() });

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f3ee] text-[#0d0d0d]">
      <header className="border-b border-[#0d0d0d]/10 bg-[#f5f3ee]/85 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[#35AD29]">
            <ArrowRight className="size-4" /> חזרה לטופס
          </button>
          <div className="text-xs font-bold uppercase tracking-widest text-[#0d0d0d]/40">תשלום</div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-[#0d0d0d]/5 space-y-6">
          <div>
            <h1 style={serif} className="text-3xl lg:text-4xl leading-tight mb-2">כמעט סיימת</h1>
            <p className="text-sm text-[#0d0d0d]/60">{created.service_display_name} · הזמנה #{created.job_number}</p>
          </div>

          <div className="bg-[#f5f3ee] rounded-2xl p-5">
            <div className="flex items-center justify-between text-sm text-[#0d0d0d]/70 mb-2">
              <span>סה״כ להזמנה:</span>
              <span className="font-bold text-[#0d0d0d]">₪{created.total_price.toFixed(2)}</span>
            </div>
            {created.payment_mode === "deposit" && (
              <div className="flex items-center justify-between text-sm text-[#0d0d0d]/70 mb-2">
                <span>יתרה במזומן לשליח:</span>
                <span>₪{(created.total_price - created.amount_to_charge_now).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-[#0d0d0d]/10 mt-3 pt-3 flex items-center justify-between">
              <span className="font-bold">לחיוב עכשיו:</span>
              <span className="text-xl font-bold text-[#35AD29]">₪{created.amount_to_charge_now.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#0d0d0d]/50">
            <ShieldCheck className="size-4 text-[#35AD29]" />
            תשלום מאובטח דרך PayPal · לא נשמרים אצלנו פרטי כרטיס.
          </div>

          {cfg?.clientId ? (
            <PayPalScriptProvider
              options={{
                clientId: cfg.clientId,
                currency: cfg.currency,
                intent: "capture",
                components: "buttons",
                locale: "he_IL",
                disableFunding: "card,credit",
              }}
            >
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                createOrder={async () => {
                  const r = await createPP({ data: {
                    job_id: created.job_id,
                    tracking_token: created.tracking_token,
                    amount: created.amount_to_charge_now,
                  } });
                  if (!r?.order_id) throw new Error("לא ניתן ליצור הזמנה");
                  return r.order_id;
                }}
                onApprove={async (data) => {
                  try {
                    await capturePP({ data: {
                      job_id: created.job_id,
                      tracking_token: created.tracking_token,
                      order_id: data.orderID,
                    } });
                    toast.success("התשלום אושר ✅");
                    onDone();
                  } catch (e: any) {
                    toast.error("שגיאה: " + (e?.message ?? "לא ידוע"));
                  }
                }}
                onError={(err) => toast.error("PayPal: " + (((err as any)?.message as string) ?? "שגיאה"))}
                onCancel={() => toast.message("התשלום בוטל")}
              />
            </PayPalScriptProvider>
          ) : (
            <div className="py-8 text-center"><Loader2 className="size-5 animate-spin mx-auto" /></div>
          )}
        </div>
      </div>
    </div>
  );
}
