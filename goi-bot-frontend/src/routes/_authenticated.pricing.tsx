import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getActivePricingRule, updateActivePricing, computePrice } from "@/lib/pricing.functions";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "תמחור — Goi" }] }),
  component: PricingPage,
});

function PricingPage() {
  const get = useServerFn(getActivePricingRule);
  const upd = useServerFn(updateActivePricing);
  const calc = useServerFn(computePrice);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["pricing-active"], queryFn: () => get() });
  const [form, setForm] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (data) {
      setForm({
        base_price: data.base_price,
        price_per_km: data.price_per_km,
        minimum_price: data.minimum_price,
        platform_fee_percent: data.platform_fee_percent,
        platform_fee_fixed: data.platform_fee_fixed,
        extra_stop_fee: data.extra_stop_fee,
        heavy_package_surcharge: data.heavy_package_surcharge,
        notes: data.notes ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        base_price: Number(form.base_price),
        price_per_km: Number(form.price_per_km),
        minimum_price: Number(form.minimum_price),
        platform_fee_percent: Number(form.platform_fee_percent),
        platform_fee_fixed: Number(form.platform_fee_fixed ?? 0),
        extra_stop_fee: Number(form.extra_stop_fee ?? 0),
        heavy_package_surcharge: Number(form.heavy_package_surcharge ?? 0),
        notes: String(form.notes ?? ""),
      };
      // Comparison preview: compare current vs new on a 5km job
      const before = await calc({ data: { distanceKm: 5 } });
      const r = await upd({ data: payload });
      const after = await calc({ data: { distanceKm: 5 } });
      return { r, before, after };
    },
    onSuccess: ({ before, after }) => {
      qc.invalidateQueries({ queryKey: ["pricing-active"] });
      toast.success(
        `נשמר. דוגמה ל-5 ק"מ: לפני ₪${before.business_total} → אחרי ₪${after.business_total}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (k: string, label: string, suffix?: string) => (
    <div>
      <Label className="text-end block">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          value={String(form[k] ?? "")}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          className="text-end"
        />
        {suffix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</div>}
      </div>
    </div>
  );

  return (
    <AdminLayout title="תמחור" subtitle="מקור אמת יחיד — כל המשלוחים מקבלים את החישוב הזה">
      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {num("base_price", "מחיר בסיס", "₪")}
              {num("price_per_km", 'מחיר לק"מ', "₪")}
              {num("minimum_price", "מחיר מינימום", "₪")}
              {num("platform_fee_percent", "עמלת Goi", "%")}
              {num("platform_fee_fixed", "עמלה קבועה נוספת", "₪")}
              {num("extra_stop_fee", "תוספת לעצירה נוספת", "₪")}
              {num("heavy_package_surcharge", "תוספת חבילה כבדה", "₪")}
            </div>
            <div>
              <Label className="text-end block">הערות</Label>
              <Textarea
                value={String(form.notes ?? "")}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="text-end"
              />
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full md:w-auto">
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} שמור גרסה חדשה
            </Button>
            <p className="text-xs text-muted-foreground">
              שמירה יוצרת גרסה חדשה ומכבה את הקודמת. משלוחים קיימים לא מושפעים — לכל משלוח שמור snapshot של המחיר שלו.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
