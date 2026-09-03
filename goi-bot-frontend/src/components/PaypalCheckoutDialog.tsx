import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PayPalScriptProvider, PayPalButtons, PayPalCardFieldsProvider, PayPalNameField, PayPalNumberField, PayPalExpiryField, PayPalCVVField, usePayPalCardFields, FUNDING } from "@paypal/react-paypal-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createPerJobOrderFn, capturePerJobOrderFn, getPaypalConfigFn, logPaypalClientFn } from "@/lib/paypal-billing.functions";
import { cardFieldsInvalidHe, paypalErrorHe } from "@/lib/paypal-errors";
import {
  billingFromBusiness,
  toPaypalApiBilling,
  submitPaypalCardFields,
  validatePaypalIlBilling,
  type PaypalBillingDraft,
} from "@/lib/paypal-billing-address";
import { PaypalBillingAddressFields } from "@/components/PaypalBillingAddressFields";
import { useMyBusiness } from "@/components/BusinessShell";

const EMPTY_BILLING: PaypalBillingDraft = { street: "", city: "", postalCode: "" };

type Props = {
  open: boolean;
  jobId: string;
  amount: number;
  onCancel: () => void;
  onPaid: () => void;
};

function PaymentErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-danger-bg px-3 py-2.5 text-sm text-danger-text"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 font-medium leading-snug">{message}</p>
    </div>
  );
}

function CardSubmit({
  onFail,
  getBilling,
}: {
  onFail: (message: string) => void;
  getBilling: () => PaypalBillingDraft;
}) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        if (!cardFieldsForm) return;
        const billingError = validatePaypalIlBilling(getBilling());
        if (billingError) {
          onFail(billingError);
          return;
        }
        setBusy(true);
        try {
          const state = await cardFieldsForm.getState();
          if (!state.isFormValid) {
            onFail(cardFieldsInvalidHe(state));
            setBusy(false);
            return;
          }
          await submitPaypalCardFields(cardFieldsForm, getBilling());
        } catch (e: unknown) {
          onFail(paypalErrorHe(e));
        } finally {
          setBusy(false);
        }
      }}
      className="w-full bg-primary-deep text-primary-foreground hover:bg-primary-deep/90"
    >
      {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : <ShieldCheck className="size-4 ml-2" />}
      שלם בכרטיס אשראי
    </Button>
  );
}

export function PaypalCheckoutDialog({ open, jobId, amount, onCancel, onPaid }: Props) {
  const { data: me } = useMyBusiness();
  const createOrder = useServerFn(createPerJobOrderFn);
  const captureOrder = useServerFn(capturePerJobOrderFn);
  const getCfg = useServerFn(getPaypalConfigFn);
  const logClient = useServerFn(logPaypalClientFn);
  const { data: cfg } = useQuery({ queryKey: ["paypal-config"], queryFn: () => getCfg(), staleTime: 60 * 60_000, enabled: open });
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<PaypalBillingDraft>(EMPTY_BILLING);
  const billingRef = useRef(billing);
  billingRef.current = billing;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBilling(billingFromBusiness(me as { address?: string | null; city?: string | null; pickup_address?: string | null } | null));
    // Seed once per open from the cached business profile — don't reset while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async (attachPaypalWallet: boolean): Promise<string> => {
    const draft = billingRef.current;
    const billingError = validatePaypalIlBilling(draft);
    if (billingError) {
      setError(billingError);
      void logClient({ data: { event: "checkout_billing_invalid", message: billingError } }).catch(() => {});
      throw new Error(billingError);
    }
    const origin = window.location.origin;
    try {
      const r = await createOrder({
        data: {
          job_id: jobId,
          return_url: origin,
          cancel_url: origin,
          billing_address: toPaypalApiBilling(draft),
          attach_paypal_wallet: attachPaypalWallet,
        },
      });
      if (!r?.order_id) throw new Error("לא ניתן ליצור הזמנה ב-PayPal");
      return r.order_id;
    } catch (e: unknown) {
      void logClient({
        data: { event: "checkout_create_fail", message: e instanceof Error ? e.message : String(e) },
      }).catch(() => {});
      throw e;
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      await captureOrder({ data: { job_id: jobId, order_id: orderId } });
      setError(null);
      toast.success("התשלום אושר ✅");
      onPaid();
    } catch (e: unknown) {
      setError(paypalErrorHe(e));
      void logClient({ data: { event: "checkout_capture_fail", message: e instanceof Error ? e.message : String(e) } }).catch(() => {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>תשלום מאובטח עבור המשלוח</DialogTitle>
          <DialogDescription>
            סכום לחיוב: <b>{amount.toFixed(2)} ₪</b>. התשלום מבוצע בתוך המערכת — לא מועברים החוצה.
          </DialogDescription>
        </DialogHeader>

        {error && <PaymentErrorBanner message={error} />}

        {!cfg?.clientId ? (
          <div className="py-8 text-center text-sm text-text-muted">
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
              <PaypalBillingAddressFields value={billing} onChange={setBilling} />
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                createOrder={() => handleCreate(true)}
                onApprove={async (data) => { await handleApprove(data.orderID); }}
                onError={(err) => {
                  setError(paypalErrorHe(err));
                  void logClient({ data: { event: "checkout_buttons_error", message: paypalErrorHe(err) } }).catch(() => {});
                }}
                onCancel={() => {
                  setError(null);
                  toast.message("התשלום בוטל");
                }}
              />

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">או כרטיס אשראי</span>
                </div>
              </div>

              <PayPalCardFieldsProvider
                createOrder={() => handleCreate(false)}
                onApprove={async (data) => { await handleApprove(data.orderID); }}
                onError={(err) => {
                  setError(paypalErrorHe(err));
                  void logClient({ data: { event: "checkout_card_error", message: paypalErrorHe(err) } }).catch(() => {});
                }}
              >
                <div className="space-y-2">
                  <PayPalNameField />
                  <PayPalNumberField />
                  <div className="grid grid-cols-2 gap-2">
                    <PayPalExpiryField />
                    <PayPalCVVField />
                  </div>
                  <CardSubmit
                    onFail={(message) => {
                      setError(message);
                      void logClient({ data: { event: "checkout_card_submit_fail", message } }).catch(() => {});
                    }}
                    getBilling={() => billingRef.current}
                  />
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
