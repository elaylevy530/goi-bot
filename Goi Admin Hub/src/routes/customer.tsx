import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Activity, MessageCircle, UserCircle2, LogIn } from "lucide-react";
import { useGuestSession } from "@/lib/guest-session";

export const Route = createFileRoute("/customer")({
  ssr: false,
  beforeLoad: ({ location }) => {
    // Open panel: private customers may order as guests, with no registration.
    if (location.pathname === "/customer" || location.pathname === "/customer/") {
      throw redirect({ to: "/customer/dashboard" });
    }
  },
  component: CustomerLayout,
});

const NAV = [
  { to: "/customer/dashboard", label: "בית", icon: Home, exact: true },
  { to: "/customer/activity", label: "פעילות", icon: Activity },
  { to: "/customer/new-order", label: "הזמנה", icon: Plus, highlight: true },
  { to: "/customer/chat", label: "צ׳אט", icon: MessageCircle },
  { to: "/customer/account", label: "אזור אישי", icon: UserCircle2 },
] as const;


function CustomerLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isGuest, identity } = useGuestSession();
  const name = identity?.full_name ?? "";


  const hideHeader = pathname.startsWith("/customer/new-order");

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f6f8] text-[#101418] pb-24">
      {/* Top bar — hidden on full-screen map routes */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/5">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Link to="/customer/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="size-8 rounded-xl bg-[#101418] grid place-items-center font-black text-white text-sm">G</div>
              <div className="text-sm font-bold">Goi</div>
            </Link>

            <div className="flex items-center gap-2">
              {isGuest && (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#101418] bg-[#F5C518] px-3 py-1.5 rounded-full"
                >
                  <LogIn className="size-3.5" /> התחברות
                </Link>
              )}
              <Link
                to="/customer/account"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#101418]/70 hover:text-[#101418] px-2 py-1.5 rounded-full"
              >
                {name ? <span className="hidden sm:inline">{name.split(" ")[0]}</span> : null}
                <div className="size-9 rounded-full bg-[#F5C518]/20 grid place-items-center ring-1 ring-[#F5C518]/40">
                  <UserCircle2 className="size-5 text-[#101418]" />
                </div>
              </Link>
            </div>

          </div>
        </header>
      )}

      <main>
        <Outlet />
      </main>

      {/* Bottom nav — 5 tabs on all viewports */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-black/5 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">

        <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
          {NAV.map((item) => {
            const { to, label, icon: Icon } = item;
            const highlight = "highlight" in item && item.highlight;
            const active = pathname === to || pathname.startsWith(to + "/");
            if (highlight) {
              return (
                <Link key={to} to={to} className="flex flex-col items-center justify-end pb-1.5 relative">
                  <div className={`absolute -top-5 size-14 rounded-full grid place-items-center shadow-lg ring-4 ring-white transition ${
                    active ? "bg-[#101418] text-white" : "bg-[#F5C518] text-[#101418]"
                  }`}>
                    <Icon className="size-6" strokeWidth={2.4} />
                  </div>
                  <span className={`text-[11px] mt-8 ${active ? "font-bold text-[#101418]" : "font-semibold text-[#101418]/60"}`}>
                    {label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  active ? "text-[#101418]" : "text-[#101418]/45"
                }`}
              >
                <div className={`relative ${active ? "scale-110" : ""} transition-transform`}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                  {active && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#F5C518]" />
                  )}
                </div>
                <span className={`text-[11px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
