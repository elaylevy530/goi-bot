import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BankDetailsFields({
  accountOwner,
  bankName,
  bankBranch,
  bankAccount,
  onAccountOwner,
  onBankName,
  onBankBranch,
  onBankAccount,
  compact = false,
}: {
  accountOwner: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  onAccountOwner: (v: string) => void;
  onBankName: (v: string) => void;
  onBankBranch: (v: string) => void;
  onBankAccount: (v: string) => void;
  compact?: boolean;
}) {
  const labelCls = compact ? "text-end block mb-1 text-[11px]" : "text-end block mb-1";
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-3"}>
      <div className={compact ? "col-span-2" : undefined}>
        <Label className={labelCls}>שם בעל החשבון</Label>
        <Input value={accountOwner} onChange={(e) => onAccountOwner(e.target.value)} className="min-h-11 text-end" autoComplete="name" />
      </div>
      <div>
        <Label className={labelCls}>בנק</Label>
        <Input value={bankName} onChange={(e) => onBankName(e.target.value)} className="min-h-11 text-end" />
      </div>
      <div>
        <Label className={labelCls}>סניף</Label>
        <Input value={bankBranch} onChange={(e) => onBankBranch(e.target.value)} className="min-h-11 text-end" />
      </div>
      <div className={compact ? "col-span-2" : undefined}>
        <Label className={labelCls}>מספר חשבון</Label>
        <Input
          value={bankAccount}
          onChange={(e) => onBankAccount(e.target.value)}
          className="min-h-11 text-end"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
