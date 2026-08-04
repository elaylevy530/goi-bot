import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Truck, Building2, User, ShieldCheck, Loader2, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, AuthField, AuthInput } from "@/components/AuthShell";
import { signupCustomerFn } from "@/lib/customer-account.functions";

type Role = "courier" | "business" | "customer";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "התחברות — Goi" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const email = data.user.email ?? "";
      if (email.endsWith("@couriers.goi.local")) throw redirect({ to: "/courier/new-jobs" });
      if (email.endsWith("@business.goi.local")) throw redirect({ to: "/business/new-delivery" });
      if (email.endsWith("@customers.goi.local")) throw redirect({ to: "/customer/new-order" });
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuthPage,
});

const ROLES: { key: Role; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "courier", label: "שליח / מוביל", icon: Truck },
  { key: "business", label: "לקוח עסקי", icon: Building2 },
  { key: "customer", label: "לקוח פרטי", icon: User },
];

function AuthPage() {
  const [role, setRole] = useState<Role>("courier");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const roleIcon = { courier: <Truck className="size-8" />, business: <Building2 className="size-8" />, customer: <User className="size-8" /> }[role];

  return (
    <AuthShell
      title="ברוכים הבאים ל-Goi"
      tagline="בחר מי אתה ונעביר אותך לאזור המתאים"
      logo={roleIcon}
      footer={
        <Link
          to="/admin-login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ShieldCheck className="size-4" />
          כניסת מנהל מערכת
        </Link>
      }
    >
      {/* Role segmented picker */}
      <div className="grid grid-cols-3 gap-1.5 mb-6 rounded-2xl bg-slate-100 p-1.5">
        {ROLES.map(({ key, label, icon: Icon }) => {
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRole(key);
                setMode("signin");
              }}
              className={
                "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition text-[11px] sm:text-xs font-bold leading-tight text-center " +
                (active
                  ? "bg-background text-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground hover:text-foreground")
              }
              aria-pressed={active}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {role === "courier" && <CourierForm />}
      {role === "business" && <BusinessForm />}
      {role === "customer" && <CustomerBlock mode={mode} setMode={setMode} />}
    </AuthShell>
  );
}

/* ---------- Courier ---------- */
function CourierForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/courier", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    setLoading(true);
    const email = `${normalizePhone(phone)}@couriers.goi.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("טלפון או סיסמה שגויים");
    toast.success("ברוך הבא!");
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField label="מספר וואטסאפ" htmlFor="c-phone" prefix="+972">
        <AuthInput id="c-phone" type="tel" inputMode="tel" dir="ltr" required
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50-123-4567" />
      </AuthField>
      <AuthField
        label="סיסמה"
        htmlFor="c-pwd"
        action={
          <Link to="/courier-reset-password" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
            <KeyRound className="size-3" />
            שכחתי סיסמה
          </Link>
        }
      >
        <AuthInput id="c-pwd" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </AuthField>
      <Button type="submit" disabled={loading}
        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition">
        {loading && <Loader2 className="size-4 animate-spin" />} כניסה למערכת
      </Button>
      <Button asChild variant="outline" className="w-full rounded-2xl h-12">
        <Link to="/join">
          <UserPlus className="size-4" />
          הרשמה כשליח חדש
        </Link>
      </Button>
    </form>
  );
}

/* ---------- Business ---------- */
function BusinessForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) return;
      const { data: cust } = await supabase
        .from("customers")
        .select("business_niche")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const niche = (cust as { business_niche?: string } | null)?.business_niche ?? "manual_dispatch";
      const target = niche === "restaurant" ? "/restaurant" : niche === "online_store" ? "/store" : "/business";
      navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    setLoading(true);
    const email = `${normalizePhone(phone)}@business.goi.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("טלפון או סיסמה שגויים");
    toast.success("ברוך הבא!");
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField label="טלפון" htmlFor="b-phone" prefix="+972">
        <AuthInput id="b-phone" type="tel" inputMode="tel" dir="ltr" required
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50-123-4567" />
      </AuthField>
      <AuthField label="סיסמה" htmlFor="b-pwd">
        <AuthInput id="b-pwd" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </AuthField>
      <Button type="submit" disabled={loading}
        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition">
        {loading && <Loader2 className="size-4 animate-spin" />} כניסה למערכת
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        עוד אין חשבון?{" "}
        <Link to="/signup-business" className="text-primary font-bold mr-1 underline underline-offset-4">
          הירשם כעסק
        </Link>
      </p>
    </form>
  );
}

/* ---------- Customer ---------- */
function CustomerBlock({ mode, setMode }: { mode: "signin" | "signup"; setMode: (m: "signin" | "signup") => void }) {
  return (
    <div>
      <div className="grid grid-cols-2 w-full rounded-2xl bg-slate-100 p-1 mb-5">
        <button type="button" onClick={() => setMode("signin")}
          className={"rounded-xl py-2 text-sm font-semibold transition " +
            (mode === "signin" ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}>
          התחברות
        </button>
        <button type="button" onClick={() => setMode("signup")}
          className={"rounded-xl py-2 text-sm font-semibold transition " +
            (mode === "signup" ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}>
          חשבון חדש
        </button>
      </div>
      {mode === "signin" ? <CustomerSignIn /> : <CustomerSignUp onDone={() => setMode("signin")} />}
    </div>
  );
}

function CustomerSignIn() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = `${normalizePhone(phone)}@customers.goi.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("טלפון או סיסמה שגויים");
    toast.success("ברוך הבא!");
    navigate({ to: "/customer/dashboard", replace: true });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField label="מספר טלפון" htmlFor="p-phone" prefix="+972">
        <AuthInput id="p-phone" type="tel" inputMode="tel" dir="ltr" required
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50-000-0000" />
      </AuthField>
      <AuthField label="סיסמה" htmlFor="p-pwd">
        <AuthInput id="p-pwd" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </AuthField>
      <Button type="submit" disabled={loading}
        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition">
        {loading && <Loader2 className="size-4 animate-spin" />} כניסה למערכת
      </Button>
    </form>
  );
}

function CustomerSignUp({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const signup = useServerFn(signupCustomerFn);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
    setLoading(true);
    try {
      await signup({ data: { full_name: name, phone, password } });
      const email = `${normalizePhone(phone)}@customers.goi.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.success("חשבון נוצר. אנא התחבר.");
        onDone();
      } else {
        toast.success("ברוך הבא ל-Goi!");
        navigate({ to: "/customer/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת החשבון נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AuthField label="שם מלא" htmlFor="s-name">
        <AuthInput id="s-name" required value={name}
          onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" />
      </AuthField>
      <AuthField label="טלפון" htmlFor="s-phone" prefix="+972">
        <AuthInput id="s-phone" type="tel" inputMode="tel" dir="ltr" required
          value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50-000-0000" />
      </AuthField>
      <AuthField label="סיסמה (לפחות 6 תווים)" htmlFor="s-pwd">
        <AuthInput id="s-pwd" type="password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </AuthField>
      <Button type="submit" disabled={loading}
        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition">
        {loading && <Loader2 className="size-4 animate-spin" />} פתיחת חשבון
      </Button>
    </form>
  );
}
