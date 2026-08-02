import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { nestListMyBillingRecords } from "@/lib/nest-domain";
import { Wallet, TrendingUp, Clock, CheckCircle2, Percent, CreditCard, Lock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";
import { createSetupTokenFn, confirmVaultFn, removeVaultFn } from "@/lib/paypal-billing.functions";

export const Route = createFileRoute("/business/billing")({
  head: () => ({ meta: [{ title: "חיובים ותשלומים — Goi" }] }),
  ssr: false,
  component: BillingPage,
});

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  open: "bg-blue-50 text-blue-800",
  paid: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};
const STATUS_HE: Record<string, string> = { pending: "ממתין", open: "פתוח", paid: "שולם", cancelled: "בוטל" };

function PaymentMethodCard() {
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const m = me as { payment_method_on_file?: boolean; payment_method_brand?: string; payment_method_last4?: string; paypal_email?: string; billing_cycle?: string } | null;
  const setupFn = useServerFn(createSetupTokenFn);
  const confirmFn = useServerFn(confirmVaultFn);
  const removeFn = useServerFn(removeVaultFn);

  // Auto-confirm if the user has just returned from PayPal approval.
  useEffect(() => {
    const url = new URL(window.location.href);
    const setupId = url.searchParams.get("setup_token_id") || url.searchParams.get("approval_token_id");
    if (!setupId) return;
    url.searchParams.delete("setup_token_id");
    url.searchParams.delete("approval_token_id");
    window.history.replaceState({}, "", url.toString());
    confirmFn({ data: { setup_token_id: setupId } })
      .then(() => { toast.success("אמצעי תשלום PayPal נשמר — שידור משלוחים פעיל"); qc.invalidateQueries({ queryKey: ["business-me"] }); })
      .catch((e: Error) => toast.error("שגיאה באישור PayPal: " + e.message));
  }, [confirmFn, qc]);

  const startSetup = useMutation({
    mutationFn: async (source: "paypal" | "card") => {
      const origin = window.location.origin;
      const r = await setupFn({ data: {
        source,
        return_url: `${origin}/business/billing`,
        cancel_url: `${origin}/business/billing?paypal=cancel`,
      }});
      if (!r.approve_url) throw new Error("PayPal לא החזיר קישור אישור");
      window.location.href = r.approve_url;
      return r;
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => removeFn({}),
    onSuccess: () => { toast.success("אמצעי התשלום הוסר"); qc.invalidateQueries({ queryKey: ["business-me"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (m?.payment_method_on_file) {
    return (
      <Card className="rounded-2xl border-emerald-200 bg-emerald-50/40 mb-4">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-100 grid place-items-center text-emerald-700"><CreditCard className="size-6" /></div>
          <div className="flex-1 text-right">
            <div className="font-extrabold text-slate-900">אמצעי תשלום פעיל</div>
            <div className="text-sm text-slate-600">
              {m.payment_method_brand}{m.payment_method_last4 ? ` •••• ${m.payment_method_last4}` : ""}{m.paypal_email ? ` · ${m.paypal_email}` : ""}
              {" · חיוב "}{m.billing_cycle === "monthly" ? "חודשי" : m.billing_cycle === "weekly" ? "שבועי" : m.billing_cycle === "daily" ? "יומי" : "פר־משלוח"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} הסר
          </Button>
        </CardContent>
      </Card>
    );
  }

  const busy = startSetup.isPending;
  return (
    <Card className="rounded-2xl border-amber-300 bg-amber-50/40 mb-4">
      <CardContent className="p-5 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="size-12 rounded-xl bg-amber-100 grid place-items-center text-amber-700"><Lock className="size-6" /></div>
        <div className="flex-1 text-right">
          <div className="font-extrabold text-slate-900">לא ניתן לשדר משלוחים</div>
          <div className="text-sm text-slate-600">חבר חשבון PayPal Business או כרטיס אשראי כדי שנוכל לחייב אוטומטית עבור משלוחים.</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => startSetup.mutate("paypal")} disabled={busy} className="bg-[#003087] hover:bg-[#002060] text-white">
            {busy && <Loader2 className="size-4 animate-spin ml-2" />} חבר PayPal
          </Button>
          <Button onClick={() => startSetup.mutate("card")} disabled={busy} variant="outline">
            <CreditCard className="size-4 ml-1" /> כרטיס אשראי
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingPage() {
  const { data: me } = useMyBusiness();
  const { data } = useQuery({
    queryKey: ["billing", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyBillingRecords(),
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRecords = (data ?? []).filter((b: any) => new Date(b.created_at).getTime() >= monthStart);

  const monthSpend = monthRecords.reduce((s, b: any) => s + Number(b.customer_price || 0), 0);
  const openBalance = (data ?? []).filter((b: any) => b.billing_status === "open").reduce((s, b: any) => s + Number(b.customer_price || 0), 0);
  const paidCount = (data ?? []).filter((b: any) => b.billing_status === "paid").length;
  const pendingCount = (data ?? []).filter((b: any) => b.billing_status === "pending" || b.billing_status === "open").length;
  const totalFee = (data ?? []).reduce((s, b: any) => s + Number(b.platform_fee || 0), 0);

  return (
    <BusinessShell title="חיובים ותשלומים" subtitle="סיכום הוצאה והיסטוריית חיובים">
      <PaymentMethodCard />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi icon={TrendingUp} label="הוצאה החודש" value={`₪${Math.round(monthSpend).toLocaleString("he-IL")}`} accent="bg-emerald-50 text-emerald-700" />
        <Kpi icon={Clock} label="יתרה פתוחה" value={`₪${Math.round(openBalance).toLocaleString("he-IL")}`} accent="bg-amber-50 text-amber-700" />
        <Kpi icon={CheckCircle2} label="ששולמו" value={paidCount} accent="bg-blue-50 text-blue-700" />
        <Kpi icon={Wallet} label="ממתינים לחיוב" value={pendingCount} accent="bg-slate-100 text-slate-700" />
        <Kpi icon={Percent} label="עמלת Goi" value={`₪${Math.round(totalFee).toLocaleString("he-IL")}`} accent="bg-indigo-50 text-indigo-700" />
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <h2 className="text-lg font-extrabold text-slate-900 text-right mb-3">היסטוריית חיובים</h2>
          {!data || data.length === 0 ? (
            <EmptyState icon={Wallet} title="אין רשומות חיוב עדיין" desc="כשיושלם משלוח, רשומת חיוב תיווצר אוטומטית." />
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-2.5">
                {data.map((b: any) => (
                  <div key={b.id} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] font-bold text-slate-900">{b.jobs?.job_number ?? "—"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{b.jobs?.job_type ?? "—"} · {new Date(b.created_at).toLocaleDateString("he-IL")}</div>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full font-bold shrink-0 ${STATUS_STYLE[b.billing_status]}`}>{STATUS_HE[b.billing_status]}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400">ללקוח</div>
                        <div className="font-black text-[13px]">₪{Number(b.customer_price).toLocaleString("he-IL")}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">לשליח</div>
                        <div className="font-bold text-[13px]">₪{Number(b.courier_payment).toLocaleString("he-IL")}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">עמלה</div>
                        <div className="font-bold text-[13px]">₪{Number(b.platform_fee).toLocaleString("he-IL")}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-slate-100">
                      <th className="text-right py-2 font-semibold">תאריך</th>
                      <th className="text-right py-2 font-semibold">עבודה</th>
                      <th className="text-right py-2 font-semibold">סוג</th>
                      <th className="text-right py-2 font-semibold">מחיר ללקוח</th>
                      <th className="text-right py-2 font-semibold">תשלום לשליח</th>
                      <th className="text-right py-2 font-semibold">עמלה</th>
                      <th className="text-right py-2 font-semibold">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((b: any) => (
                      <tr key={b.id} className="border-b border-slate-50">
                        <td className="py-2.5 text-xs">{new Date(b.created_at).toLocaleDateString("he-IL")}</td>
                        <td className="py-2.5 font-mono text-xs">{b.jobs?.job_number ?? "—"}</td>
                        <td className="py-2.5">{b.jobs?.job_type ?? "—"}</td>
                        <td className="py-2.5 font-bold">₪{Number(b.customer_price).toLocaleString("he-IL")}</td>
                        <td className="py-2.5">₪{Number(b.courier_payment).toLocaleString("he-IL")}</td>
                        <td className="py-2.5">₪{Number(b.platform_fee).toLocaleString("he-IL")}</td>
                        <td className="py-2.5"><span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_STYLE[b.billing_status]}`}>{STATUS_HE[b.billing_status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </BusinessShell>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`size-11 rounded-xl grid place-items-center ${accent ?? "bg-slate-100"}`}><Icon className="size-5" /></div>
        <div className="flex-1 text-right">
          <div className="text-xs text-slate-500 font-semibold">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
