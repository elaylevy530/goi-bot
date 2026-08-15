import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BusinessShell, useMyBusiness, useWalletBalance } from "@/components/BusinessShell";
import { Button } from "@/components/ui/button";
import { nestListMyBillingRecords, nestListWalletTransactions } from "@/lib/nest-domain";
import { CreditCard, Download, Loader2, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";
import { createSetupTokenFn, confirmVaultFn, removeVaultFn } from "@/lib/paypal-billing.functions";
import { SaveCardDialog } from "@/components/SaveCardDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business/billing")({
  head: () => ({ meta: [{ title: "חיובים ותשלומים — Goi" }] }),
  ssr: false,
  component: BillingPage,
});

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
  const [cardOpen, setCardOpen] = useState(false);

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

  const startPaypal = useMutation({
    mutationFn: async () => {
      const origin = window.location.origin;
      const r = await setupFn({
        data: {
          source: "paypal",
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

  const cardDialog = (
    <SaveCardDialog
      open={cardOpen}
      onClose={() => setCardOpen(false)}
      onSaved={() => {
        setCardOpen(false);
        qc.invalidateQueries({ queryKey: ["business-me"] });
      }}
    />
  );

  if (m?.payment_method_on_file) {
    return (
      <>
        <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-kpi-volume-bg text-primary">
              <CreditCard className="size-5" />
            </div>
            <p className="text-sm font-medium text-text-subtle">אמצעי תשלום</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCardOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                שנה כרטיס
              </button>
              <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="text-sm font-semibold text-text-muted hover:underline">
                {remove.isPending ? "מסיר…" : "הסר"}
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-text-strong">
                {m.payment_method_brand}
                {m.payment_method_last4 ? ` ••${m.payment_method_last4}` : ""}
              </p>
              <p className="text-xs text-text-muted">{m.paypal_email || "PayPal"}</p>
            </div>
          </div>
          <p className="text-xs text-text-muted">
            חיוב {m.billing_cycle === "monthly" ? "חודשי" : m.billing_cycle === "weekly" ? "שבועי" : m.billing_cycle === "daily" ? "יומי" : "פר־משלוח"}
          </p>
        </article>
        {cardDialog}
      </>
    );
  }

  const busy = startPaypal.isPending;
  return (
    <>
      <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-warning/40 bg-warning-bg p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-warning/20 text-warning-text">
            <Lock className="size-5" />
          </div>
          <p className="text-sm font-bold text-text-strong">אין אמצעי תשלום</p>
        </div>
        <p className="text-sm text-text-subtle">חבר PayPal או כרטיס כדי לשדר משלוחים.</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button onClick={() => startPaypal.mutate()} disabled={busy} className="bg-navy text-white hover:bg-navy/90">
            {busy && <Loader2 className="size-4 animate-spin" />} חבר PayPal
          </Button>
          <Button onClick={() => setCardOpen(true)} disabled={busy} variant="outline">
            <CreditCard className="size-4" /> כרטיס
          </Button>
        </div>
      </article>
      {cardDialog}
    </>
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
  const invoiceMonths = useMemo(() => groupInvoicesByMonth(data ?? []), [data]);
  const walletRows = useMemo(
    () => withRunningBalance(txs as Array<{ id: string; amount?: number; description?: string; kind?: string; created_at: string }>),
    [txs],
  );

  return (
    <BusinessShell title="חיובים ותשלומים" subtitle="סיכום הוצאה והיסטוריית חיובים">
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-panel">
            <p className="text-sm font-medium text-text-subtle">יתרה נוכחית</p>
            <div className="flex items-end justify-between gap-3">
              <Button asChild className="rounded-lg">
                <Link to="/business/wallet">טען יתרה</Link>
              </Button>
              <p className="text-[1.75rem] font-bold text-text-strong">₪{Math.round(balance).toLocaleString("he-IL")}</p>
            </div>
            <p className="text-xs text-text-muted">טעינה אוטומטית כשהיתרה יורדת מתחת לכיסוי משלוח.</p>
          </article>

          <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md bg-success-bg px-2 py-1 text-[10px] font-bold text-success-text">החודש</span>
              <p className="text-sm font-medium text-text-subtle">הוצאה חודשית</p>
            </div>
            <p className="text-[1.75rem] font-bold text-text-strong">₪{Math.round(monthSpend).toLocaleString("he-IL")}</p>
            <p className="text-xs text-text-muted">{monthRecords.length} משלוחים החודש</p>
          </article>

          <PaymentMethodCard />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="w-full rounded-xl border border-border bg-surface p-5 shadow-panel lg:w-[25rem]">
            <h2 className="mb-4 text-base font-bold text-text-strong">חשבוניות אחרונות להורדה</h2>
            <div className="space-y-2">
              {invoiceMonths.length === 0 && (
                <p className="py-6 text-center text-sm text-text-muted">אין חשבוניות עדיין</p>
              )}
              {invoiceMonths.map((inv) => (
                <div key={inv.key} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-3">
                  <button
                    type="button"
                    onClick={() => downloadInvoiceMonth(inv)}
                    className="grid size-9 place-items-center rounded-full bg-surface text-primary shadow-kpi"
                    aria-label={`הורד ${inv.label}`}
                  >
                    <Download className="size-4" />
                  </button>
                  <div className="min-w-0 text-right">
                    <div className="truncate text-sm font-semibold">{inv.label}</div>
                    <div className="text-xs text-text-muted">
                      {inv.count} חיובים · ₪{Math.round(inv.total).toLocaleString("he-IL")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-5 shadow-panel">
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

        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
          <div className="flex items-center justify-between px-6 py-4">
            <button type="button" onClick={() => downloadWalletCsv(walletRows)} className="text-sm font-semibold text-primary hover:underline">
              הורד דו״ח אקסל מלא ←
            </button>
            <h2 className="text-base font-bold text-text-strong">פעילות אחרונה בחשבון</h2>
          </div>
          {walletRows.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Wallet} title="אין רשומות חיוב עדיין" desc="כשיושלם משלוח, רשומת חיוב תיווצר אוטומטית." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted text-xs text-text-muted">
                  <th className="px-4 py-3 text-right font-semibold">תאריך ושעה</th>
                  <th className="px-4 py-3 text-right font-semibold">תיאור הפעולה</th>
                  <th className="px-4 py-3 text-right font-semibold">סוג פעולה</th>
                  <th className="px-4 py-3 text-right font-semibold">סכום</th>
                  <th className="px-4 py-3 text-right font-semibold">יתרה אחרי הפעולה</th>
                </tr>
              </thead>
              <tbody>
                {walletRows.map((t) => {
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
                      <td className={cn("px-4 py-3.5 font-bold", pos ? "text-success-text" : "text-text-strong")}>
                        {pos ? "+" : ""}₪{Number(t.amount).toLocaleString("he-IL")}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">₪{Math.round(t.balanceAfter).toLocaleString("he-IL")}</td>
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

type InvoiceMonth = {
  key: string;
  label: string;
  count: number;
  total: number;
  rows: Array<Record<string, unknown>>;
};

function groupInvoicesByMonth(records: Array<Record<string, unknown>>): InvoiceMonth[] {
  const map = new Map<string, InvoiceMonth>();
  for (const rec of records) {
    const created = new Date(String(rec.created_at || ""));
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const existing = map.get(key);
    const amount = Number(rec.customer_price || 0);
    if (existing) {
      existing.count += 1;
      existing.total += amount;
      existing.rows.push(rec);
    } else {
      map.set(key, {
        key,
        label: created.toLocaleDateString("he-IL", { month: "long", year: "numeric" }),
        count: 1,
        total: amount,
        rows: [rec],
      });
    }
  }
  return Array.from(map.values()).slice(0, 6);
}

function withRunningBalance<T extends { amount?: number; created_at: string }>(txs: T[]) {
  const sorted = [...txs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let run = 0;
  const withBal = sorted.map((t) => {
    run += Number(t.amount || 0);
    return { ...t, balanceAfter: run };
  });
  return withBal.reverse();
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadInvoiceMonth(inv: InvoiceMonth) {
  downloadCsv(
    `goi-invoices-${inv.key}.csv`,
    ["תאריך", "מספר הזמנה", "סכום"],
    inv.rows.map((r) => [
      r.created_at ? new Date(String(r.created_at)).toLocaleDateString("he-IL") : "",
      String((r.jobs as { job_number?: string } | undefined)?.job_number || "חיוב"),
      String(r.customer_price ?? ""),
    ]),
  );
}

function downloadWalletCsv(rows: Array<{ created_at: string; description?: string; kind?: string; amount?: number; balanceAfter: number }>) {
  downloadCsv(
    `goi-wallet-${new Date().toISOString().slice(0, 10)}.csv`,
    ["תאריך", "תיאור", "סוג", "סכום", "יתרה"],
    rows.map((r) => [
      new Date(r.created_at).toLocaleString("he-IL"),
      r.description || r.kind || "",
      Number(r.amount) >= 0 ? "זיכוי" : "חיוב",
      String(r.amount ?? ""),
      String(Math.round(r.balanceAfter)),
    ]),
  );
}
