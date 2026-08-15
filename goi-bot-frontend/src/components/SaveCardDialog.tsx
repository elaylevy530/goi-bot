import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { confirmVaultFn, createSetupTokenFn, getPaypalConfigFn } from "@/lib/paypal-billing.functions";
import { cardFieldsInvalidHe, paypalErrorHe } from "@/lib/paypal-errors";

const VAULT_FAIL = "לא הצלחנו לשמור את הכרטיס. נסה שוב או כרטיס אחר.";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
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

function FieldSlot({ children }: { children: ReactNode }) {
  return <div className="min-h-12 rounded-md border border-border bg-surface px-1">{children}</div>;
}

function CardSubmit({ onFail }: { onFail: (message: string) => void }) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy || !cardFieldsForm}
      onClick={async () => {
        if (!cardFieldsForm) return;
        setBusy(true);
        try {
          const state = await cardFieldsForm.getState();
          if (!state.isFormValid) {
            onFail(cardFieldsInvalidHe(state));
            setBusy(false);
            return;
          }
          await cardFieldsForm.submit();
        } catch (e: unknown) {
          onFail(paypalErrorHe(e, VAULT_FAIL));
        } finally {
          setBusy(false);
        }
      }}
      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : <ShieldCheck className="size-4 ml-2" />}
      שמור כרטיס
    </Button>
  );
}

function VaultCardForm({
  createVaultSetupToken,
  onApprove,
  onError,
  onFail,
}: {
  createVaultSetupToken: () => Promise<string>;
  onApprove: (data: { vaultSetupToken?: string; vault_setup_token?: string; orderID?: string }) => Promise<void>;
  onError: (err: Record<string, unknown>) => void;
  onFail: (message: string) => void;
}) {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending || !isResolved) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
        טוען טופס כרטיס…
      </div>
    );
  }

  if (isRejected) {
    return <PaymentErrorBanner message="טעינת PayPal נכשלה. רענן את העמוד או חבר PayPal במקום." />;
  }

  return (
    <PayPalCardFieldsProvider
      createOrder={createVaultSetupToken}
      createVaultSetupToken={createVaultSetupToken}
      onApprove={onApprove}
      onError={onError}
    >
      <div className="space-y-2">
        <FieldSlot><PayPalNameField /></FieldSlot>
        <FieldSlot><PayPalNumberField /></FieldSlot>
        <div className="grid grid-cols-2 gap-2">
          <FieldSlot><PayPalExpiryField /></FieldSlot>
          <FieldSlot><PayPalCVVField /></FieldSlot>
        </div>
        <CardSubmit onFail={onFail} />
      </div>
    </PayPalCardFieldsProvider>
  );
}

export function SaveCardDialog({ open, onClose, onSaved }: Props) {
  const setupFn = useServerFn(createSetupTokenFn);
  const confirmFn = useServerFn(confirmVaultFn);
  const getCfg = useServerFn(getPaypalConfigFn);
  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ["paypal-config"],
    queryFn: () => getCfg(),
    staleTime: 60 * 60_000,
    enabled: open,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const createVaultSetupToken = async (): Promise<string> => {
    const origin = window.location.origin;
    const r = await setupFn({
      data: {
        source: "card",
        return_url: `${origin}/business/billing`,
        cancel_url: `${origin}/business/billing?paypal=cancel`,
      },
    });
    if (!r?.setup_token_id) throw new Error("לא ניתן להתחיל שמירת כרטיס");
    return r.setup_token_id;
  };

  const handleApprove = async (data: {
    vaultSetupToken?: string;
    vault_setup_token?: string;
    orderID?: string;
  }) => {
    const setupToken = data.vaultSetupToken ?? data.vault_setup_token ?? data.orderID;
    if (!setupToken) {
      setError(VAULT_FAIL);
      return;
    }
    try {
      const saved = await confirmFn({ data: { setup_token_id: setupToken } });
      setError(null);
      toast.success(
        saved.last4
          ? `הכרטיס נשמר (${saved.brand ?? "כרטיס"} ••${saved.last4}) — שידור משלוחים פעיל`
          : "הכרטיס נשמר — שידור משלוחים פעיל",
      );
      onSaved();
    } catch (e: unknown) {
      setError(paypalErrorHe(e, VAULT_FAIL));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת כרטיס אשראי</DialogTitle>
          <DialogDescription>
            הכרטיס נשמר בצורה מאובטחת אצל PayPal. אצלנו נשמר רק טוקן לחיוב משלוחים — לא מספר הכרטיס.
          </DialogDescription>
        </DialogHeader>

        {error && <PaymentErrorBanner message={error} />}

        {cfgLoading || (open && !cfg) ? (
          <div className="py-8 text-center text-sm text-text-muted">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            טוען טופס תשלום…
          </div>
        ) : !cfg?.clientId ? (
          <PaymentErrorBanner message="PayPal לא מוגדר בשרת. אפשר לחבר PayPal או לפנות לתמיכה." />
        ) : open ? (
          <PayPalScriptProvider
            options={{
              clientId: cfg.clientId,
              currency: cfg.currency,
              intent: "capture",
              components: "buttons,card-fields",
              locale: "he_IL",
            }}
          >
            <VaultCardForm
              createVaultSetupToken={createVaultSetupToken}
              onApprove={handleApprove}
              onError={(err) => setError(paypalErrorHe(err, VAULT_FAIL))}
              onFail={setError}
            />
          </PayPalScriptProvider>
        ) : null}

        <Button variant="ghost" onClick={onClose} className="mt-2">ביטול</Button>
      </DialogContent>
    </Dialog>
  );
}
