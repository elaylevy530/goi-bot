import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness, useWalletBalance } from "@/components/BusinessShell";
import { Button } from "@/components/ui/button";
import { nestListMyBillingRecords, nestListWalletTransactions } from "@/lib/nest-domain";
import { CreditCard, Loader2, Lock, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";
import { createSetupTokenFn, confirmVaultFn, removeVaultFn } from "@/lib/paypal-billing.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business/billing")({
  head: () => ({ meta: [{ title: "חיובים ותשלומים — Goi" }] }),
  ssr: false,
  component: BillingPage,
});

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning-bg text-warning-text",
  open: "bg-kpi-volume-bg text-info-text",
  paid: "bg-success-bg text-success-text",
  cancelled: "bg-muted text-text-muted",
};
const STATUS_HE: Record<string, string> = { pending: "ממתין", open: "פתוח", paid: "שולם", cancelled: "בוטל" };

function PaymentMethodCard() {
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const m = me as {
    payment_method_on_file?: boolean;
    payment_method_brand?: string;
    payment_method_last4?: string;
    paypal_email?: string;
    billing_cycle?: string;
  } | null;
  const setupFn = useServerFn(createSetupTokenFn);
  const confirmFn = useServerFn(confirmVaultFn);
  const removeFn = useServerFn(removeVaultFn);

  useEffect(() => {
    const url = new URL(window.location.href);
    const setupId = url.searchParams.get("setup_token_id") || url.searchParams.get("approval_token_id");
    if (!setupId) return;
    url.searchParams.delete("setup_token_id");
    url.searchParams.delete("approval_token_id");
    window.history.replaceState({}, "", url.toString());
    confirmFn({ data: { setup_token_id: setupId } })
      .then(() => {
        toast.success("אמצעי תשלום PayPal נשמר — שידור משלוחים פעיל");
        qc.invalidateQueries({ queryKey: ["business-me"] });
      })
      .catch((e: Error) => toast.error("שגיאה באישור PayPal: " + e.message));
  }, [confirmFn, qc]);

  const startSetup = useMutation({
    mutationFn: async (source: "paypal" | "card") => {
      const origin = window.location.origin;
      const r = await setupFn({
        data: {
          source,
          return_url: `${origin}/business/billing`,
          cancel_url: `${origin}/business/billing?paypal=cancel`,
        },
      });
      if (!r.approve_url) throw new Error("PayPal לא החזיר קישור אישור");
      window.location.href = r.approve_url;
      return r;
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => removeFn({}),
    onSuccess: () => {
      toast.success("אמצעי התשלום הוסר");
      qc.invalidateQueries({ queryKey: ["business-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (m?.payment_method_on_file) {
    return (
      <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-kpi-volume-bg text-info-text">
            <CreditCard className="size-5" />
          </div>
          <p className="text-sm font-medium text-text-subtle">אמצעי תשלום</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} הסר
          </Button>
          <div className="text-right">
            <p className="text-lg font-bold text-text-strong">
              {m.payment_method_brand}
              {m.payment_method_last4 ? ` ending in ${m.payment_method_last4}` : ""}
            </p>
            <p className="text-xs text-text-muted">{m.paypal_email || "PayPal"}</p>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          חיוב {m.billing_cycle === "monthly" ? "חודשי" : m.billing_cycle === "weekly" ? "שבועי" : m.billing_cycle === "daily" ? "יומי" : "פר־משלוח"}
        </p>
      </article>
    );
  }

  const busy = startSetup.isPending;
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-warning/40 bg-warning-bg p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-warning/20 text-warning-text">
          <Lock className="size-5" />
        </div>
        <p className="text-sm font-bold text-text-strong">אין אמצעי תשלום</p>
      </div>
      <p className="text-sm text-text-subtle">חבר PayPal או כרטיס כדי לשדר משלוחים.</p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button onClick={() => startSetup.mutate("paypal")} disabled={busy} className="bg-navy text-white hover:bg-navy/90">
          {busy && <Loader2 className="size-4 animate-spin" />} חבר PayPal
        </Button>
        <Button onClick={() => startSetup.mutate("card")} disabled={busy} variant="outline">
          <CreditCard className="size-4" /> כרטיס
        </Button>
      </div>
    </article>
  );
}

function BillingPage() {
  const { data: me } = useMyBusiness();
  const { data: balance = 0 } = useWalletBalance(me?.id);
  const { data } = useQuery({
    queryKey: ["billing", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyBillingRecords(),
  });
  const { data: txs = [] } = useQuery({
    queryKey: ["wallet-tx", me?.id],
    enabled: !!me?.id,
    queryFn: nestListWalletTransactions,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRecords = (data ?? []).filter((b) => new Date(String((b as { created_at?: string }).created_at)).getTime() >= monthStart);
  const monthSpend = monthRecords.reduce((s, b) => s + Number((b as { customer_price?: number }).customer_price || 0), 0);

  const monthly = useMemo(() => spendByMonth(data ?? []), [data]);

  return (
    <BusinessShell title="חיובים ותשלומים" subtitle="סיכום הוצאה והיסטוריית חיובים">
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row">
          <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-kpi-fleet-bg text-success-text">
                <Wallet className="size-5" />
              </div>
              <p className="text-sm font-medium text-text-subtle">יתרה נוכחית</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button asChild size="sm">
                <Link to="/business/wallet">טען יתרה</Link>
              </Button>
              <p className="text-[1.75rem] font-bold text-text-strong">₪{Math.round(balance).toLocaleString("he-IL")}</p>
            </div>
            <p className="text-xs text-text-muted">כל משלוח יורד מהיתרה אוטומטית כשיש כיסוי.</p>
          </article>

          <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md bg-success-bg px-2 py-1 text-[10px] font-bold text-success-text">החודש</span>
              <p className="text-sm font-medium text-text-subtle">הוצאה חודשית</p>
            </div>
            <p className="text-[1.75rem] font-bold text-text-strong">₪{Math.round(monthSpend).toLocaleString("he-IL")}</p>
            <p className="text-xs text-text-muted">{monthRecords.length} משלוחים החודש</p>
          </article>

          <PaymentMethodCard />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <section className="w-full rounded-xl border border-border bg-surface p-5 shadow-card lg:w-[25rem]">
            <h2 className="mb-4 text-base font-bold text-text-strong">חיובים אחרונים</h2>
            <div className="space-y-2">
              {(data ?? []).slice(0, 5).map((b) => {
                const rec = b as { id: string; created_at: string; customer_price?: number; jobs?: { job_number?: string } };
                return (
                  <div key={rec.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-3">
                    <span className="text-sm font-bold">₪{Number(rec.customer_price || 0).toLocaleString("he-IL")}</span>
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-semibold">{rec.jobs?.job_number ?? "חיוב"}</div>
                      <div className="text-xs text-text-muted">{new Date(rec.created_at).toLocaleDateString("he-IL")}</div>
                    </div>
                  </div>
                );
              })}
              {(data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-text-muted">אין חיובים עדיין</p>
              )}
            </div>
          </section>

          <section className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-text-muted">מגמת הוצאות בחצי שנה האחרונה</p>
              <h2 className="text-base font-bold text-text-strong">הוצאה חודשית ממוצעת</h2>
            </div>
            <div className="flex h-48 items-end justify-between gap-2 px-2">
              {monthly.map((m) => {
                const max = Math.max(...monthly.map((x) => x.value), 1);
                const h = Math.max(8, Math.round((m.value / max) * 140));
                return (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] text-text-muted">₪{Math.round(m.value).toLocaleString("he-IL")}</span>
                    <div className="w-6 rounded-t-md bg-primary" style={{ height: h }} />
                    <span className="text-xs text-text-subtle">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/business/wallet" className="text-sm font-semibold text-text-muted hover:text-text-strong">
              לארנק המלא ←
            </Link>
            <h2 className="text-base font-bold text-text-strong">פעילות אחרונה בחשבון</h2>
          </div>
          {txs.length === 0 && (!data || data.length === 0) ? (
            <div className="p-6">
              <EmptyState icon={Wallet} title="אין רשומות חיוב עדיין" desc="כשיושלם משלוח, רשומת חיוב תיווצר אוטומטית." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-text-muted">
                  <th className="px-4 py-3 text-right font-semibold">תאריך ושעה</th>
                  <th className="px-4 py-3 text-right font-semibold">תיאור הפעולה</th>
                  <th className="px-4 py-3 text-right font-semibold">סוג פעולה</th>
                  <th className="px-4 py-3 text-right font-semibold">סכום</th>
                </tr>
              </thead>
              <tbody>
                {(txs as Array<{ id: string; amount?: number; description?: string; kind?: string; created_at: string }>).map((t) => {
                  const pos = Number(t.amount) >= 0;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3.5 text-xs text-text-muted">{new Date(t.created_at).toLocaleString("he-IL")}</td>
                      <td className="px-4 py-3.5">{t.description || t.kind || "תנועת ארנק"}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("rounded-pill px-2.5 py-1 text-xs font-bold", pos ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text")}>
                          {pos ? "זיכוי" : "חיוב"}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3.5 font-bold", pos ? "text-success-text" : "text-danger-text")}>
                        {pos ? "+" : ""}₪{Number(t.amount).toLocaleString("he-IL")}
                      </td>
                    </tr>
                  );
                })}
                {(data ?? []).slice(0, 8).map((b) => {
                  const rec = b as { id: string; created_at: string; customer_price?: number; billing_status?: string; jobs?: { job_number?: string } };
                  return (
                    <tr key={`b-${rec.id}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-3.5 text-xs text-text-muted">{new Date(rec.created_at).toLocaleDateString("he-IL")}</td>
                      <td className="px-4 py-3.5">משלוח {rec.jobs?.job_number ?? ""}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("rounded-pill px-2.5 py-1 text-xs font-bold", STATUS_STYLE[rec.billing_status || ""] || "bg-muted")}>
                          {STATUS_HE[rec.billing_status || ""] || rec.billing_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold">₪{Number(rec.customer_price || 0).toLocaleString("he-IL")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}

function spendByMonth(records: Array<Record<string, unknown>>) {
  const now = new Date();
  const months: Array<{ label: string; value: number; key: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({
      key,
      label: d.toLocaleDateString("he-IL", { month: "short" }),
      value: 0,
    });
  }
  for (const rec of records) {
    const created = new Date(String(rec.created_at || ""));
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const slot = months.find((m) => m.key === key);
    if (slot) slot.value += Number(rec.customer_price || 0);
  }
  return months;
}
