import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PayPalScriptProvider, PayPalButtons, PayPalCardFieldsProvider, PayPalNameField, PayPalNumberField, PayPalExpiryField, PayPalCVVField, usePayPalCardFields } from "@paypal/react-paypal-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createPerJobOrderFn, capturePerJobOrderFn, getPaypalConfigFn } from "@/lib/paypal-billing.functions";

type Props = {
  open: boolean;
  jobId: string;
  amount: number;
  onCancel: () => void;
  onPaid: () => void;
};

function CardSubmit({ onCreate, onApprove }: { onCreate: () => Promise<string>; onApprove: (orderId: string) => Promise<void> }) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        if (!cardFieldsForm) return;
        setBusy(true);
        try {
          const state = await cardFieldsForm.getState();
          if (!state.isFormValid) { toast.error("מלא את כל שדות הכרטיס"); setBusy(false); return; }
          // submit() will trigger createOrder + onApprove on the provider
          await cardFieldsForm.submit();
        } catch (e: any) {
          toast.error("שגיאה: " + (e?.message ?? "לא ידוע"));
        } finally {
          setBusy(false);
        }
      }}
      className="w-full bg-[#35AD29] hover:bg-[#2d9623] text-white"
    >
      {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : <ShieldCheck className="size-4 ml-2" />}
      שלם בכרטיס אשראי
    </Button>
  );
}

export function PaypalCheckoutDialog({ open, jobId, amount, onCancel, onPaid }: Props) {
  const createOrder = useServerFn(createPerJobOrderFn);
  const captureOrder = useServerFn(capturePerJobOrderFn);
  const getCfg = useServerFn(getPaypalConfigFn);
  const { data: cfg } = useQuery({ queryKey: ["paypal-config"], queryFn: () => getCfg(), staleTime: 60 * 60_000, enabled: open });

  const handleCreate = async (): Promise<string> => {
    const origin = window.location.origin;
    const r = await createOrder({ data: { job_id: jobId, return_url: origin, cancel_url: origin } });
    if (!r?.order_id) throw new Error("לא ניתן ליצור הזמנה ב-PayPal");
    return r.order_id;
  };

  const handleApprove = async (orderId: string) => {
    try {
      await captureOrder({ data: { job_id: jobId, order_id: orderId } });
      toast.success("התשלום אושר ✅");
      onPaid();
    } catch (e: any) {
      toast.error("שגיאה באישור תשלום: " + (e?.message ?? "לא ידוע"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>תשלום מאובטח עבור המשלוח</DialogTitle>
          <DialogDescription>
            סכום לחיוב: <b>{amount.toFixed(2)} ₪</b>. התשלום מבוצע בתוך המערכת — לא מועברים החוצה.
          </DialogDescription>
        </DialogHeader>

        {!cfg?.clientId ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin mx-auto mb-2" />
            טוען PayPal…
          </div>
        ) : (
          <PayPalScriptProvider
            options={{
              clientId: cfg.clientId,
              currency: cfg.currency,
              intent: "capture",
              components: "buttons,card-fields",
              locale: "he_IL",
            }}
          >
            <div className="space-y-3">
              <PayPalButtons
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                createOrder={handleCreate}
                onApprove={async (data) => { await handleApprove(data.orderID); }}
                onError={(err) => toast.error("PayPal: " + (((err as any)?.message as string) ?? "שגיאה"))}
                onCancel={() => toast.message("התשלום בוטל")}
              />

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">או כרטיס אשראי</span>
                </div>
              </div>

              <PayPalCardFieldsProvider
                createOrder={handleCreate}
                onApprove={async (data) => { await handleApprove(data.orderID); }}
                onError={(err) => toast.error("PayPal: " + (((err as any)?.message as string) ?? "שגיאה"))}
              >
                <div className="space-y-2">
                  <PayPalNameField />
                  <PayPalNumberField />
                  <div className="grid grid-cols-2 gap-2">
                    <PayPalExpiryField />
                    <PayPalCVVField />
                  </div>
                  <CardSubmit onCreate={handleCreate} onApprove={handleApprove} />
                </div>
              </PayPalCardFieldsProvider>
            </div>
          </PayPalScriptProvider>
        )}

        <Button variant="ghost" onClick={onCancel} className="mt-2">בטל</Button>
      </DialogContent>
    </Dialog>
  );
}
