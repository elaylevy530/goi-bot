import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, KeyRound, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  requestCourierPasswordReset,
  confirmCourierPasswordReset,
} from "@/lib/courier-password-reset.functions";

export const Route = createFileRoute("/courier-reset-password")({
  head: () => ({ meta: [{ title: "שחזור סיסמה לשליחים — Goi" }] }),
  ssr: false,
  component: CourierResetPasswordPage,
});

function CourierResetPasswordPage() {
  const navigate = useNavigate();
  const requestFn = useServerFn(requestCourierPasswordReset);
  const confirmFn = useServerFn(confirmCourierPasswordReset);

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await requestFn({ data: { phone } });
      setLoading(false);
      if (!res.ok && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("throttled" in res && res.throttled) {
        toast.info("כבר נשלח קוד לאחרונה. בדוק את הוואטסאפ.");
      } else {
        toast.success("אם המספר רשום כשליח — נשלח קוד בוואטסאפ.");
      }
      setStep("confirm");
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "שגיאה בשליחת הקוד");
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !pwd) return;
    if (pwd !== pwd2) {
      toast.error("הסיסמאות אינן זהות");
      return;
    }
    if (pwd.length < 8) {
      toast.error("הסיסמה חייבת להיות באורך 8 תווים לפחות");
      return;
    }
    setLoading(true);
    try {
      const res = await confirmFn({ data: { phone, code, newPassword: pwd } });
      setLoading(false);
      if (!res.ok) {
        toast.error("error" in res ? res.error : "אימות נכשל");
        return;
      }
      toast.success("הסיסמה עודכנה. כעת אפשר להתחבר.");
      navigate({ to: "/courier-login", replace: true });
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "שגיאה באישור הקוד");
    }
  };

  return (
    <div dir="rtl" className="min-h-dvh grid place-items-center bg-gradient-to-br from-background to-muted px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="size-12 rounded-xl bg-primary grid place-items-center font-extrabold text-primary-foreground text-2xl">G</div>
          <div>
            <div className="font-extrabold text-2xl leading-none">Goi</div>
            <div className="text-xs text-muted-foreground mt-1">שחזור סיסמה לשליח</div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {step === "request" ? "שלח לי קוד בוואטסאפ" : "הזן את הקוד וקבע סיסמה חדשה"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "request" ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <Label htmlFor="phone">מספר וואטסאפ</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                  />
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MessageCircle className="size-3" />
                    הקוד יישלח לוואטסאפ של המספר שאיתו נרשמת.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} שלח קוד
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirm} className="space-y-4">
                <div>
                  <Label htmlFor="code">קוד אימות (6 ספרות)</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="------"
                    className="tracking-[0.5em] text-center text-lg font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="pwd">סיסמה חדשה</Label>
                  <Input
                    id="pwd"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pwd2">אישור סיסמה</Label>
                  <Input
                    id="pwd2"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} עדכן סיסמה
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setStep("request"); setCode(""); }}
                  disabled={loading}
                >
                  לא קיבלת? שלח קוד מחדש
                </Button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-border text-center">
              <Button asChild variant="link" className="text-sm">
                <Link to="/courier-login">
                  <ArrowRight className="size-3.5" />
                  חזרה למסך הכניסה
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
