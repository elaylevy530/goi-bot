import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight, Plus, Minus, Star, ShoppingBag, ArrowRight, Loader2, CheckCircle2,
  LayoutGrid, Store, Coffee, CupSoda, Wine, Beer, IceCream, Cookie, Cake, Candy,
  Sandwich, Pizza, Beef, Fish, Salad, Apple, Croissant, Soup, Utensils, Popcorn,
  Milk, Egg, Wheat, Carrot, Cigarette, Pill, Sparkles, Baby, PawPrint, Newspaper,
  Snowflake, Flame, Leaf, ShoppingBasket,
} from "lucide-react";

// Map category name (Hebrew/English keywords) → lucide icon component
function iconForCategory(name: string) {
  const n = name.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => n.includes(k));
  if (has("קפה", "אספרסו", "coffee")) return Coffee;
  if (has("שתי", "מים", "משק", "משקא", "קול", "סודה", "drink", "soda")) return CupSoda;
  if (has("יין", "wine")) return Wine;
  if (has("בירה", "אלכוהו", "beer", "alcohol")) return Beer;
  if (has("גליד", "ice")) return IceCream;
  if (has("עוגי", "ביסק", "cookie")) return Cookie;
  if (has("עוג", "cake", "מאפ")) return Cake;
  if (has("סוכר", "ממתק", "שוקו", "candy", "chocolate")) return Candy;
  if (has("כריך", "סנדוו", "toast", "sandwich")) return Sandwich;
  if (has("פיצה", "pizza")) return Pizza;
  if (has("בשר", "המבורגר", "burger", "steak", "beef")) return Beef;
  if (has("דג", "סושי", "fish", "sushi")) return Fish;
  if (has("סלט", "ירק", "salad")) return Salad;
  if (has("פרי", "פירות", "fruit")) return Apple;
  if (has("קרואס", "לחם", "מאפ", "croissant", "bread", "bakery")) return Croissant;
  if (has("מרק", "soup")) return Soup;
  if (has("פסטה", "ארוח", "מנה", "meal", "pasta")) return Utensils;
  if (has("פופ", "חטיף", "snack", "popcorn", "chip")) return Popcorn;
  if (has("חלב", "יוגור", "גבינ", "milk", "dairy", "yogurt")) return Milk;
  if (has("ביצ", "egg")) return Egg;
  if (has("דגן", "אור", "פית", "grain", "rice", "cereal")) return Wheat;
  if (has("ירק", "vegetab")) return Carrot;
  if (has("סיגר", "טבק", "cigar", "tobacco")) return Cigarette;
  if (has("תרופ", "פארמ", "בריא", "pharm", "medic", "health")) return Pill;
  if (has("קוסמ", "יופי", "cosmet", "beauty")) return Sparkles;
  if (has("תינוק", "baby")) return Baby;
  if (has("חיות", "כלב", "חתול", "pet")) return PawPrint;
  if (has("עיתו", "מגזי", "news", "magazine")) return Newspaper;
  if (has("קפוא", "frozen")) return Snowflake;
  if (has("חריף", "חם", "hot", "spicy")) return Flame;
  if (has("אורג", "טבע", "organic", "vegan")) return Leaf;
  if (has("מכול", "מרכ", "כלב", "grocer", "market")) return ShoppingBasket;
  return Store;
}
import {
  listKiosksFn,
  getKioskMenuFn,
  createMunchOrderFn,
  type Kiosk,
  type MunchCartItem,
} from "@/lib/munch.functions";
import type { SelectedPlace } from "./AddressAutocomplete";

const ACCENT = "#7c3aed";
const ACCENT_SOFT = "#F3EEFF";

type Props = {
  dropoff: SelectedPlace | null;
  dropoffText: string;
  onOrderCreated?: (orderId: string) => void;
};

type Step = "browse" | "menu" | "cart" | "done";

export function MunchInline({ dropoff, dropoffText, onOrderCreated }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("browse");
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
  const [cart, setCart] = useState<MunchCartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [step, selectedKioskId]);

  const listKiosks = useServerFn(listKiosksFn);
  const { data: kiosks = [], isLoading: kiosksLoading } = useQuery({
    queryKey: ["munch-kiosks"],
    queryFn: () => listKiosks(),
  });

  const selectedKiosk = useMemo(
    () => kiosks.find((k) => k.id === selectedKioskId) ?? null,
    [kiosks, selectedKioskId],
  );

  return (
    <div ref={rootRef} className="w-full scroll-mt-4">

      {/* Header — shows current context */}
      <MunchHeader
        step={step}
        kiosk={selectedKiosk}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        onBack={() => {
          if (step === "cart") setStep("menu");
          else if (step === "menu") { setStep("browse"); setSelectedKioskId(null); }
        }}
        onCart={() => setStep("cart")}
      />

      {step === "browse" && (
        <BrowseKiosks
          kiosks={kiosks}
          loading={kiosksLoading}
          onPick={(id) => { setSelectedKioskId(id); setStep("menu"); }}
        />
      )}

      {step === "menu" && selectedKioskId && (
        <KioskMenu
          kioskId={selectedKioskId}
          cart={cart}
          setCart={setCart}
          onGoCart={() => setStep("cart")}
        />
      )}

      {step === "cart" && selectedKioskId && selectedKiosk && (
        <CartPanel
          kiosk={selectedKiosk}
          cart={cart}
          setCart={setCart}
          dropoff={dropoff}
          dropoffText={dropoffText}
          onSubmitted={(id) => {
            setOrderId(id);
            onOrderCreated?.(id);
            navigate({ to: "/munch/track/$id", params: { id } });
          }}
        />
      )}

      {step === "done" && orderId && (
        <DonePanel orderId={orderId} />
      )}
    </div>
  );
}

function MunchHeader({ step, kiosk, cartCount, onBack, onCart }: {
  step: Step; kiosk: Kiosk | null; cartCount: number; onBack: () => void; onCart: () => void;
}) {
  const Wordmark = (
    <div className="inline-flex items-baseline gap-1">
      <span
        className="text-[22px] font-black italic tracking-tight leading-none"
        style={{ color: "#FF6A1A", textShadow: "0 1px 0 rgba(229,72,10,0.13)" }}
      >
        munch
      </span>
      <span className="text-[10px] font-bold text-[#101418]/50 leading-none">by GOI</span>
    </div>
  );

  if (step === "browse" || step === "done") {
    return (
      <div className="px-1 pb-3 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {Wordmark}
          <div className="text-[11px] text-[#101418]/55">בחר קיוסק — לכל קיוסק תפריט משלו</div>
        </div>
        {cartCount > 0 && (
          <button
            type="button"
            onClick={onCart}
            className="h-9 px-3 rounded-full text-white text-xs font-black inline-flex items-center gap-2 shadow-md"
            style={{ background: ACCENT }}
          >
            <ShoppingBag className="size-3.5" /> סל · {cartCount}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="px-1 pb-2 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="size-9 rounded-full bg-black/5 grid place-items-center active:scale-95"
        aria-label="חזור"
      >
        <ArrowRight className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-black truncate">{kiosk?.name ?? "..."}</div>
        <div className="text-[10px] text-[#101418]/55 truncate">
          {step === "cart" ? "השלמת הזמנה" : kiosk?.address}
        </div>
      </div>
      {step === "menu" && cartCount > 0 && (
        <button
          type="button"
          onClick={onCart}
          className="h-9 px-3 rounded-full text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md"
          style={{ background: ACCENT }}
        >
          <ShoppingBag className="size-3.5" /> {cartCount}
        </button>
      )}
    </div>
  );
}

function BrowseKiosks({ kiosks, loading, onPick }: {
  kiosks: Kiosk[]; loading: boolean; onPick: (id: string) => void;
}) {
  if (loading) return <div className="py-6 grid place-items-center text-[#101418]/50"><Loader2 className="size-5 animate-spin" /></div>;
  if (!kiosks.length) return <div className="py-6 text-center text-sm text-[#101418]/50">אין קיוסקים זמינים כרגע</div>;
  return (
    <div className="space-y-2">
      {kiosks.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onPick(k.id)}
          className="w-full flex items-center gap-3 bg-white rounded-2xl ring-1 ring-black/5 p-2.5 text-right active:scale-[0.99] transition"
        >
          <div className="size-14 rounded-xl bg-black/5 flex-shrink-0 overflow-hidden">
            {k.image_url && <img src={k.image_url} alt={k.name} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-[13px] truncate">{k.name}</div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold" style={{ color: k.is_open ? "#0E7A4A" : "#DC2626" }}>
                <span className="size-1.5 rounded-full" style={{ background: k.is_open ? "#0E7A4A" : "#DC2626" }} />
                {k.is_open ? "פתוח" : "סגור"}
              </span>
              {k.rating != null && (
                <span className="inline-flex items-center gap-1 text-[#101418]/60">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{Number(k.rating).toFixed(1)}</span>
                </span>
              )}
              {k.city && <span className="text-[#101418]/50 truncate">· {k.city}</span>}
            </div>
            <div className="mt-0.5 text-[10px] text-[#101418]/50">
              משלוח <span className="font-black" style={{ color: ACCENT }}>₪{k.delivery_fee_default}</span>
            </div>
          </div>
          <ChevronRight className="size-4 text-[#101418]/40 rotate-180 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function KioskMenu({ kioskId, cart, setCart, onGoCart }: {
  kioskId: string;
  cart: MunchCartItem[];
  setCart: (c: MunchCartItem[]) => void;
  onGoCart: () => void;
}) {
  const getMenu = useServerFn(getKioskMenuFn);
  const { data, isLoading } = useQuery({
    queryKey: ["munch-menu", kioskId],
    queryFn: () => getMenu({ data: { kiosk_id: kioskId } }),
  });
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const categories = data?.categories ?? [];
  const products = data?.products ?? [];
  const catIds = useMemo(() => new Set(products.map((p) => p.category_id).filter(Boolean) as string[]), [products]);
  const shownCats = categories.filter((c) => catIds.has(c.id));

  const filteredProducts = activeCat ? products.filter((p) => p.category_id === activeCat) : products;

  const qtyOf = (id: string) => cart.find((c) => c.product_id === id)?.qty ?? 0;
  const add = (p: typeof products[number]) => {
    const existing = cart.find((c) => c.product_id === p.id);
    if (existing) {
      setCart(cart.map((c) => c.product_id === p.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { product_id: p.id, name: p.name, price: Number(p.price), qty: 1, image_url: p.image_url }]);
    }
  };
  const sub = (id: string) => {
    const existing = cart.find((c) => c.product_id === id);
    if (!existing) return;
    if (existing.qty <= 1) setCart(cart.filter((c) => c.product_id !== id));
    else setCart(cart.map((c) => c.product_id === id ? { ...c, qty: c.qty - 1 } : c));
  };

  if (isLoading) return <div className="py-6 grid place-items-center text-[#101418]/50"><Loader2 className="size-5 animate-spin" /></div>;
  if (!products.length) return <div className="py-6 text-center text-sm text-[#101418]/50">אין מוצרים בקיוסק זה</div>;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="space-y-3">
      {shownCats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
          <CategoryCard
            active={activeCat === null}
            onClick={() => setActiveCat(null)}
            label="הכל"
            icon={<LayoutGrid className="size-5" strokeWidth={2.5} />}
          />
          {shownCats.map((c) => {
            const Icon = iconForCategory(c.name);
            return (
              <CategoryCard
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.name}
                icon={<Icon className="size-5" strokeWidth={2.25} />}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {filteredProducts.map((p) => {
          const q = qtyOf(p.id);
          return (
            <div key={p.id} className="group bg-white rounded-2xl ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(16,20,24,0.04)] p-3 flex flex-col transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(16,20,24,0.15)] hover:ring-black/[0.08] active:scale-[0.98]">
              <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 grid place-items-center bg-white">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]" loading="lazy" />
                  : <div className="w-full h-full bg-black/[0.03] rounded-xl" />}
              </div>
              <div className="text-[13px] font-black leading-tight text-center line-clamp-2 min-h-[32px]">{p.name}</div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="text-[14px] font-black text-[#101418]">
                  <span className="text-[#101418]/60 text-[11px] font-bold ml-0.5">₪</span>
                  {Number(p.price).toFixed(0)}
                </div>
                {q === 0 ? (
                  <button
                    type="button"
                    onClick={() => add(p)}
                    className="size-8 rounded-full text-white grid place-items-center shadow-md transition-all duration-150 ease-out hover:scale-110 hover:shadow-lg active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--tw-ring-color)]"
                    style={{ background: ACCENT, ["--tw-ring-color" as any]: ACCENT }}
                    aria-label="הוסף"
                  >
                    <Plus className="size-4 transition-transform duration-150 ease-out group-active:rotate-90" strokeWidth={3} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-full p-0.5 animate-scale-in" style={{ background: ACCENT_SOFT }}>
                    <button type="button" onClick={() => sub(p.id)} className="size-6 rounded-full bg-white grid place-items-center transition-transform duration-150 ease-out hover:scale-110 active:scale-90" aria-label="הפחת">
                      <Minus className="size-3" />
                    </button>
                    <span className="text-[12px] font-black w-4 text-center tabular-nums" style={{ color: ACCENT }}>{q}</span>
                    <button type="button" onClick={() => add(p)} className="size-6 rounded-full text-white grid place-items-center transition-transform duration-150 ease-out hover:scale-110 active:scale-90" style={{ background: ACCENT }} aria-label="הוסף">
                      <Plus className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>


      {cartCount > 0 && (
        <button
          type="button"
          onClick={onGoCart}
          className="sticky bottom-0 w-full h-12 rounded-2xl text-white font-black flex items-center justify-between px-4 shadow-lg"
          style={{ background: ACCENT }}
        >
          <span className="text-sm">להשלמת ההזמנה</span>
          <span className="text-sm">₪{cartTotal.toFixed(0)} · {cartCount}</span>
        </button>
      )}
    </div>
  );
}

function CartPanel({ kiosk, cart, setCart, dropoff, dropoffText, onSubmitted }: {
  kiosk: Kiosk;
  cart: MunchCartItem[];
  setCart: (c: MunchCartItem[]) => void;
  dropoff: SelectedPlace | null;
  dropoffText: string;
  onSubmitted: (id: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const createOrder = useServerFn(createMunchOrderFn);
  const submit = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error("הסל ריק");
      if (!dropoffText.trim()) throw new Error("חסרה כתובת משלוח למעלה");
      return await createOrder({
        data: {
          kiosk_id: kiosk.id,
          items: cart,
          dropoff_address: dropoffText,
          dropoff_lat: dropoff?.lat ?? null,
          dropoff_lng: dropoff?.lng ?? null,
          notes: notes || null,
        },
      });
    },
    onSuccess: (r) => { toast.success("הוזמן!"); onSubmitted(r.id); },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בהזמנה"),
  });

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = Number(kiosk.delivery_fee_default ?? 15);
  const service = Number(kiosk.service_fee_default ?? 3);
  const total = subtotal + delivery + service;

  const sub = (id: string) => {
    const existing = cart.find((c) => c.product_id === id);
    if (!existing) return;
    if (existing.qty <= 1) setCart(cart.filter((c) => c.product_id !== id));
    else setCart(cart.map((c) => c.product_id === id ? { ...c, qty: c.qty - 1 } : c));
  };
  const add = (id: string) => setCart(cart.map((c) => c.product_id === id ? { ...c, qty: c.qty + 1 } : c));

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl ring-1 ring-black/5 divide-y divide-black/5">
        {cart.map((it) => (
          <div key={it.product_id} className="p-2.5 flex items-center gap-2">
            <div className="size-11 rounded-lg bg-black/5 overflow-hidden flex-shrink-0">
              {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-black truncate">{it.name}</div>
              <div className="text-[11px] font-bold" style={{ color: ACCENT }}>₪{(it.price * it.qty).toFixed(0)}</div>
            </div>
            <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: ACCENT_SOFT }}>
              <button type="button" onClick={() => sub(it.product_id)} className="size-6 rounded-full bg-white grid place-items-center" aria-label="הפחת"><Minus className="size-3" /></button>
              <span className="text-[12px] font-black w-4 text-center" style={{ color: ACCENT }}>{it.qty}</span>
              <button type="button" onClick={() => add(it.product_id)} className="size-6 rounded-full text-white grid place-items-center" style={{ background: ACCENT }} aria-label="הוסף"><Plus className="size-3" /></button>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="הערות לקיוסק / לשליח (לא חובה)"
        rows={2}
        className="w-full rounded-2xl bg-white ring-1 ring-black/5 p-2.5 text-[12px]"
      />

      <div className="bg-white rounded-2xl ring-1 ring-black/5 p-3 text-[12px] space-y-1">
        <Row label="סכום ביניים" value={`₪${subtotal.toFixed(0)}`} />
        <Row label="משלוח" value={`₪${delivery.toFixed(0)}`} />
        <Row label="דמי שירות" value={`₪${service.toFixed(0)}`} />
        <div className="pt-1 mt-1 border-t border-black/5">
          <Row label={<span className="font-black text-[13px]">סה״כ</span>} value={<span className="font-black text-[14px]" style={{ color: ACCENT }}>₪{total.toFixed(0)}</span>} />
        </div>
      </div>

      <button
        type="button"
        disabled={submit.isPending}
        onClick={() => submit.mutate()}
        className="w-full h-12 rounded-2xl text-white font-black shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: ACCENT }}
      >
        {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        אישור הזמנה · ₪{total.toFixed(0)}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><div className="text-[#101418]/60">{label}</div><div>{value}</div></div>;
}

function DonePanel({ orderId }: { orderId: string }) {
  return (
    <div className="py-6 text-center space-y-2">
      <div className="mx-auto size-14 rounded-full grid place-items-center" style={{ background: ACCENT_SOFT }}>
        <CheckCircle2 className="size-8" style={{ color: ACCENT }} />
      </div>
      <div className="text-[15px] font-black">ההזמנה נשלחה!</div>
      <div className="text-[11px] text-[#101418]/55">מס׳ הזמנה: {orderId.slice(0, 8)}</div>
    </div>
  );
}

function CategoryCard({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/cat flex-shrink-0 w-[72px] rounded-2xl flex flex-col items-center justify-center gap-1 py-2.5 px-1 ring-1 transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: active ? ACCENT : "#ffffff",
        color: active ? "#ffffff" : "#0f7a3f",
        borderColor: active ? ACCENT : "rgba(16,20,24,0.04)",
        boxShadow: active
          ? "0 8px 18px -6px rgba(124,58,237,0.5)"
          : "0 1px 2px rgba(16,20,24,0.04)",
      }}
      aria-pressed={active}
    >
      <div
        className="size-9 rounded-xl grid place-items-center transition-transform duration-200 ease-out group-hover/cat:scale-110 group-active/cat:scale-95"
        style={{
          background: active ? "rgba(255,255,255,0.15)" : "transparent",
          color: active ? "#ffffff" : "#0f7a3f",
        }}
      >
        {icon}
      </div>
      <div
        className="text-[11px] font-black leading-none"
        style={{ color: active ? "#ffffff" : "#101418" }}
      >
        {label}
      </div>
    </button>
  );
}
