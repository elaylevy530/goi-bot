import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness, useWalletBalance } from "@/components/BusinessShell";
import { nestListMyBillingRecords, nestListWalletTransactions } from "@/lib/nest-domain";
import { CalendarDays, Download, Package, ReceiptText, Wallet } from "lucide-react";
import { Badge, DataTable, Panel, money } from "@/components/business/goi/GoiUi";

export const Route = createFileRoute("/business/billing")({
  head: () => ({ meta: [{ title: "חשבוניות וחיובים — Goi" }] }),
  ssr: false,
  component: BillingPage,
});

function PaymentMethodCard() {
  return (
    <Panel className="payment-card">
      <h3>
        <Wallet size={18} /> אמצעי תשלום
      </h3>
      <p>סליקת כרטיס תחובר בהמשך. הארנק והחשבוניות ממשיכים לעבוד כרגיל.</p>
      <Link to="/business/wallet" className="btn outline">לארנק העסק</Link>
    </Panel>
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
    <BusinessShell title="חשבוניות וחיובים" subtitle="כל התשלומים, התנועות והחשבוניות שלך מול GOI">
      <div className="extra-page extra-billing">
        <div className="billing-cards">
          <Panel className="billing-stat">
            <CalendarDays className="purple-text" />
            <small>משלוחים החודש</small>
            <strong>{monthRecords.length}</strong>
            <span>לפי רשומות החיוב</span>
          </Panel>
          <Panel className="billing-stat">
            <ReceiptText className="blue-text" />
            <small>סה״כ חיובים החודש</small>
            <strong>{money(monthSpend)}</strong>
            <span>{monthRecords.length} משלוחים לחיוב</span>
          </Panel>
          <Panel className="billing-stat">
            <Package className="green-text" />
            <small>מגמה חצי שנתית</small>
            <strong>{money(monthly.reduce((s, m) => s + m.value, 0))}</strong>
            <span>סכום 6 החודשים האחרונים</span>
          </Panel>
          <Panel className="balance-card">
            <Wallet size={22} />
            <small>יתרת העסק</small>
            <strong>{money(balance)}</strong>
            <Link to="/business/wallet" className="btn primary">טען יתרה</Link>
            <p>טעינה דרך מסך הארנק הקיים. לא מבוצעת כאן סליקה אוטומטית.</p>
          </Panel>
          <PaymentMethodCard />
        </div>
        <Panel
          title="פעילות בחשבון"
          action={
            <button type="button" className="btn outline small" onClick={() => downloadWalletCsv(walletRows)}>
              <Download size={14} /> ייצוא פירוט
            </button>
          }
        >
          <DataTable
            headers={["תאריך", "סוג פעולה", "תיאור", "סכום", "יתרה"]}
            rows={walletRows.slice(0, 12).map((t) => [
              new Date(t.created_at).toLocaleString("he-IL"),
              Number(t.amount) >= 0 ? "זיכוי" : "חיוב",
              t.description || t.kind || "תנועת ארנק",
              money(Number(t.amount)),
              money(Math.round(t.balanceAfter)),
            ])}
          />
        </Panel>
        <Panel title="חשבוניות חודשיות">
          <DataTable
            headers={["חודש", "חיובים", "סכום", "סטטוס", "פעולות"]}
            rows={invoiceMonths.map((inv) => [
              inv.label,
              String(inv.count),
              money(inv.total),
              <Badge key={inv.key} text="זמין להורדה" tone="green" />,
              <button key={`${inv.key}-dl`} type="button" className="link" onClick={() => downloadInvoiceMonth(inv)}>
                <Download size={14} /> הורדה
              </button>,
            ])}
          />
        </Panel>
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
