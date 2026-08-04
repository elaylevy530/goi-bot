import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, LayoutDashboard, Zap, Truck, History, Building2 } from "lucide-react";

const tabs = [
  { to: "/business/dashboard", label: "דשבורד", icon: LayoutDashboard, highlight: false },
  { to: "/business/new-delivery", label: "הזמן משלוח", icon: Zap, highlight: true },
  { to: "/business/active", label: "פעילים", icon: Truck, highlight: false },
  { to: "/business/history", label: "היסטוריה", icon: History, highlight: false },
  { to: "/business/profile", label: "פרופיל", icon: Building2, highlight: false },
];

export function BusinessLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/business-login", replace: true });
  };

  return (
    <div dir="rtl" className="rtl-panel min-h-screen bg-muted/30 text-right">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary grid place-items-center font-extrabold text-primary-foreground">G</div>
            <span className="font-bold">Goi · עסקים</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleSignOut}>
            <LogOut className="size-4" /> יציאה
          </Button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto items-center">
          {tabs.map((t) => {
            const active = path === t.to;
            const Icon = t.icon;
            if (t.highlight) {
              return (
                <Link key={t.to} to={t.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 my-1.5 mx-1 text-sm whitespace-nowrap rounded-lg font-bold transition-colors ${
                    active ? "bg-[#2d9623] text-white shadow-md" : "bg-[#35AD29] text-white hover:bg-[#2d9623]"
                  }`}>
                  <Icon className="size-4" /> {t.label}
                </Link>
              );
            }
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="size-4" /> {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4 text-right">{title}</h1>
        {children}
      </main>
    </div>
  );
}
