import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User as UserIcon,
  Clock,
  Gift,
  HelpCircle,
  Bell,
  MessageCircle,
  LogOut,
  ChevronLeft,
  Shield,
  UserPlus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { PushEnableRowGeneric } from "@/components/PushEnableRow";
import { useGuestSession, setGuestIdentity, clearGuestSession } from "@/lib/guest-session";

export const Route = createFileRoute("/customer/account")({
  head: () => ({ meta: [{ title: "אזור אישי — Goi" }] }),
  component: AccountHub,
});

type Row = {
  to?: string;
  label: string;
  sub?: string;
  icon: typeof UserIcon;
  onClick?: () => void;
  danger?: boolean;
};

function AccountHub() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string>("");
  const { isGuest, identity, orders: guestOrders, refresh } = useGuestSession();
  const [editGuest, setEditGuest] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const meta = (u?.user_metadata ?? {}) as { full_name?: string; phone?: string };
      setName(meta.full_name ?? "");
      setPhone(meta.phone ?? u?.email?.split("@")[0] ?? "");
      setUserId(u?.id ?? "");
    })();
  }, []);

  useEffect(() => {
    if (isGuest && identity) {
      setName(identity.full_name);
      setPhone(identity.phone);
    }
  }, [isGuest, identity]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("להתראות!");
    navigate({ to: "/", replace: true });
  };

  const guestGroups: { title: string; items: Row[] }[] = [
    {
      title: "האורח שלי",
      items: [
        { label: "עריכת פרטי קשר", sub: "שם וטלפון להזמנות", icon: Pencil, onClick: () => setEditGuest(true) },
        { to: "/customer/activity", label: "ההזמנות שלי", sub: `${guestOrders.length} הזמנות במכשיר הזה`, icon: Clock },
      ],
    },
    {
      title: "תמיכה",
      items: [
        { to: "/customer/help", label: "עזרה ותמיכה", sub: "שאלות נפוצות ויצירת קשר", icon: HelpCircle },
        { label: "מדיניות פרטיות", icon: Shield, onClick: () => window.open("/blog", "_blank") },
        {
          label: "ניקוי נתוני אורח",
          icon: LogOut,
          danger: true,
          onClick: () => {
            if (!window.confirm("לנקות את פרטי האורח וההזמנות השמורות במכשיר?")) return;
            clearGuestSession();
            refresh();
            toast.success("הנתונים נוקו");
            navigate({ to: "/", replace: true });
          },
        },
      ],
    },
  ];

  const registeredGroups: { title: string; items: Row[] }[] = [
    {
      title: "החשבון שלי",
      items: [
        { to: "/customer/profile", label: "פרטים אישיים", sub: "שם, טלפון, אימייל", icon: UserIcon },
        { to: "/customer/orders", label: "היסטוריית הזמנות", sub: "כל המשלוחים שלך", icon: Clock },
        { to: "/customer/activity", label: "פעילות אחרונה", sub: "משלוחים פעילים", icon: Bell },
      ],
    },
    {
      title: "הטבות ותמיכה",
      items: [
        { to: "/customer/referrals", label: "הזמן חבר", sub: "קבלו זיכוי על כל חבר שמצטרף", icon: Gift },
        { to: "/customer/chat", label: "הודעות ומובילים", icon: MessageCircle },
        { to: "/customer/help", label: "עזרה ותמיכה", sub: "שאלות נפוצות ויצירת קשר", icon: HelpCircle },
      ],
    },
    {
      title: "פרטיות",
      items: [
        { label: "מדיניות פרטיות", icon: Shield, onClick: () => window.open("/blog", "_blank") },
        { label: "יציאה מהחשבון", icon: LogOut, onClick: signOut, danger: true },
      ],
    },
  ];

  const groups = isGuest ? guestGroups : registeredGroups;

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-black/5 flex items-center gap-4">
        <div className="size-14 rounded-full bg-[#F5C518]/25 grid place-items-center ring-2 ring-white shadow">
          <UserIcon className="size-7 text-[#101418]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-extrabold truncate">{name || "לקוח יקר"}</div>
          <div className="text-sm text-[#101418]/60 truncate" dir="ltr">{phone}</div>
        </div>
        {isGuest ? (
          <button
            type="button"
            onClick={() => setEditGuest(true)}
            className="text-sm font-semibold text-[#101418] bg-[#F5C518] hover:brightness-95 px-3 py-1.5 rounded-full"
          >
            עריכה
          </button>
        ) : (
          <Link
            to="/customer/profile"
            className="text-sm font-semibold text-[#101418] bg-[#F5C518] hover:brightness-95 px-3 py-1.5 rounded-full"
          >
            עריכה
          </Link>
        )}
      </div>

      {isGuest && (
        <div className="rounded-2xl bg-[#101418] text-white p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#F5C518]/20 grid place-items-center shrink-0">
            <UserPlus className="size-5 text-[#F5C518]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold">מזמין כאורח</div>
            <div className="text-[11px] text-white/60">
              פתיחת חשבון שומרת היסטוריה, כתובות והתראות בכל מכשיר
            </div>
          </div>
          <Link to="/auth" className="text-xs font-extrabold bg-[#F5C518] text-[#101418] px-3 py-2 rounded-full shrink-0">
            פתיחת חשבון
          </Link>
        </div>
      )}

      {isGuest && editGuest && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" dir="rtl">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-3">
            <div className="text-lg font-extrabold">פרטי קשר</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              className="w-full rounded-2xl bg-[#f5f6f8] ring-1 ring-black/5 px-4 py-3 text-sm outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
              placeholder="050-0000000"
              className="w-full rounded-2xl bg-[#f5f6f8] ring-1 ring-black/5 px-4 py-3 text-sm outline-none text-right"
            />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditGuest(false)} className="px-4 py-3 text-sm font-bold text-[#101418]/60">
                ביטול
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = name.trim();
                  const p = phone.replace(/[^0-9+]/g, "");
                  if (n.length < 2) return toast.error("הזן שם מלא");
                  if (p.length < 9) return toast.error("הזן מספר טלפון תקין");
                  setGuestIdentity({ full_name: n, phone: p });
                  refresh();
                  setEditGuest(false);
                  toast.success("הפרטים נשמרו");
                }}
                className="flex-1 rounded-2xl bg-[#101418] text-white py-3 text-sm font-extrabold"
              >
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}

      {!isGuest && userId && (
        <PushEnableRowGeneric
          role="customer"
          ownerId={userId}
          copy={{
            title: "הפעל התראות Push",
            subtitle: "קבל התראה כשהמוביל מאשר, יוצא, אוסף ומוסר",
            grantedTitle: "התראות Push פעילות",
            grantedSubtitle: "נודיע לך על כל עדכון בסטטוס המשלוח",
          }}
        />
      )}

      {/* Groups */}
      {groups.map((g) => (
        <div key={g.title} className="space-y-2">
          <div className="text-xs font-bold text-[#101418]/50 px-1">{g.title}</div>
          <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {g.items.map((item, i) => {
              const Icon = item.icon;
              const content = (
                <div className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-black/5" : ""} ${item.danger ? "text-red-600" : "text-[#101418]"} hover:bg-black/[0.02] transition`}>
                  <div className={`size-9 rounded-xl grid place-items-center ${item.danger ? "bg-red-50" : "bg-[#f5f6f8]"}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.label}</div>
                    {item.sub && <div className="text-xs text-[#101418]/55 truncate">{item.sub}</div>}
                  </div>
                  <ChevronLeft className="size-4 text-[#101418]/40" />
                </div>
              );
              return item.to ? (
                <Link key={item.label} to={item.to}>{content}</Link>
              ) : (
                <button key={item.label} onClick={item.onClick} className="w-full text-right">
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="text-center text-xs text-[#101418]/40 pt-2">Goi · גרסה 1.0</div>
    </div>
  );
}
