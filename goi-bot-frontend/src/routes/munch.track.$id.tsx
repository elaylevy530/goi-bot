import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChefHat, Package, Bike, Home, Clock, XCircle, Loader2 } from "lucide-react";
import { getMunchOrderFn, cancelMunchOrderFn } from "@/lib/munch.functions";

const ACCENT = "#FF6A1A";
const ACCENT_SOFT = "#FFEDE0";
const INK = "#101418";

type MunchStatus = "pending" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled" | "rejected";

const STEPS: { key: MunchStatus; label: string; icon: any }[] = [
  { key: "pending", label: "התקבל", icon: Clock },
  { key: "preparing", label: "בהכנה", icon: ChefHat },
  { key: "ready", label: "מוכן", icon: Package },
  { key: "picked_up", label: "בדרך", icon: Bike },
  { key: "delivered", label: "נמסר", icon: Home },
];

function statusIndex(s: string): number {
  const i = STEPS.findIndex((x) => x.key === s);
  return i < 0 ? 0 : i;
}

export const Route = createFileRoute("/munch/track/$id")({
  component: TrackPage,
  head: () => ({
    meta: [{ title: "מעקב הזמנה · munch by GOI" }],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-2">
        <div className="text-lg font-black">לא הצלחנו לטעון את ההזמנה</div>
        <div className="text-sm text-black/60">{error.message}</div>
        <Link to="/customer/new-order" className="inline-block mt-3 text-[13px] font-bold" style={{ color: ACCENT }}>חזרה</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>הזמנה לא נמצאה</div>
    </div>
  ),
});

function TrackPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const getOrder = useServerFn(getMunchOrderFn);
  const cancelOrder = useServerFn(cancelMunchOrderFn);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["munch-order", id],
    queryFn: () => getOrder({ data: { id } }),
    refetchInterval: 15000,
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder({ data: { id } }),
    onSuccess: () => { toast.success("ההזמנה בוטלה"); refetch(); },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (!order) {
    return <div className="min-h-screen grid place-items-center">הזמנה לא נמצאה</div>;
  }

  const status = (order.status as MunchStatus) ?? "pending";
  const isTerminal = status === "delivered" || status === "cancelled" || status === "rejected";
  const isCancelled = status === "cancelled" || status === "rejected";
  const activeIdx = statusIndex(status);
  const items = (order.items ?? []) as { name: string; qty: number; price: number }[];

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "#FAFAF7" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center gap-2 px-3 h-12">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/customer/new-order" })}
            className="size-8 rounded-full grid place-items-center bg-black/5"
            aria-label="חזרה"
          >
            <ArrowRight className="size-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-black leading-tight">מעקב הזמנה</div>
            <div className="text-[10px] text-black/50">#{id.slice(0, 8)}</div>
          </div>
          <div className="text-[11px] font-black" style={{ color: ACCENT }}>
            munch<span className="text-black/50 font-bold"> by GOI</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-3 space-y-3">
        {/* Status hero */}
        <div
          className="rounded-3xl p-4 text-white"
          style={{
            background: isCancelled
              ? "linear-gradient(135deg, #ef4444, #b91c1c)"
              : status === "delivered"
                ? "linear-gradient(135deg, #10b981, #047857)"
                : `linear-gradient(135deg, ${ACCENT}, #d94a05)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-white/20 grid place-items-center">
              {isCancelled ? <XCircle className="size-6" /> :
                status === "delivered" ? <CheckCircle2 className="size-6" /> :
                  (() => { const Icon = STEPS[activeIdx].icon; return <Icon className="size-6" />; })()}
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-black leading-tight">
                {isCancelled ? (status === "rejected" ? "ההזמנה נדחתה" : "ההזמנה בוטלה") :
                  status === "pending" ? "מחכים לאישור הקיוסק" :
                    status === "preparing" ? `${order.kiosk?.name ?? "הקיוסק"} מכינים לך` :
                      status === "ready" ? "מוכן! מחפשים שליח" :
                        status === "picked_up" ? "השליח בדרך אליך" :
                          "נמסר בהצלחה"}
              </div>
              <div className="text-[11px] text-white/85 mt-0.5">
                {isCancelled
                  ? (order.rejection_reason ?? "אפשר להזמין שוב")
                  : status === "delivered"
                    ? "תודה שהזמנת ממאנצ׳!"
                    : "נעדכן אותך בזמן אמת"}
              </div>
            </div>
          </div>
        </div>

        {/* Progress timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl ring-1 ring-black/5 p-4">
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((s, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx && status !== "delivered";
                const complete = i <= activeIdx;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="relative w-full flex items-center justify-center">
                      {i > 0 && (
                        <div className="absolute right-1/2 left-0 top-1/2 -translate-y-1/2 h-[2px]"
                          style={{ background: i <= activeIdx ? ACCENT : "#E5E5E0" }} />
                      )}
                      {i < STEPS.length - 1 && (
                        <div className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2 h-[2px]"
                          style={{ background: i < activeIdx ? ACCENT : "#E5E5E0" }} />
                      )}
                      <div
                        className="relative size-9 rounded-full grid place-items-center transition-all"
                        style={{
                          background: complete ? ACCENT : "#F0F0EB",
                          color: complete ? "#fff" : "#101418",
                          boxShadow: active ? `0 0 0 4px ${ACCENT_SOFT}` : "none",
                        }}
                      >
                        {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                      </div>
                    </div>
                    <div className="text-[9px] font-bold text-center leading-tight" style={{ color: complete ? INK : "#101418aa" }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kiosk info */}
        {order.kiosk && (
          <div className="bg-white rounded-3xl ring-1 ring-black/5 p-3 flex items-center gap-3">
            <div className="size-12 rounded-2xl overflow-hidden bg-black/5 flex-shrink-0">
              {order.kiosk.image_url && <img src={order.kiosk.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black truncate">{order.kiosk.name}</div>
              <div className="text-[11px] text-black/55 truncate">{order.kiosk.address}</div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-3xl ring-1 ring-black/5 p-3">
          <div className="text-[12px] font-black mb-2">ההזמנה שלך</div>
          <div className="divide-y divide-black/5">
            {items.map((it, i) => (
              <div key={i} className="py-1.5 flex items-center justify-between text-[12px]">
                <div className="min-w-0 truncate">
                  <span className="font-bold">{it.qty}×</span> {it.name}
                </div>
                <div className="font-bold" style={{ color: ACCENT }}>₪{(it.price * it.qty).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-black/5 space-y-0.5 text-[11px]">
            <Row label="סכום ביניים" value={`₪${Number(order.subtotal).toFixed(0)}`} />
            <Row label="משלוח" value={`₪${Number(order.delivery_fee).toFixed(0)}`} />
            <Row label="דמי שירות" value={`₪${Number(order.service_fee).toFixed(0)}`} />
            <div className="pt-1 mt-1 border-t border-black/5">
              <Row
                label={<span className="font-black text-[13px]">סה״כ</span>}
                value={<span className="font-black text-[14px]" style={{ color: ACCENT }}>₪{Number(order.total).toFixed(0)}</span>}
              />
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-3xl ring-1 ring-black/5 p-3">
          <div className="text-[10px] text-black/50 font-bold mb-0.5">כתובת משלוח</div>
          <div className="text-[13px] font-bold">{order.dropoff_address}</div>
          {order.notes && (
            <div className="mt-2 text-[11px] text-black/60 border-t border-black/5 pt-2">
              <span className="font-bold">הערות: </span>{order.notes}
            </div>
          )}
        </div>

        {/* Actions */}
        {status === "pending" && (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
            className="w-full h-11 rounded-2xl border border-red-200 text-red-600 font-black text-[13px] disabled:opacity-60"
          >
            {cancel.isPending ? "מבטל..." : "ביטול הזמנה"}
          </button>
        )}

        {isTerminal && (
          <Link
            to="/customer/new-order"
            className="w-full h-11 rounded-2xl text-white font-black text-[13px] grid place-items-center"
            style={{ background: ACCENT }}
          >
            להזמנה חדשה
          </Link>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[#101418]/60">{label}</div>
      <div>{value}</div>
    </div>
  );
}
