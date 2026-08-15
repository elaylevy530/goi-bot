import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { BankDetailsFields } from "@/components/courier/BankDetailsFields";
import { Building2, ChevronRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/profile/bank")({
  head: () => ({ meta: [{ title: "פרטי חשבון בנק — Goi" }] }),
  component: BankDetailsPage,
});

function BankDetailsPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [accountOwner, setAccountOwner] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  useEffect(() => {
    if (!me) return;
    const row = me as {
      bank_account_owner?: string | null;
      bank_name?: string | null;
      bank_branch?: string | null;
      bank_account?: string | null;
      full_name?: string | null;
    };
    setAccountOwner(row.bank_account_owner || row.full_name || "");
    setBankName(row.bank_name || "");
    setBankBranch(row.bank_branch || "");
    setBankAccount(row.bank_account || "");
  }, [me]);

  const verified = (me as { bank_details_verified?: boolean } | undefined)?.bank_details_verified;
  const hasSavedBank = !!(
    (me as { bank_name?: string | null } | undefined)?.bank_name &&
    (me as { bank_account?: string | null } | undefined)?.bank_account
  );
  const showVerifyHint = typeof verified === "boolean" && hasSavedBank;

  const save = useMutation({
    mutationFn: async () => {
      const owner = accountOwner.trim();
      const name = bankName.trim();
      const account = bankAccount.trim();
      if (!owner || !name || !account) throw new Error("יש למלא שם בעל החשבון, בנק ומספר חשבון");
      await nestUpdateMyCourier({
        bank_account_owner: owner,
        bank_name: name,
        bank_branch: bankBranch.trim() || null,
        bank_account: account,
      });
    },
    onSuccess: () => {
      toast.success("נשמר ✓");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell title="פרטי חשבון בנק" subtitle="בנק, סניף ומספר חשבון לתשלום">
      <div className="space-y-4 max-w-3xl mx-auto">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/courier/profile")}
            className="gap-1 text-text-strong hover:text-text-strong -ml-2"
          >
            <ChevronRight className="size-4" />
            חזרה
          </Button>
        </div>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 justify-end pb-1 border-b border-border">
              <h2 className="font-extrabold text-text-strong">פרטי חשבון בנק</h2>
              <span className="size-7 grid place-items-center rounded-lg bg-primary-soft">
                <Building2 className="size-4 text-primary" />
              </span>
            </div>
            <p className="text-xs text-text-subtle text-end">
              הפרטים נשמרים לפרופיל ומשמשים את ההנהלה לתשלום. אותם פרטים יופיעו גם בבקשת משיכה.
            </p>
            {showVerifyHint && (
              <div className={`text-xs font-bold text-end rounded-xl px-3 py-2 ${
                verified ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"
              }`}>
                {verified ? "אומת" : "ממתין לאימות"}
              </div>
            )}
            <BankDetailsFields
              accountOwner={accountOwner}
              bankName={bankName}
              bankBranch={bankBranch}
              bankAccount={bankAccount}
              onAccountOwner={setAccountOwner}
              onBankName={setBankName}
              onBankBranch={setBankBranch}
              onBankAccount={setBankAccount}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-2xl"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} שמור
        </Button>
      </div>
    </CourierShell>
  );
}
