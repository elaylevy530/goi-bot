import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nestListWalletTransactions, nestRechargeWallet } from "@/lib/nest-domain";
import { Wallet, Plus, TrendingUp, TrendingDown, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/wallet")({
  head: () => ({ meta: [{ title: "ארנק — Goi" }] }),
  ssr: false,
  component: WalletPage,
});

// Bonus tiers: load more upfront → bigger discount on every delivery
const BONUS_TIERS = [
  { min: 100, pct: 5, label: "5% מתנה" },
  { min: 300, pct: 8, label: "8% מתנה" },
  { min: 500, pct: 12, label: "12% מתנה" },
  { min: 1000, pct: 18, label: "18% מתנה" },
];

function bonusFor(amount: number) {
  let pct = 0;
  for (const t of BONUS_TIERS) if (amount >= t.min) pct = t.pct;
  return { pct, value: Math.floor((amount * pct) / 100) };
}

function WalletPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number>(300);

  const { data: txs = [] } = useQuery({
    queryKey: ["wallet-tx", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListWalletTransactions(),
  });

  const balance = (txs as any[]).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const { pct, value: bonusVal } = bonusFor(amount);

  const recharge = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל");
      if (!amount || amount < 50) throw new Error("סכום מינימלי לטעינה: ₪50");
      await nestRechargeWallet({ amount, bonusVal, pct });
    },
    onSuccess: () => { toast.success("הארנק נטען"); qc.invalidateQueries({ queryKey: ["wallet-tx"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="ארנק" subtitle="טען מראש וקבל הנחה על כל משלוח">
      <div className="space-y-4 max-w-4xl mx-auto">
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-slate-500 font-semibold">היתרה שלך</div>
                <div className="text-4xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <Wallet className="size-7 text-[#35AD29]" /> ₪{balance.toLocaleString("he-IL")}
                </div>
                <div className="text-xs text-slate-500 mt-2">כל משלוח יורד מהיתרה אוטומטית. אם אין יתרה — סליקה דרך אמצעי תשלום שמור או בהזמנה.</div>
              </div>
              <div className="text-xs text-slate-600 max-w-[280px] text-right space-y-1 bg-white/70 rounded-xl p-3 border border-emerald-100">
                <div className="font-extrabold text-emerald-700">מדרגות בונוס:</div>
                {BONUS_TIERS.map(t => (
                  <div key={t.min} className="flex items-center justify-between">
                    <span>טעינה מ-₪{t.min}</span>
                    <span className="font-bold text-emerald-700">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-slate-900"><Plus className="size-4 text-[#35AD29]" /> טעינת הארנק</div>
              <div>
                <Label>סכום (₪)</Label>
                <Input type="number" min={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[100, 300, 500, 1000].map(v => (
                  <Button key={v} variant="outline" size="sm" onClick={() => setAmount(v)} className={amount === v ? "border-[#35AD29] text-[#35AD29]" : ""}>₪{v}</Button>
                ))}
              </div>
              {bonusVal > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                  <Sparkles className="size-3.5" />
                  תקבל/י בונוס של <b>₪{bonusVal}</b> ({pct}%) → סה"כ ליתרה: <b>₪{amount + bonusVal}</b>
                </div>
              )}
              <Button onClick={() => recharge.mutate()} disabled={recharge.isPending} className="w-full bg-[#35AD29] hover:bg-[#2d9623] text-white">
                {recharge.isPending ? "טוען..." : "שלם דרך PayPal וטען"}
              </Button>
              <div className="text-[11px] text-slate-400 text-center">הסליקה דרך PayPal Business — תחובר ברגע שתעדכן/י את ה-Credentials.</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-slate-900"><CreditCard className="size-4 text-indigo-500" /> אמצעי תשלום שמור</div>
              <div className="text-sm text-slate-600">
                במקום לטעון ארנק — שמרו אמצעי תשלום קבוע. בכל הזמנה שאין בה יתרה בארנק, נחייב אוטומטית את האמצעי השמור.
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200">
                לא נשמר אמצעי תשלום. ברגע שתחבר/י PayPal, יופיע כאן כפתור "הוסף PayPal" + רשימת אמצעים שמורים.
              </div>
              <Button variant="outline" className="w-full" disabled>
                הוסף אמצעי תשלום (PayPal Vault) — בקרוב
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="font-extrabold text-slate-900 mb-3">היסטוריית תנועות</div>
            {txs.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-8">אין תנועות עדיין</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(txs as any[]).map((t) => {
                  const pos = Number(t.amount) >= 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        {pos ? <TrendingUp className="size-4 text-emerald-600" /> : <TrendingDown className="size-4 text-rose-500" />}
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{t.description || t.kind}</div>
                          <div className="text-[11px] text-slate-400">{new Date(t.created_at).toLocaleString("he-IL")}</div>
                        </div>
                      </div>
                      <div className={`text-sm font-extrabold ${pos ? "text-emerald-600" : "text-rose-600"}`}>
                        {pos ? "+" : ""}₪{Number(t.amount).toLocaleString("he-IL")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessShell>
  );
}
