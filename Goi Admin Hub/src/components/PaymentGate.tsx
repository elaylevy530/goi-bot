import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Wallet, Lock, AlertTriangle } from "lucide-react";
import { useMyBusiness } from "@/components/BusinessShell";

export function usePaymentOnFile() {
  const { data: me } = useMyBusiness();
  return {
    me,
    hasPayment: !!(me as { payment_method_on_file?: boolean } | null)?.payment_method_on_file,
    reason: ((me as { dispatch_blocked_reason?: string | null } | null)?.dispatch_blocked_reason) || "ללא אמצעי תשלום שמור",
  };
}

/** Sticky banner shown at the top of any business panel when payment is missing. */
export function PaymentBanner() {
  const { me, hasPayment, reason } = usePaymentOnFile();
  if (!me || hasPayment) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 flex items-center justify-between gap-3 text-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="truncate"><strong>שידור משלוחים חסום:</strong> {reason}. הוסף אמצעי תשלום כדי להפעיל.</span>
      </div>
      <Button asChild size="sm" className="shrink-0 h-8">
        <Link to="/business/billing">הוסף תשלום</Link>
      </Button>
    </div>
  );
}

/** Full-screen lock card that replaces the dispatch form when payment is missing. */
export function PaymentLockGate({ title = "שידור משלוחים חסום" }: { title?: string }) {
  return (
    <Card className="border-2 border-amber-300 bg-amber-50/40 max-w-xl mx-auto">
      <CardContent className="p-8 text-center space-y-4">
        <div className="size-14 rounded-full bg-amber-100 grid place-items-center mx-auto">
          <Lock className="size-7 text-amber-700" />
        </div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          כדי לשדר משלוחים לשליחים שלנו, יש להזין אמצעי תשלום שמור (כרטיס אשראי). תוכל לבחור חיוב פר־משלוח, יומי, שבועי או חודשי.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link to="/business/billing"><Wallet className="size-4" /> הוסף אמצעי תשלום</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
