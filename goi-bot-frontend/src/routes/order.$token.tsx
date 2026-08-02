import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Package } from "lucide-react";

export const Route = createFileRoute("/order/$token")({
  ssr: false,
  component: PublicOrderPage,
  head: () => ({ meta: [{ title: "הזמנת משלוח" }] }),
});

function PublicOrderPage() {
  const { token } = Route.useParams();
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    dropoff_address: "",
    dropoff_city: "",
    dropoff_notes: "",
    items: "",
    order_total: "",
  });
  const [result, setResult] = useState<{ job_number: string; job_id: string } | null>(null);

  const { data: meta } = useQuery({
    queryKey: ["order-token-meta", token],
    queryFn: () => apiFetch<{ ok: boolean; enabled?: boolean; customers?: { name?: string; business_name?: string } | null }>(
      `/api/public/intake/${encodeURIComponent(token)}`,
    ),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          order_total: form.order_total ? Number(form.order_total) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "שגיאה בשליחה");
      return json;
    },
    onSuccess: (j) => setResult({ job_number: j.job_number, job_id: j.job_id }),
  });

  const businessName =
    meta?.customers?.business_name || meta?.customers?.name || "העסק";

  if (meta && meta.ok === false) {
    return (
      <Wrap>
        <p className="text-center text-slate-600 py-8">חיבור ההזמנות כרגע כבוי. נסה שוב מאוחר יותר.</p>
      </Wrap>
    );
  }

  if (meta && meta.enabled === false) {
    return (
      <Wrap>
        <p className="text-center text-slate-600 py-8">חיבור ההזמנות כרגע כבוי. נסה שוב מאוחר יותר.</p>
      </Wrap>
    );
  }

  if (result) {
    return (
      <Wrap>
        <div className="text-center py-6">
          <div className="size-16 rounded-full bg-emerald-50 grid place-items-center mx-auto mb-4">
            <CheckCircle2 className="size-8 text-[#35AD29]" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">ההזמנה התקבלה ✅</h2>
          <p className="text-slate-600 mb-1">
            מספר הזמנה: <span className="font-mono font-bold">{result.job_number}</span>
          </p>
          <p className="text-slate-500 text-sm">
            השליח יישלח אליך בקרוב. {businessName} ידאג לעדכן אותך.
          </p>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div className="text-center mb-6">
        <div className="size-12 rounded-full bg-emerald-50 grid place-items-center mx-auto mb-3">
          <Package className="size-6 text-[#35AD29]" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">הזמנת משלוח מ-{businessName}</h1>
        <p className="text-sm text-slate-500 mt-1">מלא פרטים קצרים והשליח יגיע אליך</p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="שם מלא *">
          <Input
            required
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
        </Field>
        <Field label="טלפון *">
          <Input
            required
            type="tel"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
          />
        </Field>
        <Field label="כתובת למסירה *">
          <Input
            required
            placeholder="רחוב, מספר, עיר"
            value={form.dropoff_address}
            onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })}
          />
        </Field>
        <Field label="עיר">
          <Input
            value={form.dropoff_city}
            onChange={(e) => setForm({ ...form, dropoff_city: e.target.value })}
          />
        </Field>
        <Field label="הערות לשליח">
          <Textarea
            rows={2}
            placeholder="קומה, דירה, קוד כניסה…"
            value={form.dropoff_notes}
            onChange={(e) => setForm({ ...form, dropoff_notes: e.target.value })}
          />
        </Field>
        <Field label="פריטים / הזמנה">
          <Textarea
            rows={2}
            value={form.items}
            onChange={(e) => setForm({ ...form, items: e.target.value })}
          />
        </Field>
        <Field label="סכום הזמנה (₪)">
          <Input
            type="number"
            value={form.order_total}
            onChange={(e) => setForm({ ...form, order_total: e.target.value })}
          />
        </Field>

        {submit.error && (
          <div className="text-sm text-red-600">{(submit.error as Error).message}</div>
        )}

        <Button
          type="submit"
          disabled={submit.isPending}
          className="bg-[#35AD29] hover:bg-[#2E9624] text-white h-12 text-base font-bold"
        >
          {submit.isPending ? "שולח…" : "שלח הזמנה"}
        </Button>
      </form>
    </Wrap>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}
