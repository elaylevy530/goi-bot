import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthShell, AuthField, AuthInput } from "@/components/AuthShell";
import { ApiClientError } from "@/lib/api-client";
import {
  fetchNestSession,
  nestLogin,
  nestLogout,
} from "@/lib/nest-auth";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [{ title: "כניסת מנהל — Goi" }] }),
  ssr: false,
  beforeLoad: async () => {
    const session = await fetchNestSession();
    if (session?.roles.includes("admin") || session?.roles.includes("manager")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await nestLogin(email.trim(), password);
      if (!session.roles.includes("admin") && !session.roles.includes("manager")) {
        nestLogout();
        toast.error("המשתמש אינו מנהל מערכת");
        return;
      }
      toast.success("ברוך הבא, מנהל");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "אימייל או סיסמה שגויים";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="כניסת מנהל מערכת"
      tagline="פאנל ניהול — מנהלים"
      logo={<ShieldCheck className="size-8" />}
      footer={
        <p className="text-sm text-muted-foreground">
          שליח או עסק?{" "}
          <Link to="/auth" className="text-primary font-bold mr-1 underline underline-offset-4">
            לכניסה רגילה
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthField label="אימייל" htmlFor="admin-email">
          <AuthInput id="admin-email" type="email" dir="ltr" required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </AuthField>
        <AuthField label="סיסמה" htmlFor="admin-pw">
          <AuthInput id="admin-pw" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </AuthField>
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition"
        >
          {loading && <Loader2 className="size-4 animate-spin" />} התחבר
        </Button>
      </form>
    </AuthShell>
  );
}
