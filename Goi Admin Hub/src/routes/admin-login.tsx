import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthShell, AuthField, AuthInput } from "@/components/AuthShell";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [{ title: "כניסת מנהל — Goi" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (role) throw redirect({ to: "/dashboard" });
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
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setLoading(false);
      return toast.error("אימייל או סיסמה שגויים");
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    setLoading(false);
    if (!role) {
      await supabase.auth.signOut();
      return toast.error("המשתמש אינו מנהל מערכת");
    }
    toast.success("ברוך הבא, מנהל");
    navigate({ to: "/dashboard", replace: true });
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
