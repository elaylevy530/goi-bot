import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { nestProvisionCourier } from "@/lib/nest-auth";
import { Loader2, UserPlus, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Props = { courierId: string; hasAccount: boolean; phone: string };

export function ProvisionAccountButton({ courierId, hasAccount, phone }: Props) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ login_phone: string; tempPassword: string } | null>(null);

  const mut = useMutation({
    mutationFn: () => nestProvisionCourier(courierId),
    onSuccess: (r) => {
      setResult({ login_phone: r.login_phone, tempPassword: r.tempPassword });
      setOpen(true);
      toast.success(hasAccount ? "הסיסמה אופסה" : "חשבון נוצר");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyAll = async () => {
    if (!result) return;
    const text = `אזור אישי לשליחים\nכתובת: ${window.location.origin}/courier-login\nטלפון: ${result.login_phone}\nסיסמה זמנית: ${result.tempPassword}`;
    await navigator.clipboard.writeText(text);
    toast.success("הועתק");
  };

  const sendWA = () => {
    if (!result) return;
    const text = `שלום! זה הקישור לאזור האישי שלך ב-Goi:\n${window.location.origin}/courier-login\nטלפון: ${result.login_phone}\nסיסמה זמנית: ${result.tempPassword}\nמומלץ לשנות אותה בהגדרות הפרופיל.`;
    const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "972");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <>
      <Button variant="outline" onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {hasAccount ? "אפס סיסמה" : "צור חשבון לשליח"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasAccount ? "סיסמה חדשה לשליח" : "פרטי חשבון לשליח"}</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                העבר לשליח את הפרטים הבאים. הסיסמה מוצגת פעם אחת בלבד.
              </p>
              <div className="border rounded-md p-3 space-y-1 bg-muted/30 text-sm">
                <div>קישור: <span className="font-mono">{window.location.origin}/courier-login</span></div>
                <div>טלפון: <span className="font-mono font-semibold">{result.login_phone}</span></div>
                <div>סיסמה: <span className="font-mono font-extrabold text-lg">{result.tempPassword}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyAll}><Copy className="size-4" /> העתק הכל</Button>
            <Button onClick={sendWA}><MessageCircle className="size-4" /> שלח בוואטסאפ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
