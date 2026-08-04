import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { BusinessLogo } from "@/components/BusinessLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, Bookmark, MapPin, Repeat, Wallet, FileText,
  BarChart3, Bell, MessageSquare, Settings, HelpCircle, LogOut,
  Package, HandCoins, Code2, ArrowLeft, type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/business/account")({
  head: () => ({ meta: [{ title: "האזור האישי — Goi עסקים" }] }),
  ssr: false,
  component: AccountPage,
});

type Item = { to: string; label: string; icon: LucideIcon; desc?: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "המשלוחים שלי",
    items: [
      { to: "/business/orders", label: "כל ההזמנות", icon: Package, desc: "היסטוריה ומצב חי" },
      { to: "/business/quotes", label: "הצעות משליחים", icon: HandCoins, desc: "מכרזי מחיר פתוחים" },
      { to: "/business/recurring-orders", label: "משלוחים חוזרים", icon: Repeat, desc: "קווי חלוקה ומשמרות" },
    ],
  },
  {
    title: "אנשי קשר וכתובות",
    items: [
      { to: "/business/contacts", label: "ספר נמענים", icon: Bookmark, desc: "נמענים חוזרים" },
      { to: "/business/addresses", label: "כתובות שמורות", icon: MapPin, desc: "סניפים ומחסנים" },
    ],
  },
  {
    title: "כספים",
    items: [
      { to: "/business/wallet", label: "הארנק שלי", icon: Wallet, desc: "יתרה וטעינה" },
      { to: "/business/billing", label: "חשבוניות וחיובים", icon: FileText, desc: "חיוב חודשי ואמצעי תשלום" },
      { to: "/business/analytics", label: "ניתוחים וסטטיסטיקות", icon: BarChart3 },
    ],
  },
  {
    title: "העסק שלי",
    items: [
      { to: "/business/profile", label: "פרטי העסק", icon: Building2 },
      
      { to: "/business/team", label: "צוות והרשאות", icon: Users, desc: "הזמן חברי צוות" },
      { to: "/business/integrations", label: "אינטגרציות", icon: Code2, desc: "API, Webhooks, WhatsApp" },
      { to: "/business/notifications", label: "מרכז ההתראות", icon: Bell },
      { to: "/business/messages", label: "הודעות ושליחים", icon: MessageSquare },
    ],
  },
  {
    title: "הגדרות ותמיכה",
    items: [
      { to: "/business/settings", label: "הגדרות והעדפות", icon: Settings },
      { to: "/business/help", label: "מדריכים ושאלות נפוצות", icon: HelpCircle },
      { to: "/business/support", label: "פנייה לתמיכה", icon: HelpCircle },
    ],
  },
];

function AccountPage() {
  const { data: me } = useMyBusiness();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const displayName = (me as { business_name?: string; name?: string } | null)?.business_name || (me as { name?: string } | null)?.name || "העסק שלי";
  const logoPath = (me as { logo_url?: string } | null)?.logo_url;
  const email = (me as { email?: string } | null)?.email;
  const phone = (me as { phone?: string } | null)?.phone;

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/business-login", replace: true });
  };

  return (
    <BusinessShell>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-5">
        {/* Profile header */}
        <Link
          to="/business/profile"
          className="block rounded-3xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-5 hover:opacity-95 transition"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 ring-2 ring-[#35AD29]/40 rounded-full">
              <BusinessLogo path={logoPath} name={displayName} size={56} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-[#35AD29] uppercase tracking-widest mb-1">חשבון עסקי</div>
              <div className="text-lg font-black truncate">{displayName}</div>
              <div className="text-[12px] text-white/60 truncate mt-0.5">
                {phone && <span dir="ltr">{phone}</span>}
                {phone && email && <span className="mx-1.5">·</span>}
                {email && <span className="truncate">{email}</span>}
              </div>
            </div>
            <ArrowLeft className="size-4 text-white/60 shrink-0" />
          </div>
        </Link>

        {/* Groups */}
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2">{g.title}</h3>
            <div className="rounded-2xl bg-white border border-black/5 overflow-hidden divide-y divide-black/5">
              {g.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to as never}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02] transition"
                >
                  <div className="size-10 rounded-xl bg-[#35AD29]/15 grid place-items-center shrink-0">
                    <it.icon className="size-4 text-[#101418]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[#101418] truncate">{it.label}</div>
                    {it.desc && <div className="text-[11px] text-slate-500 truncate">{it.desc}</div>}
                  </div>
                  <ArrowLeft className="size-4 text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border border-black/5 text-red-600 font-bold hover:bg-red-50 transition"
        >
          <LogOut className="size-4" /> יציאה
        </button>

        <div className="text-center text-[11px] text-slate-400 pt-2">Goi · פאנל עסקים</div>
      </div>
    </BusinessShell>
  );
}
