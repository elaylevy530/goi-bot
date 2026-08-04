import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyOrdersFn } from "@/lib/customer-account.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, Search, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/customer/orders")({
  head: () => ({ meta: [{ title: "ההזמנות שלי — Goi" }] }),
  component: OrdersPage,
});

const STATUS_STYLES: Record<string, string> = {
  "טיוטה": "bg-muted text-muted-foreground",
  "נשלחה לשליחים": "bg-blue-100 text-blue-700",
  "נבחר שליח": "bg-purple-100 text-purple-700",
  "פעילה": "bg-amber-100 text-amber-800",
  "הושלמה": "bg-emerald-100 text-emerald-700",
  "בוטלה": "bg-red-100 text-red-700",
};

const FILTERS = [
  { key: "all", label: "הכל" },
  { key: "active", label: "בפעילות" },
  { key: "done", label: "הושלמו" },
  { key: "cancelled", label: "בוטלו" },
] as const;

function OrdersPage() {
  const getOrders = useServerFn(getMyOrdersFn);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => getOrders(),
  });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const filtered = (orders ?? []).filter((o) => {
    if (filter === "active" && ["הושלמה", "בוטלה"].includes(o.status)) return false;
    if (filter === "done" && o.status !== "הושלמה") return false;
    if (filter === "cancelled" && o.status !== "בוטלה") return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      const hay = `${o.job_number} ${o.pickup_address ?? ""} ${o.dropoff_address ?? ""} ${o.description ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="size-6" />
        <h1 className="text-2xl font-extrabold">ההזמנות שלי</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי מספר, כתובת או תיאור…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">טוען…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          לא נמצאו הזמנות בקטגוריה הזו.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Link key={o.id} to="/customer/order/$id" params={{ id: o.id }} className="block group">
              <Card className="group-hover:border-primary transition">
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">#{o.job_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status] ?? "bg-muted text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {o.pickup_address} ← {o.dropoff_address}
                    </div>
                    {o.description ? <div className="text-xs text-muted-foreground mt-1 truncate">{o.description}</div> : null}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(o.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                  <div className="text-left">
                    {o.customer_price ? <div className="font-bold">₪{Number(o.customer_price).toFixed(0)}</div> : null}
                    {o.recipient_tracking_token ? (
                      <span className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                        פרטים <ExternalLink className="size-3" />
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
