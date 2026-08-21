import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaypalBillingDraft } from "@/lib/paypal-billing-address";

type Props = {
  value: PaypalBillingDraft;
  onChange: (next: PaypalBillingDraft) => void;
};

export function PaypalBillingAddressFields({ value, onChange }: Props) {
  const set = (patch: Partial<PaypalBillingDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold text-text-strong">כתובת לחיוב</p>
      <p className="text-xs text-text-muted">
        חייבת להתאים לכתובת אצל חברת האשראי. רחוב קצר בלי עיר (למשל רחוב הרצל 12) נדחה.
      </p>
      <div className="space-y-1">
        <Label htmlFor="paypal-billing-street" className="text-xs text-text-muted">רחוב ומספר בית</Label>
        <Input
          id="paypal-billing-street"
          className="h-11 bg-surface"
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          autoComplete="street-address"
          placeholder="רחוב הרצל 12"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="paypal-billing-city" className="text-xs text-text-muted">עיר</Label>
          <Input
            id="paypal-billing-city"
            className="h-11 bg-surface"
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            autoComplete="address-level2"
            placeholder="תל אביב"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paypal-billing-zip" className="text-xs text-text-muted">מיקוד</Label>
          <Input
            id="paypal-billing-zip"
            className="h-11 bg-surface"
            value={value.postalCode}
            onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 7) })}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="1234567"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}
