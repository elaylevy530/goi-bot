import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Truck, Building2, ShieldCheck, Loader2, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, AuthField, AuthInput } from "@/components/AuthShell";
import {
  ApiClientError,
} from "@/lib/api-client";
import {
  fetchNestSession,
  nestHomePath,
  nestLoginWithPhone,
} from "@/lib/nest-auth";

type Role = "courier" | "business";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "התחברות — Goi" }] }),
  ssr: false,
  beforeLoad: async () => {
    const session = await fetchNestSession();
    if (!session) return;
    const roles = session.roles ?? [];
    if (roles.includes("admin") || roles.includes("manager")) {
      throw redirect({ to: "/dashboard" });
    }
    if (roles.includes("courier")) {
      throw redirect({ to: "/courier/new-jobs" });
    }
    if (roles.includes("business")) {
      const niche = session.profile?.businessNiche ?? "manual_dispatch";
      if (niche === "restaurant") throw redirect({ to: "/restaurant" });
      if (niche === "online_store") throw redirect({ to: "/store" });
      if (niche === "pharmacy_clinic") throw redirect({ to: "/clinic" });
      throw redirect({ to: "/business/dashboard" });
    }
    if (roles.includes("customer")) throw redirect({ to: "/customer/dashboard" });
    throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const ROLES: { key: Role; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "courier", label: "שליח", icon: Truck },
  { key: "business", label: "לקוח עסקי", icon: Building2 },
];

function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function AuthPage() {
  const [role, setRole] = useState<Role>("courier");

  const roleIcon = { courier: <Truck className="size-8" />, business: <Building2 className="size-8" /> }[role];

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
      {/* Role segmented picker — courier + business only */}
      <div className="grid grid-cols-2 gap-1.5 mb-6 rounded-2xl bg-slate-100 p-1.5">
        {ROLES.map(({ key, label, icon: Icon }) => {
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
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
    </AuthShell>
  );
}

/* ---------- Courier ---------- */
function CourierForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    setLoading(true);
    try {
      await nestLoginWithPhone(phone, password, "courier");
      toast.success("ברוך הבא!");
      navigate({ to: "/courier/new-jobs", replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err, "טלפון או סיסמה שגויים"));
    } finally {
      setLoading(false);
    }
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
          <Link
            to="/courier-reset-password"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    setLoading(true);
    try {
      const session = await nestLoginWithPhone(phone, password, "business");
      toast.success("ברוך הבא!");
      navigate({ to: nestHomePath(session), replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err, "טלפון או סיסמה שגויים"));
    } finally {
      setLoading(false);
    }
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

