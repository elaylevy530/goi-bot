import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pricing-rules")({
  head: () => ({
    meta: [
      { title: "כללי תמחור — Goi Admin" },
      { name: "description", content: "ניהול תמחור ותשלומים לפי סוג שירות פרטי" },
    ],
  }),
  component: PricingRulesPage,
});

type Rule = {
  id: string;
  service_category: string;
  display_name: string;
  payment_mode: "cash_only" | "deposit" | "full_upfront";
  deposit_percent: number;
  min_price: number;
  base_price: number;
  price_per_km: number;
  allow_customer_quote: boolean;
  allow_customer_fixed_price: boolean;
  notes: string | null;
};

function PricingRulesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pricing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("express_pricing_rules" as any).select("*").order("display_name");
      if (error) throw error;
      return ((data ?? []) as unknown) as Rule[];
    },
  });

  return (
    <AdminLayout title="כללי תמחור" subtitle="הגדרת מחיר ואופן תשלום עבור כל סוג שירות ב-Goi Express">
      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-pricing-rules"] })} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function RuleCard({ rule, onSaved }: { rule: Rule; onSaved: () => void }) {
  const [local, setLocal] = useState(rule);
  useEffect(() => setLocal(rule), [rule]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("express_pricing_rules" as any).update({
        payment_mode: local.payment_mode,
        deposit_percent: local.deposit_percent,
        min_price: local.min_price,
        base_price: local.base_price,
        price_per_km: local.price_per_km,
        allow_customer_quote: local.allow_customer_quote,
        allow_customer_fixed_price: local.allow_customer_fixed_price,
        notes: local.notes,
        updated_at: new Date().toISOString(),
      } as never).eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נשמר"); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "שמירה נכשלה"),
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{local.display_name}</div>
            <div className="text-xs text-muted-foreground font-mono">{local.service_category}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>אופן תשלום</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { v: "cash_only", label: "מזומן בלבד" },
              { v: "deposit", label: "מקדמה + מזומן" },
              { v: "full_upfront", label: "הכל מראש" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setLocal({ ...local, payment_mode: opt.v as Rule["payment_mode"] })}
                className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  local.payment_mode === opt.v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {local.payment_mode === "deposit" && (
          <div className="space-y-2">
            <Label>אחוז מקדמה (%)</Label>
            <Input type="number" min={1} max={100} value={local.deposit_percent}
              onChange={(e) => setLocal({ ...local, deposit_percent: Number(e.target.value) })} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">מחיר בסיס ₪</Label>
            <Input type="number" value={local.base_price}
              onChange={(e) => setLocal({ ...local, base_price: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">לק״מ ₪</Label>
            <Input type="number" step="0.5" value={local.price_per_km}
              onChange={(e) => setLocal({ ...local, price_per_km: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">מינימום ₪</Label>
            <Input type="number" value={local.min_price}
              onChange={(e) => setLocal({ ...local, min_price: Number(e.target.value) })} />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm">מחיר קבוע מלקוח</Label>
            <Switch checked={local.allow_customer_fixed_price}
              onCheckedChange={(v) => setLocal({ ...local, allow_customer_fixed_price: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">בקשת הצעות מחיר</Label>
            <Switch checked={local.allow_customer_quote}
              onCheckedChange={(v) => setLocal({ ...local, allow_customer_quote: v })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">הערות פנימיות</Label>
          <Input value={local.notes ?? ""} onChange={(e) => setLocal({ ...local, notes: e.target.value })} />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
          {save.isPending ? <Loader2 className="size-4 animate-spin ml-2" /> : <Save className="size-4 ml-2" />}
          שמור
        </Button>
      </CardContent>
    </Card>
  );
}
