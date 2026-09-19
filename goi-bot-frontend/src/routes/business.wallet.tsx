import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  nestDeleteWalletSavedMethod,
  nestListWalletTransactions,
  nestWalletIntentStatus,
  nestWalletRecharge,
  nestWalletSaveCard,
  nestWalletSavedMethod,
  type WalletCheckout,
} from "@/lib/nest-domain";
import { Wallet, Plus, TrendingUp, TrendingDown, CreditCard, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/wallet")({
  head: () => ({ meta: [{ title: "ארנק — Goi" }] }),
  ssr: false,
  component: WalletPage,
});

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
  const [checkout, setCheckout] = useState<Extract<WalletCheckout, { paid: false }> | null>(null);

  const { data: txs = [] } = useQuery({
    queryKey: ["wallet-tx", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListWalletTransactions(),
  });

  const { data: method } = useQuery({
    queryKey: ["wallet-card", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestWalletSavedMethod(),
  });

  const balance = (txs as { amount?: number | string }[]).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const { pct, value: bonusVal } = bonusFor(amount);
  const saved = method?.saved === true ? method : null;

  const { data: intent } = useQuery({
    queryKey: ["wallet-intent", checkout?.intent_id],
    enabled: Boolean(checkout?.intent_id),
    queryFn: () => nestWalletIntentStatus(checkout!.intent_id),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!intent?.paid) return;
    setCheckout(null);
    toast.success("התשלום התקבל");
    void qc.invalidateQueries({ queryKey: ["wallet-tx"] });
    void qc.invalidateQueries({ queryKey: ["wallet-card"] });
  }, [intent?.paid, qc]);

  const recharge = useMutation({
    mutationFn: async () => {
      if (!amount || amount < 50) throw new Error("סכום מינימלי לטעינה: ₪50");
      return nestWalletRecharge(amount);
    },
    onSuccess: (result) => {
      if (result.paid) {
        toast.success("הארנק נטען");
        void qc.invalidateQueries({ queryKey: ["wallet-tx"] });
        return;
      }
      setCheckout(result);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCard = useMutation({
    mutationFn: () => nestWalletSaveCard(),
    onSuccess: (result) => {
      if (result.paid) {
        toast.success("הכרטיס נשמר");
        void qc.invalidateQueries({ queryKey: ["wallet-card"] });
        return;
      }
      setCheckout(result);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCard = useMutation({
    mutationFn: () => nestDeleteWalletSavedMethod(),
    onSuccess: () => {
      toast.success("אמצעי התשלום הוסר");
      void qc.invalidateQueries({ queryKey: ["wallet-card"] });
    },
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
                <div className="text-xs text-slate-500 mt-2">כל משלוח יורד מהיתרה אוטומטית. טעינה בכרטיס אשראי מאובטח.</div>
              </div>
              <div className="text-xs text-slate-600 max-w-[280px] text-right space-y-1 bg-white/70 rounded-xl p-3 border border-emerald-100">
                <div className="font-extrabold text-emerald-700">מדרגות בונוס:</div>
                {BONUS_TIERS.map((t) => (
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
                {[100, 300, 500, 1000].map((v) => (
                  <Button key={v} variant="outline" size="sm" onClick={() => setAmount(v)} className={amount === v ? "border-[#35AD29] text-[#35AD29]" : ""}>₪{v}</Button>
                ))}
              </div>
              {bonusVal > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                  <Sparkles className="size-3.5" />
                  תקבל/י בונוס של <b>₪{bonusVal}</b> ({pct}%) → סה"כ ליתרה: <b>₪{amount + bonusVal}</b>
                </div>
              )}
              <Button onClick={() => recharge.mutate()} disabled={recharge.isPending} className="w-full bg-primary-deep hover:bg-primary-deep/90">
                {recharge.isPending ? "טוען..." : saved ? `טען עם כרטיס •••• ${saved.last4}` : "טען בכרטיס אשראי"}
              </Button>
              <div className="text-[11px] text-slate-400 text-center">
                {saved ? "נחייב את הכרטיס השמור. פרטי הכרטיס לא נשמרים אצלנו." : "ייפתח דף סליקה מאובטח של Tranzila. הכרטיס יישמר לטעינות הבאות."}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-slate-900"><CreditCard className="size-4 text-indigo-500" /> אמצעי תשלום שמור</div>
              <div className="text-sm text-slate-600">
                שמירת כרטיס מאפשרת טעינת ארנק בלי להקליד פרטים בכל פעם. נשמר רק טוקן אצל Tranzila.
              </div>
              {saved ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border border-slate-200">
                  כרטיס •••• {saved.last4}
                  <span className="text-xs text-slate-500 block mt-1">תוקף {saved.exp_month}/{saved.exp_year}</span>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200">
                  אין אמצעי תשלום שמור. הוספה כוללת חיוב אימות של ₪1 שנכנס ליתרה.
                </div>
              )}
              {saved ? (
                <Button variant="outline" className="w-full" disabled={removeCard.isPending} onClick={() => removeCard.mutate()}>
                  הסר אמצעי תשלום
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled={saveCard.isPending} onClick={() => saveCard.mutate()}>
                  {saveCard.isPending ? "פותח סליקה..." : "הוסף אמצעי תשלום"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {checkout && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-extrabold text-slate-900">תשלום מאובטח</div>
                <Button variant="ghost" size="sm" onClick={() => setCheckout(null)}>סגור</Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> ממתין לאישור מ-Tranzila…
              </div>
              <iframe
                title="תשלום בכרטיס אשראי"
                src={checkout.iframe_url}
                className="w-full h-[560px] rounded-2xl border border-slate-200"
              />
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="font-extrabold text-slate-900 mb-3">היסטוריית תנועות</div>
            {txs.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-8">אין תנועות עדיין</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(txs as { id: string; amount?: number | string; description?: string; kind?: string; created_at?: string }[]).map((t) => {
                  const pos = Number(t.amount) >= 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        {pos ? <TrendingUp className="size-4 text-emerald-600" /> : <TrendingDown className="size-4 text-rose-500" />}
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{t.description || t.kind}</div>
                          <div className="text-[11px] text-slate-400">{t.created_at ? new Date(t.created_at).toLocaleString("he-IL") : ""}</div>
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
