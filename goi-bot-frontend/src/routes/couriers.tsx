import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitCourierContactLead } from "@/lib/courier-contact-lead.functions";

import {
  ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, Menu, X,
  Bike, Truck, Car, Package, Boxes, Wallet, MapPin,
  Clock, Bell, Shield, TrendingUp, Users, Star,
  MessageCircle, Zap, Award, ThumbsUp, Handshake, Phone,
  Lock, BadgeCheck, Sparkles, User, Activity,
  UtensilsCrossed, Flower2, Pill, Home, Building2, Radio, HelpCircle,
} from "lucide-react";

import courierHero from "@/assets/courier-hero.jpg";
import moversImg from "@/assets/movers.jpg";
import realCourier from "@/assets/courier-photo.jpg.asset.json";
import realMovers from "@/assets/movers-photo.jpg.asset.json";
import personAvi from "@/assets/person-avi.jpg";
import personMoshe from "@/assets/person-moshe.jpg";
import personYossi from "@/assets/person-yossi.jpg";
import personNoa from "@/assets/person-noa.jpg";
import personShira from "@/assets/person-shira.jpg";
import walletPhone from "@/assets/wallet-phone.jpg";


const SITE_URL = "https://goi-bot.lovable.app";
const WA_GREEN = "#128C7E";
const INK = "#0A0A0A";
const CANVAS = "#F7F6F2";
const font = { fontFamily: "'Heebo','Assistant',system-ui,sans-serif" };

export const Route = createFileRoute("/couriers")({
  head: () => ({
    meta: [
      { title: "לשליחים ומובילים — Goi | קבלו עבודות בוואטסאפ" },
      {
        name: "description",
        content:
          "יש לך אופנוע, רכב, טנדר או משאית? Goi שולחת אליך עבודות באזור שלך ישירות בוואטסאפ. בלי דמי הרשמה, בלי משמרות, אתה בוחר מה לקחת ומתי.",
      },
      { property: "og:title", content: "Goi — הצטרפו לרשת השליחים והמובילים" },
      { property: "og:description", content: "עבודות באזור שלך בוואטסאפ. תשלום מהיר, בלי דמי הרשמה." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/couriers" },
      { property: "og:image", content: SITE_URL + courierHero },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE_URL + courierHero },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/couriers" }],
  }),
  component: CouriersLanding,
});

/* ============ WhatsApp icon (shared style) ============ */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.256.59 4.462 1.712 6.406L3.2 28.8l6.578-1.715a12.76 12.76 0 006.222 1.6h.005c7.06 0 12.8-5.74 12.8-12.8s-5.742-12.685-12.802-12.685zm0 23.31h-.004a10.6 10.6 0 01-5.4-1.478l-.387-.23-3.902 1.018 1.04-3.8-.252-.39a10.55 10.55 0 01-1.62-5.63c0-5.842 4.754-10.596 10.6-10.596 2.83 0 5.49 1.104 7.49 3.106a10.52 10.52 0 013.106 7.49c0 5.847-4.754 10.51-10.67 10.51zm5.813-7.876c-.318-.16-1.884-.93-2.176-1.036-.292-.106-.504-.16-.716.16s-.82 1.036-1.006 1.248-.372.24-.69.08c-.318-.16-1.344-.495-2.56-1.578-.946-.844-1.586-1.886-1.772-2.204-.186-.318-.02-.49.14-.65.144-.144.318-.372.478-.558.16-.186.212-.318.318-.53.106-.212.053-.398-.027-.558-.08-.16-.716-1.726-.98-2.362-.258-.62-.52-.536-.716-.546l-.61-.01c-.212 0-.556.08-.848.398-.292.318-1.113 1.086-1.113 2.646 0 1.56 1.14 3.068 1.3 3.28.16.212 2.244 3.428 5.436 4.808.76.328 1.353.524 1.816.67.762.242 1.456.208 2.005.126.612-.09 1.884-.77 2.15-1.512.266-.742.266-1.378.186-1.512-.08-.132-.29-.212-.61-.372z"/>
    </svg>
  );
}

function LogoBadge({ size = 34 }: { size?: number }) {
  const fontSize = Math.max(9, Math.round(size * 0.36));
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full animate-spin-slow" style={{ animationDuration: "12s" }}>
        <circle cx="20" cy="20" r="18.5" fill="none" stroke={WA_GREEN} strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 3" />
      </svg>
      <span className="relative rounded-full grid place-items-center shadow-[0_4px_10px_-3px_rgba(18,140,126,0.55)]"
        style={{ width: "78%", height: "78%", background: `radial-gradient(circle at 30% 30%, #1BA898, ${WA_GREEN} 55%, #0B6B60)` }}>
        <span className="text-white tracking-[-0.03em] leading-none" style={{ fontFamily: "var(--font-wordmark)", fontWeight: 900, fontSize }}>GOI</span>
      </span>
    </span>
  );
}

/* ============ NAV ============ */
function Nav() {
  const [open, setOpen] = useState(false);
  const links: Array<[string, string]> = [
    ["איך זה עובד", "#how"],
    ["היתרונות", "#benefits"],
    ["כמה מרוויחים", "#earnings"],
    ["שאלות", "#faq"],
    ["ללקוחות", "/"],
  ];
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <header dir="rtl" className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(247,246,242,0.85)] border-b border-black/[0.06]">
        <div className="relative max-w-[1240px] mx-auto flex items-center justify-between gap-2 px-4 sm:px-5 lg:px-10 h-16">
          <Link to="/" className="flex items-center shrink-0" aria-label="Goi">
            <LogoBadge />
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-[14px] text-black/65">
            {links.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="hover:text-black transition">{label}</a>
              ) : (
                <Link key={label} to={href} className="hover:text-black transition">{label}</Link>
              )
            )}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/join"
              className="inline-flex items-center gap-2 px-3.5 md:px-4 h-10 rounded-full text-white font-semibold text-[12.5px] md:text-[13.5px] transition hover:opacity-90 active:scale-95"
              style={{ background: WA_GREEN }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              הצטרפו עכשיו
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="פתח תפריט"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-black/10 bg-white/70"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-white shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <LogoBadge />
              <button onClick={() => setOpen(false)} aria-label="סגור"
                className="w-10 h-10 rounded-full border border-black/10 grid place-items-center">
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 text-[15px]">
              {links.map(([label, href]) =>
                href.startsWith("#") ? (
                  <a key={label} href={href} onClick={() => setOpen(false)} className="py-2.5 border-b border-black/5">{label}</a>
                ) : (
                  <Link key={label} to={href} onClick={() => setOpen(false)} className="py-2.5 border-b border-black/5">{label}</Link>
                )
              )}
              <Link to="/courier-login" onClick={() => setOpen(false)} className="py-2.5 border-b border-black/5 font-semibold" style={{ color: WA_GREEN }}>
                כניסת שליחים
              </Link>
            </nav>
            <Link
              to="/join"
              onClick={() => setOpen(false)}
              className="mt-auto inline-flex items-center justify-center gap-2 h-12 rounded-full text-white font-bold"
              style={{ background: WA_GREEN }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              הצטרף לרשת
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ============ HERO ============ */
const VEHICLES: { icon: typeof Bike; label: string }[] = [
  { icon: Bike, label: "אופנוע" },
  { icon: Car, label: "רכב פרטי" },
  { icon: Truck, label: "טנדר" },
  { icon: Truck, label: "משאית" },
];

function VehicleBadge({ icon: Icon, label, delay }: { icon: typeof Bike; label: string; delay: number }) {
  return (
    <div
      className="group relative flex flex-col items-center gap-1.5"
      style={{ animation: `card-in 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s both` }}
    >
      <span
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center bg-white border border-black/[0.08] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)] group-hover:-translate-y-1 group-hover:shadow-[0_10px_24px_-8px_rgba(18,140,126,0.35)] group-hover:border-[color:var(--wa,#128C7E)]/30 transition-all duration-300"
        style={{ ["--wa" as any]: WA_GREEN }}
      >
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: WA_GREEN }} strokeWidth={2} />
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ boxShadow: `inset 0 0 0 2px ${WA_GREEN}22` }}
        />
      </span>
      <span className="text-[11px] sm:text-[12px] font-bold text-black/70 group-hover:text-black transition">
        {label}
      </span>
    </div>
  );
}

function Hero() {


  return (
    <section className="relative overflow-hidden">
      {/* Ambient background — matches home */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 85% 0%, rgba(37,211,102,0.10), transparent 55%), radial-gradient(90% 70% at 10% 30%, rgba(15,157,88,0.07), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)",
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden>
          <defs>
            <pattern id="cour-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cour-grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 pt-6 sm:pt-10 lg:pt-20 pb-14 sm:pb-16 lg:pb-28 flex flex-col gap-7 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:items-start">
        {/* A — Intro */}
        <div className="contents lg:block lg:col-start-1 lg:row-start-1">
          {/* Community chip — belonging */}
          <div dir="rtl" className="flex justify-center lg:justify-start mb-3 lg:mb-4">
            <span
              className="inline-flex items-center gap-2 rounded-full bg-white border border-black/[0.06] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)] pr-3 pl-3.5 py-1.5 text-[12px] sm:text-[13px] font-semibold"
              style={{ color: INK }}
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: WA_GREEN }} />
                <span className="relative size-2 rounded-full" style={{ background: WA_GREEN }} />
              </span>
              <span>
                משפחת ה-
                <span className="font-black tracking-tight" style={{ color: WA_GREEN, fontFamily: "var(--font-wordmark)" }}>GOISTS</span>
                {" "}·{" "}
                <span className="text-black/60 font-medium">+1,200 שליחים ומובילים בשטח</span>
              </span>
            </span>
          </div>

          {/* Unified headline — speaks to everyone */}
          <h1
            dir="rtl"
            className="text-center lg:text-right text-[26px] leading-[1.2] sm:text-[38px] sm:leading-[1.12] lg:text-[58px] lg:leading-[1.05] break-words"
            style={{
              fontFamily: '"Heebo", system-ui, sans-serif',
              fontWeight: 700,
              letterSpacing: 0,
              color: INK,
            }}
          >
            <span className="block">שליח או מוביל?</span>
            <span
              className="block mt-1.5 lg:mt-2 font-black"
              style={{ color: WA_GREEN }}
            >
              הצטרף למשפחת ה-GOISTS.
            </span>
          </h1>


          {/* Sub */}
          <div
            dir="rtl"
            className="mt-2 lg:mt-4 mx-auto lg:mx-0 max-w-[460px] lg:max-w-[560px] text-center lg:text-right space-y-3.5 lg:space-y-4"
          >
            <p className="text-[17px] sm:text-[18.5px] lg:text-[20px] leading-[1.55] text-black/90 font-medium">
              <span
                className="font-black tracking-tight"
                style={{ color: INK, fontFamily: "var(--font-wordmark)" }}
              >
                GOI
              </span>{" "}
              שולחת אליך עבודות בוואטסאפ,{" "}
              <span className="font-bold whitespace-nowrap" style={{ color: WA_GREEN }}>
                לפי הרכב שלך, לפי האזור שלך.
              </span>
            </p>
            <p className="text-[15px] sm:text-[16px] lg:text-[17px] leading-[1.7] text-black/70 font-normal">
              משלוחים על אופנוע, שליחויות ברכב, הובלות בטנדר או משאית. בוחר את מה שאתה עושה,
              ומקבל רק עבודות שמתאימות לך. <span className="font-bold text-black/90">בלי מוקד, בלי דיספצ׳ר, בלי דמי הרשמה.</span>
            </p>
          </div>

          {/* Vehicle tray — floating card */}
          <div className="mt-6 lg:mt-7">
            <div
              dir="rtl"
              className="mx-auto lg:mx-0 flex items-center gap-4 sm:gap-6 bg-white border border-black/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 sm:px-6 py-3 rounded-2xl max-w-[560px] w-full"
            >
              <div className="flex flex-col shrink-0">
                <span className="text-[13px] sm:text-sm font-bold tracking-tight" style={{ color: INK }}>
                  מתאים ל:
                </span>
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: WA_GREEN }}
                >
                  כל סוגי הרכב
                </span>
              </div>
              <div className="h-10 w-px bg-black/10 shrink-0" />
              <div className="flex flex-1 justify-between items-center">
                {VEHICLES.map((v) => {
                  const Icon = v.icon;
                  return (
                    <div
                      key={v.label}
                      className="group flex flex-col items-center gap-1.5 transition-transform duration-300 hover:scale-105"
                    >
                      <div
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: `${WA_GREEN}0D` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: WA_GREEN }} strokeWidth={2} />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium" style={{ color: INK }}>
                        {v.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA — two paths */}
          <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
            <Link
              to="/join"
              search={{ type: "courier" } as any}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full px-5 h-12 text-[14px] font-bold shadow-[0_8px_24px_-8px_rgba(37,211,102,0.5)] hover:shadow-[0_12px_32px_-8px_rgba(37,211,102,0.6)] transition-all active:scale-[0.98]"
              style={{ background: WA_GREEN, color: "white" }}
            >
              <Bike className="w-4 h-4" />
              <span>הצטרף כשליח</span>
              <ArrowLeft className="w-4 h-4 opacity-80 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
            <Link
              to="/join"
              search={{ type: "mover" } as any}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full px-5 h-12 text-[14px] font-bold border-2 bg-white hover:bg-black/[0.03] transition-all active:scale-[0.98]"
              style={{ borderColor: INK, color: INK }}
            >
              <Truck className="w-4 h-4" />
              <span>הצטרף כמוביל</span>
              <ArrowLeft className="w-4 h-4 opacity-80 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
          </div>
          <p dir="rtl" className="mt-3 text-[12.5px] sm:text-[13px] text-black/55 text-center lg:text-right">
            הרשמה של דקה. ברגע שאישרנו — אתה חלק מ-
            <span className="font-black tracking-tight" style={{ color: WA_GREEN, fontFamily: "var(--font-wordmark)" }}>GOISTS</span>
            , הקהילה של און-דימנד בישראל. 🟢
          </p>

        </div>

        {/* Right column — phone chat + glow + floating chips */}
        <div className="relative max-w-[440px] w-full mx-auto lg:mx-0 lg:max-w-none lg:col-start-2 lg:row-start-1 lg:row-span-2 scroll-mt-24 animate-widget-float">
          <div
            className="absolute -inset-4 sm:-inset-6 -z-10 animate-glow-pulse"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 45%, rgba(37,211,102,0.18), transparent 70%)",
            }}
          />

          {/* top ribbon LIVE */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold px-2.5 h-7 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE · עבודה אמיתית
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-black/55">
              <BadgeCheck size={11} color={WA_GREEN} />
              רשת מאומתת
            </div>
          </div>

          {/* Floating chip top-right */}
          <div className="hidden sm:flex absolute top-6 -right-3 lg:-right-6 z-20 bg-white rounded-2xl shadow-xl p-3 items-center gap-2.5 border border-black/5 animate-widget-float">
            <div
              className="w-9 h-9 rounded-xl grid place-items-center"
              style={{ background: `${WA_GREEN}18` }}
            >
              <Bell className="w-4 h-4" style={{ color: WA_GREEN }} />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-black/50 leading-tight">עבודה חדשה בוואטסאפ</div>
              <div className="text-[12.5px] font-black text-black">ת״א → רמת גן · 65 ₪</div>
            </div>
          </div>

          {/* Floating chip bottom-left */}
          <div
            className="hidden sm:flex absolute bottom-6 -left-3 lg:-left-8 z-20 bg-white rounded-2xl shadow-xl p-3 items-center gap-2.5 border border-black/5 animate-widget-float"
            style={{ animationDelay: "1.2s" }}
          >
            <div
              className="w-9 h-9 rounded-xl grid place-items-center"
              style={{ background: `${WA_GREEN}18` }}
            >
              <Wallet className="w-4 h-4" style={{ color: WA_GREEN }} />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-black/50 leading-tight">הכנסה השבוע</div>
              <div className="text-[14px] font-black text-black">₪2,840</div>
            </div>
          </div>

          <PhoneChat />
        </div>

        {/* B — Trust cards — matches home */}
      </div>
    </section>
  );
}

/* ============ HOW IT WORKS ============ */
function HowItWorks() {
  const steps = [
    { n: 1, icon: Users, title: "נרשמים ב-2 דקות", text: "טופס קצר — שם, טלפון, סוג הרכב והאזור בו אתה עובד. הצוות שלנו מאשר תוך יום עסקים." },
    { n: 2, icon: Bell, title: "מקבלים עבודה בוואטסאפ ובאפליקציה", text: "הבוט שולח לך עבודות שמתאימות לרכב ולאזור שלך — עם כתובות, פרטים וזמן — גם בוואטסאפ וגם בתוך האפליקציה." },
    { n: 3, icon: ThumbsUp, title: "מגיש הצעה או מאשר מחיר", text: "בעבודה עם מחיר קבוע — מאשר בלחיצה ומתחיל. בעבודה פתוחה — מגיש הצעת מחיר משלך ומחכה שהלקוח יאשר אותך." },
    { n: 4, icon: Wallet, title: "מבצע ומקבל תשלום", text: "מבצע איסוף ומסירה, מסמן ׳הושלם׳ — התשלום מגיע ישר לחשבון." },
  ];

  return (
    <section id="how" className="relative py-16 sm:py-20 lg:py-28">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-20">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-3" style={{ color: WA_GREEN }}>איך זה עובד</div>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[48px] font-black leading-[1.1]" style={{ color: INK }}>
            4 שלבים ואתה מתחיל לעבוד
          </h2>
          <div className="mt-5 h-1.5 w-24 mx-auto rounded-full" style={{ background: WA_GREEN }} />
          <p className="mt-5 text-[15px] sm:text-[16.5px] text-black/60">
            בלי אפליקציות מסובכות, בלי משמרות. הכל בוואטסאפ שכבר יש לך.
          </p>
        </div>

        {/* Steps with connecting flow line */}
        <div className="relative">
          {/* Desktop dashed connector — sits behind the icon tiles */}
          <div
            className="hidden lg:block absolute right-[10%] left-[10%] top-[40px] border-t-2 border-dashed pointer-events-none z-0"
            style={{ borderColor: `${WA_GREEN}33` }}
            aria-hidden
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-14 sm:gap-12 lg:gap-8 relative z-10">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`group flex flex-col items-center text-center ${i % 2 === 1 ? "lg:mt-20" : ""}`}
                style={{ animation: `card-in .55s cubic-bezier(0.16,1,0.3,1) ${i * 0.09}s both` }}
              >
                <div className="relative mb-6">
                  <div
                    className="w-20 h-20 bg-white rounded-2xl grid place-items-center border border-black/[0.06] shadow-[0_14px_30px_-14px_rgba(11,18,32,0.18)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-16px_rgba(18,140,126,0.35)] group-hover:border-[color:var(--brand)]/40"
                    style={{ ["--brand" as string]: WA_GREEN }}
                  >
                    <s.icon className="w-9 h-9" style={{ color: WA_GREEN }} strokeWidth={1.6} />
                  </div>
                  <span
                    className="absolute -top-3 -right-3 w-9 h-9 rounded-full grid place-items-center text-white font-black text-[15px] shadow-md ring-4 ring-[#FDFBF7]"
                    style={{ background: WA_GREEN }}
                  >
                    {s.n}
                  </span>
                </div>
                <h3 className="text-[17.5px] sm:text-[18px] font-black mb-2 leading-tight" style={{ color: INK }}>
                  {s.title}
                </h3>
                <p className="text-[13.5px] sm:text-[14px] text-black/60 leading-[1.65] max-w-[240px]">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 lg:mt-20 text-center">
          <Link
            to="/join"
            className="inline-flex items-center gap-2.5 rounded-full pl-4 pr-5 h-12 text-[14px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(18,140,126,0.6)] hover:scale-[1.02] transition-transform"
            style={{ background: WA_GREEN }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            התחל את ההרשמה
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-black/45 text-[12.5px] font-medium">
            הצטרפו לאלפי שליחים שכבר עובדים עם GOI
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============ BENEFITS ============ */
function Benefits() {
  const items = [
    { icon: Wallet, title: "תשלום הוגן ומהיר", text: "עמלה שקופה ונמוכה, תשלום ישיר לחשבון בלי המתנות של חודשים." },
    { icon: MapPin, title: "עבודות באזור שלך", text: "הבוט שולח לך רק עבודות שמתאימות לאזור, לרכב ולסוג העבודה שאתה עושה." },
    { icon: Clock, title: "גמישות מלאה", text: "אין משמרות מחייבות. עובד מתי שנוח לך — בבוקר, בערב, סופ״ש. כמה שבא לך." },
    { icon: Shield, title: "גיבוי אנושי 24/7", text: "יש בעיה עם לקוח או משלוח? צוות אנושי איתך בוואטסאפ תוך דקות." },
    { icon: TrendingUp, title: "בונוסים לפעילים", text: "יותר עבודות = יותר בונוסים. ככל שתעבוד יותר תרוויח יותר. שקוף לגמרי." },
    { icon: Users, title: "קהילה של שליחים", text: "קבוצת וואטסאפ של הרשת, טיפים, וצוות שמכיר אותך בשם — לא מספר." },
  ];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || !el) return;
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.getBoundingClientRect().width + 12; // card + gap
      const max = el.scrollWidth - el.clientWidth - 4;
      // RTL: scrollLeft is <= 0, more negative = further along
      const next = Math.abs(el.scrollLeft) + step >= max
        ? 0
        : el.scrollLeft - step;
      el.scrollTo({ left: next, behavior: "smooth" });
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="benefits" className="relative py-12 sm:py-16 lg:py-20" style={{ background: "white" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-center">

          {/* LEFT — Phone image */}
          <div className="relative order-1 lg:order-none">
            <div
              className="relative rounded-[2rem] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[520px]"
              style={{
                background: `linear-gradient(135deg, ${WA_GREEN}18 0%, ${WA_GREEN}05 60%, ${CANVAS} 100%)`,
              }}
            >
              <img
                src={walletPhone}
                alt="ארנק השליח באפליקציית Goi"
                loading="lazy"
                width={1024}
                height={1280}
                className="absolute inset-0 w-full h-full object-contain object-center p-4 sm:p-6"
              />
              {/* Floating chip */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: `${WA_GREEN}18` }}>
                  <Wallet className="w-3.5 h-3.5" style={{ color: WA_GREEN }} />
                </span>
                <span className="text-[11.5px] font-black" style={{ color: INK }}>תשלום מיידי</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Title + carousel */}
          <div className="min-w-0">
            <div className="mb-6 lg:mb-8 text-center lg:text-right">
              <div className="text-[11.5px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: WA_GREEN }}>היתרונות</div>
              <h2 className="text-[24px] sm:text-[30px] lg:text-[36px] font-black leading-[1.15]" style={{ color: INK }}>
                למה שליחים ומובילים בוחרים ב-Goi?
              </h2>
              <p className="mt-3 text-[13.5px] sm:text-[14.5px] text-black/55 leading-[1.6] max-w-md mx-auto lg:mx-0">
                כל מה שאתה צריך כדי לעבוד חכם — במקום אחד, בוואטסאפ.
              </p>
            </div>

            <div
              ref={scrollerRef}
              onMouseEnter={() => { pausedRef.current = true; }}
              onMouseLeave={() => { pausedRef.current = false; }}
              onTouchStart={() => { pausedRef.current = true; }}
              onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 2500); }}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 sm:-mx-5 sm:px-5 lg:-mx-2 lg:px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              dir="rtl"
            >
              {items.map((it) => (
                <div
                  key={it.title}
                  className="group snap-start shrink-0 basis-[78%] sm:basis-[46%] lg:basis-[47%] rounded-2xl p-4 sm:p-5 bg-white border border-black/[0.07] hover:border-[color:var(--brand)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(18,140,126,0.35)] transition-all"
                  style={{ ["--brand" as string]: `${WA_GREEN}66` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 shrink-0 rounded-xl grid place-items-center group-hover:scale-105 transition-transform"
                      style={{ background: `${WA_GREEN}12` }}
                    >
                      <it.icon className="w-[19px] h-[19px]" style={{ color: WA_GREEN }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-black leading-tight mb-1" style={{ color: INK }}>{it.title}</h3>
                      <p className="text-[12.5px] text-black/60 leading-[1.55]">{it.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11.5px] text-black/35 mt-1 text-center lg:text-right">גלול לצדדים לעוד ←</p>
          </div>

        </div>
      </div>
    </section>
  );
}


/* ============ TWO MODES: Courier vs Mover (compact & elegant) ============ */
function TwoModes() {
  const modes = [
    {
      tag: "שליח",
      icon: Bike,
      img: realCourier.url,
      title: "שליחים",
      subtitle: "אופנוע · קטנוע · אופניים חשמליים · רכב",
      lines: [
        "משלוחים בודדים ומסמכים",
        "משמרות שעתיות וקווי חלוקה",
        "חבילות עד ~30 ק״ג",
        "אזור פעילות שאתה מגדיר",
      ],
      cta: "אני שליח",
    },
    {
      tag: "מוביל",
      icon: Truck,
      img: realMovers.url,
      title: "מובילים וצוותי הובלה",
      subtitle: "טנדר · משאית · צוות מובילים",
      lines: [
        "הובלות קטנות ופריט בודד",
        "דירה, משרד ופינויים",
        "לבד או עם צוות — אתה בוחר",
        "מחיר מינימום ומרחק שלך",
      ],
      cta: "אני מוביל",
    },
  ];
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-10 lg:mb-14">
          <div className="text-[12px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: WA_GREEN }}>
            מתאים לך?
          </div>
          <h2 className="text-[28px] sm:text-[40px] lg:text-[52px] font-black tracking-tight leading-[1.05]" style={{ color: INK }}>
            שני עולמות. <span style={{ color: WA_GREEN }}>בחירה אחת.</span>
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-black/55 font-light max-w-lg mx-auto">
            מצא את המסלול שמתאים לך והתחל להרוויח כבר היום.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {modes.map((m, i) => {
            const Icon = m.icon;
            const badgeBg = WA_GREEN;
            return (
              <div
                key={m.tag}
                className="group relative min-h-[520px] lg:min-h-[580px] rounded-[2rem] overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)] hover:shadow-[0_20px_60px_-15px_rgba(18,140,126,0.4)] transition-all duration-500 hover:-translate-y-1.5"
              >
                <img
                  src={m.img}
                  alt={m.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e1b] via-[#0a1e1b]/55 to-[#0a1e1b]/10" />

                <div className="absolute inset-0 p-7 sm:p-9 lg:p-10 flex flex-col text-white">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg"
                      style={{ background: badgeBg }}
                    >
                      <Icon className="w-3 h-3" strokeWidth={3} />
                      {m.tag}
                    </span>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <h3 className="text-[26px] sm:text-[30px] lg:text-[34px] font-black leading-[1.1]">
                        {m.title}
                      </h3>
                      <p className="mt-1 text-[14px] sm:text-[15px] font-bold" style={{ color: "#4ADE80" }}>
                        {m.subtitle}
                      </p>
                    </div>

                    <ul className="space-y-2">
                      {m.lines.map((l) => (
                        <li key={l} className="flex items-center gap-2.5 text-[14px] sm:text-[15px] text-white/90">
                          <Check className="w-4 h-4 shrink-0" strokeWidth={3} style={{ color: "#4ADE80" }} />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/join"
                      className="mt-2 inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black transition-all shadow-xl active:scale-95"
                      style={{
                        background: i === 0 ? WA_GREEN : "#ffffff",
                        color: i === 0 ? "#ffffff" : WA_GREEN,
                      }}
                    >
                      {m.cta}
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}

/* ============ EARNINGS STRIP ============ */
function Earnings() {
  const rows = [
    { icon: Bike, vehicle: "קטנוע / אופנוע", note: "משלוחים בעיר, חבילות קטנות", low: "₪90", high: "₪180", per: "לשעה ממוצעת" },
    { icon: Car, vehicle: "רכב פרטי / טנדר קטן", note: "משלוחים גדולים, פריט בודד", low: "₪120", high: "₪230", per: "לשעה ממוצעת" },
    { icon: Truck, vehicle: "משאית / הובלות", note: "דירה, משרד, פינויים", low: "₪800", high: "₪3,500", per: "לעבודה ממוצעת" },
  ];
  return (
    <section id="earnings" className="relative py-16 sm:py-20 lg:py-24 text-white" style={{ background: INK }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#4ADE80" }}>כמה מרוויחים</div>
          <h2 className="text-[26px] sm:text-[34px] lg:text-[44px] font-black leading-[1.15]">
            הכנסה שקופה. בלי הפתעות.
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16.5px] text-white/60">
            טווחי הכנסה ממוצעים לשליחים ולמובילים ברשת. התוצאה בפועל תלויה בשעות ובאזור.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
          {rows.map((r) => (
            <div key={r.vehicle} className="rounded-3xl p-6 lg:p-7 border border-white/10 bg-white/[0.04] backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl grid place-items-center" style={{ background: "rgba(74,222,128,0.15)" }}>
                  <r.icon className="w-5.5 h-5.5" style={{ color: "#4ADE80" }} />
                </div>
                <div>
                  <div className="font-black text-[16px]">{r.vehicle}</div>
                  <div className="text-[12.5px] text-white/50">{r.note}</div>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] lg:text-[34px] font-black" style={{ color: "#4ADE80" }}>{r.low}</span>
                <span className="text-white/40 text-[15px]">–</span>
                <span className="text-[28px] lg:text-[34px] font-black" style={{ color: "#4ADE80" }}>{r.high}</span>
              </div>
              <div className="mt-1 text-[12.5px] text-white/50">{r.per}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ WHATSAPP JOB-OFFER MOCKUP (cinematic) ============ */
type Receipt = "sending" | "sent" | "delivered" | "read";
type Bubble = {
  who: "bot" | "me";
  render: (ctx: { receipt: Receipt; time: string }) => React.ReactNode;
  action?: { label: string; primary?: boolean }[];
  typingMs?: number; // how long typing indicator shows before this bubble
  afterMs?: number; // delay AFTER this bubble before next
};
type Item = { kind: "system"; text: string } | ({ kind: "bubble" } & Bubble);

const STEPS = ["הצעה", "בדרך לאיסוף", "בדרך ללקוח", "הושלם", "תשלום"];

/* Tiny inline mini-map (SVG) — animated route */
function MiniMap() {
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-black/5 bg-[#E6EEF0] relative h-[110px]">
      <svg viewBox="0 0 260 110" className="w-full h-full block">
        <defs>
          <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#C9D6D3" strokeWidth="0.6" />
          </pattern>
          <linearGradient id="route" x1="0" x2="1">
            <stop offset="0%" stopColor={WA_GREEN} />
            <stop offset="100%" stopColor="#25D366" />
          </linearGradient>
        </defs>
        <rect width="260" height="110" fill="url(#grid)" />
        {/* roads */}
        <path d="M0 78 H260" stroke="#D4DEDB" strokeWidth="6" />
        <path d="M90 0 V110" stroke="#D4DEDB" strokeWidth="6" />
        <path d="M180 0 V110" stroke="#D4DEDB" strokeWidth="6" />
        {/* animated route */}
        <path
          d="M28 82 C 80 82, 110 40, 168 40 S 232 26, 244 22"
          fill="none"
          stroke="url(#route)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="6 6"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1.4s" repeatCount="indefinite" />
        </path>
        {/* pickup pin */}
        <g transform="translate(22,74)">
          <circle r="9" fill="#fff" stroke={WA_GREEN} strokeWidth="2" />
          <circle r="3.5" fill={WA_GREEN} />
        </g>
        {/* drop pin */}
        <g transform="translate(244,22)">
          <circle r="9" fill={WA_GREEN} />
          <circle r="3.5" fill="#fff" />
        </g>
        {/* moving scooter */}
        <g>
          <circle r="7" fill="#fff" stroke={WA_GREEN} strokeWidth="2">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto"
              path="M28 82 C 80 82, 110 40, 168 40 S 232 26, 244 22" />
          </circle>
          <text fontSize="9" textAnchor="middle" dy="3">
            🛵
            <animateMotion dur="3.4s" repeatCount="indefinite"
              path="M28 82 C 80 82, 110 40, 168 40 S 232 26, 244 22" />
          </text>
        </g>
      </svg>
      <div className="absolute top-1.5 right-2 text-[10px] font-bold bg-white/90 rounded-full px-2 py-0.5 shadow-sm" style={{ color: WA_GREEN }}>
        2.5 ק״מ · 8 דק׳
      </div>
    </div>
  );
}

/* Receipt ticks */
function Ticks({ r }: { r: Receipt }) {
  if (r === "sending")
    return <span className="inline-block w-3 h-3 rounded-full border border-black/30 border-t-transparent animate-spin" />;
  if (r === "sent") return <Check className="w-3 h-3" style={{ color: "#8FAAA6" }} />;
  const color = r === "read" ? "#4FC3F7" : "#8FAAA6";
  return <CheckCheck className="w-3 h-3" style={{ color }} />;
}

/* Live-incrementing money counter */
function Money({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className="tabular-nums">₪{v}</span>;
}

const SCRIPT: Item[] = [
  { kind: "system", text: "היום · 10:42" },
  {
    kind: "bubble",
    who: "bot",
    typingMs: 900,
    afterMs: 1400,
    render: () => (
      <>
        <div className="flex items-center gap-1.5 font-bold text-[13.5px]">
          <span className="text-[15px]">🛵</span> עבודה חדשה באזור שלך
        </div>
        <MiniMap />
        <div className="mt-2 space-y-0.5 text-[13px]">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: WA_GREEN }} /> איסוף: <b>דיזנגוף 120, תל אביב</b></div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-black/50" /> מסירה: <b>ז׳בוטינסקי 50, רמת גן</b></div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[12.5px]">
          <span>מעטפה · 2.5 ק״מ</span>
          <span className="font-black text-[15px]" style={{ color: "#0B6B60" }}>₪65</span>
        </div>
      </>
    ),
    action: [{ label: "✅ לקיחה", primary: true }, { label: "דחייה" }],
  },
  {
    kind: "bubble",
    who: "me",
    typingMs: 700,
    afterMs: 900,
    render: () => <>✅ לקיחה</>,
  },
  {
    kind: "bubble",
    who: "bot",
    typingMs: 900,
    afterMs: 1200,
    render: () => (
      <>
        🎯 <b>העבודה שלך!</b>
        <div className="mt-1.5 rounded-lg bg-black/[0.04] p-2 text-[12.5px] space-y-1">
          <div>📞 לקוח: <b>050-***-**24</b></div>
          <div>🧾 מק״ט: <span className="font-mono">#A-8842</span></div>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 font-bold text-[12.5px] px-2.5 py-1 rounded-full text-white" style={{ background: WA_GREEN }}>
          ניווט לאיסוף ↗
        </div>
      </>
    ),
  },
  {
    kind: "bubble",
    who: "me",
    typingMs: 800,
    afterMs: 900,
    render: () => <>הגעתי לנקודת המסירה 📍</>,
  },
  {
    kind: "bubble",
    who: "bot",
    typingMs: 700,
    afterMs: 1100,
    render: () => (
      <>
        מצוין! סמן <b>״הושלם״</b> כדי לשחרר את התשלום:
      </>
    ),
    action: [{ label: "🏁 הושלם", primary: true }],
  },
  { kind: "bubble", who: "me", typingMs: 500, afterMs: 900, render: () => <>🏁 הושלם</> },
  {
    kind: "bubble",
    who: "bot",
    typingMs: 900,
    afterMs: 2000,
    render: () => (
      <>
        <div className="flex items-center gap-2 font-black text-[15px]">
          💰 <Money to={65} /> שולמו לחשבון שלך
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-black/[0.04] py-1.5">
            <div className="text-[10px] text-black/50">זמן</div>
            <div className="text-[12.5px] font-bold">18 דק׳</div>
          </div>
          <div className="rounded-lg bg-black/[0.04] py-1.5">
            <div className="text-[10px] text-black/50">דירוג</div>
            <div className="text-[12.5px] font-bold">⭐ 5.0</div>
          </div>
          <div className="rounded-lg bg-black/[0.04] py-1.5">
            <div className="text-[10px] text-black/50">בונוס</div>
            <div className="text-[12.5px] font-bold" style={{ color: WA_GREEN }}>+₪4</div>
          </div>
        </div>
        <div className="mt-2 text-[11.5px] opacity-70">עבודה נוספת 2 ק״מ ממך — בדרך אליך…</div>
      </>
    ),
  },
];

function PhoneChat({ size = "lg" }: { size?: "sm" | "lg" }) {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeFor = (i: number) => {
    const base = 10 * 60 + 42;
    const mins = base + Math.floor(i / 1.5);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (visible >= SCRIPT.length) return;
    const item = SCRIPT[visible];
    if (item.kind === "system") {
      const t = setTimeout(() => setVisible((v) => v + 1), 500);
      return () => clearTimeout(t);
    }
    setTyping(true);
    const tType = setTimeout(() => {
      setTyping(false);
      setVisible((v) => v + 1);
    }, item.typingMs ?? 900);
    return () => clearTimeout(tType);
  }, [visible]);

  useEffect(() => {
    if (visible < SCRIPT.length) return;
    const t = setTimeout(() => setVisible(0), 4200);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visible, typing]);

  const widthClass =
    size === "sm"
      ? "w-[260px] sm:w-[290px] lg:w-[310px]"
      : "w-[300px] sm:w-[340px] lg:w-[380px]";

  return (
    <div className={`relative ${widthClass} aspect-[9/18.5] rounded-[2.6rem] bg-neutral-900 p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/60 animate-widget-float`}>
      <span className="absolute -right-[2px] top-24 w-[3px] h-10 rounded-l bg-neutral-800" />
      <span className="absolute -left-[2px] top-20 w-[3px] h-6 rounded-r bg-neutral-800" />
      <span className="absolute -left-[2px] top-32 w-[3px] h-12 rounded-r bg-neutral-800" />

      <div className="relative w-full h-full rounded-[2.1rem] overflow-hidden flex flex-col" style={{ background: "#ECE5DD" }}>
        <div className="flex items-center justify-between px-5 py-1.5 text-white text-[10.5px] font-bold shrink-0 relative" style={{ background: "#075E54" }}>
          <span>9:41</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-1 w-20 h-4 rounded-full bg-black" />
          <div className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px] h-2.5">
              <span className="w-[3px] h-1 bg-white rounded-sm" />
              <span className="w-[3px] h-1.5 bg-white rounded-sm" />
              <span className="w-[3px] h-2 bg-white rounded-sm" />
              <span className="w-[3px] h-2.5 bg-white rounded-sm" />
            </span>
            <span className="text-[9px]">5G</span>
            <span className="relative w-5 h-2.5 border border-white rounded-[3px]">
              <span className="absolute inset-y-[1.5px] left-[1.5px] w-3.5 bg-white rounded-[1.5px]" />
              <span className="absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[2px] h-1.5 bg-white rounded-r" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ background: "#075E54" }}>
          <ArrowLeft className="w-4 h-4 text-white/80 shrink-0 rotate-180" />
          <LogoBadge size={34} />
          <div className="flex-1 text-right">
            <div className="text-white font-black text-[14px] leading-tight flex items-center gap-1.5 justify-end">
              בוט העבודות של Goi
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-white/70 text-[10.5px] leading-tight">{typing ? "מקליד…" : "מקוון · שולח לך התאמות"}</div>
          </div>
          <Phone className="w-4 h-4 text-white/80" />
        </div>

        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto p-3 space-y-2"
          style={{
            scrollBehavior: "smooth",
            backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        >
          {SCRIPT.slice(0, visible).map((m, i) => {
            if (m.kind === "system") {
              return (
                <div key={i} className="flex justify-center my-2 animate-[waFade_.3s_ease-out]">
                  <span className="text-[10.5px] px-2.5 py-1 rounded-lg bg-[#E1F3FB] text-black/60 font-semibold shadow-sm">
                    {m.text}
                  </span>
                </div>
              );
            }
            const isMe = m.who === "me";
            const ownIndexFromEnd = SCRIPT.slice(i + 1).filter((x) => x.kind === "bubble" && x.who === "me").length;
            const receipt: Receipt = !isMe
              ? "read"
              : ownIndexFromEnd >= 2
                ? "read"
                : ownIndexFromEnd === 1
                  ? "delivered"
                  : i === visible - 1
                    ? "sent"
                    : "delivered";
            const t = timeFor(i);
            return (
              <div key={i} className={`flex ${isMe ? "justify-start" : "justify-end"} animate-[waBubbleIn_.35s_cubic-bezier(0.2,0.9,0.25,1)]`}>
                <div
                  className={`relative max-w-[86%] rounded-2xl px-2.5 py-2 text-[13.5px] leading-[1.55] shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${isMe ? "rounded-bl-[4px]" : "rounded-br-[4px]"}`}
                  style={{ background: isMe ? "#DCF8C6" : "#FFFFFF", color: INK }}
                >
                  <svg
                    className="absolute bottom-0 w-2.5 h-2.5"
                    style={{ [isMe ? "left" : "right"]: "-6px" } as React.CSSProperties}
                    viewBox="0 0 10 10"
                  >
                    <path d={isMe ? "M10 0 L10 10 L0 10 Z" : "M0 0 L0 10 L10 10 Z"} fill={isMe ? "#DCF8C6" : "#FFFFFF"} />
                  </svg>
                  {m.render({ receipt, time: t })}
                  {m.action && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                      {m.action.map((a) => (
                        <span
                          key={a.label}
                          className={`text-[12px] font-bold text-center py-1.5 rounded-lg transition-transform ${a.primary ? "text-white shadow-sm active:scale-95" : "text-black/70 bg-black/[0.05]"}`}
                          style={a.primary ? { background: WA_GREEN } : {}}
                        >
                          {a.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9.5px] text-black/40">
                    <span className="tabular-nums">{t}</span>
                    {isMe && <Ticks r={receipt} />}
                  </div>
                </div>
              </div>
            );
          })}

          {typing && SCRIPT[visible]?.kind === "bubble" && (SCRIPT[visible] as Bubble).who === "bot" && (
            <div className="flex justify-end animate-[waFade_.2s_ease-out]">
              <div className="relative bg-white rounded-2xl rounded-br-[4px] px-3 py-2.5 shadow-sm flex gap-1 items-center">
                <svg className="absolute bottom-0 -right-1.5 w-2.5 h-2.5" viewBox="0 0 10 10">
                  <path d="M0 0 L0 10 L10 10 Z" fill="#FFFFFF" />
                </svg>
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-[waDot_1s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-[waDot_1s_infinite_.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-[waDot_1s_infinite_.3s]" />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-2 flex items-center gap-2" style={{ background: "#F0F0F0" }}>
          <div className="flex-1 h-9 rounded-full bg-white px-3 flex items-center text-[12.5px] text-black/40">
            הקלד הודעה…
          </div>
          <span className="w-9 h-9 rounded-full grid place-items-center text-white shadow-md" style={{ background: WA_GREEN }}>
            <WhatsAppIcon className="w-4 h-4" />
          </span>
        </div>
      </div>
      <style>{`
        @keyframes waBubbleIn { 0% { opacity: 0; transform: translateY(8px) scale(.96); } 60% { transform: translateY(-1px) scale(1.01); } 100% { opacity: 1; transform: none; } }
        @keyframes waFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes waDot { 0%, 60%, 100% { transform: translateY(0); opacity: .5 } 30% { transform: translateY(-3px); opacity: 1 } }
      `}</style>
    </div>
  );
}

/* ============ Rotating offers data ============ */
type FixedOffer = {
  type: "fixed";
  title: string;
  from: string;
  to: string;
  km: string;
  tag: string;
  price: number;
  time: string;
};
type TenderOffer = {
  type: "tender";
  title: string;
  from: string;
  to: string;
  km: string;
  tag: string;
  myPrice: number;
  range: string;
  bids: number;
  time: string;
};
type Offer = FixedOffer | TenderOffer;

const OFFERS: Offer[] = [
  { type: "fixed", title: "משלוח חבילה", from: "רמת גן", to: "הרצליה", km: "2.5", tag: "איסוף מיידי", price: 65, time: "10:42" },
  { type: "tender", title: "הובלת רהיט", from: "באר שבע", to: "אשדוד", km: "62", tag: "הלקוח יבחר את הזוכה", myPrice: 210, range: "180–240", bids: 4, time: "10:44" },
  { type: "fixed", title: "הובלת ספה דו-מושבית", from: "גבעתיים", to: "חולון", km: "9", tag: "עם עוזר · קומה 2", price: 280, time: "10:58" },
  { type: "tender", title: "משלוח ציוד לאירוע", from: "תל אביב", to: "כפר סבא", km: "22", tag: "דחוף · עד 18:00", myPrice: 140, range: "110–170", bids: 3, time: "11:12" },
  { type: "fixed", title: "זר פרחים לחתונה", from: "תל אביב", to: "רעננה", km: "18", tag: "עדין · שביר", price: 95, time: "11:05" },
  { type: "tender", title: "הובלת מקרר", from: "חיפה", to: "עכו", km: "24", tag: "קומה 3 · עם עוזר", myPrice: 340, range: "300–380", bids: 6, time: "11:18" },
  { type: "fixed", title: "הובלת מכונת כביסה", from: "ראשל״צ", to: "בת ים", km: "11", tag: "פירוק והתקנה", price: 220, time: "11:24" },
  { type: "fixed", title: "איסוף מרשם", from: "סופר-פארם", to: "רמת החייל", km: "1.2", tag: "דחוף · עד 30 דק׳", price: 35, time: "11:31" },
  { type: "tender", title: "משלוח חבילות סיטונאי", from: "מודיעין", to: "ירושלים", km: "31", tag: "8 נקודות פיזור", myPrice: 260, range: "220–300", bids: 5, time: "11:39" },
  { type: "tender", title: "הובלת דירה 3 חדרים", from: "פתח תקווה", to: "רחובות", km: "38", tag: "עם פסנתר", myPrice: 850, range: "700–950", bids: 3, time: "11:47" },
];

function useOfferCycle(interval = 4200) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % OFFERS.length), interval);
    return () => clearInterval(t);
  }, [interval]);
  return {
    idx,
    current: OFFERS[idx],
    next: OFFERS[(idx + 1) % OFFERS.length],
  };
}

function WABotDemo() {
  const cycle = useOfferCycle();

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ background: "white" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 60% at 15% 20%, rgba(37,211,102,0.10), transparent 60%), radial-gradient(60% 50% at 90% 80%, rgba(15,157,88,0.08), transparent 60%)",
          }}
        />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-[26px] sm:text-[34px] lg:text-[42px] font-black leading-[1.15]" style={{ color: INK }}>
            כל עבודה מגיעה גם ל<span style={{ color: WA_GREEN }}>וואטסאפ</span> וגם ל<span style={{ color: WA_GREEN }}>אפליקציה</span>.
          </h2>
          <p className="mt-4 text-[15.5px] sm:text-[17px] text-black/70 leading-[1.7]">
            שתי דרכים לקבל את העבודה — <b style={{ color: INK }}>מחיר קבוע</b> שאתה מאשר בלחיצה,
            או <b style={{ color: INK }}>מכרז</b> שאתה קובע בו את המחיר שלך.
          </p>

          {/* Legend chips */}
          <div className="mt-6 flex flex-wrap gap-2.5 justify-center">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold border" style={{ background: `${WA_GREEN}12`, borderColor: `${WA_GREEN}33`, color: WA_GREEN }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: WA_GREEN }} />
              מחיר קבוע · אישור בלחיצה
            </span>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold border border-black/15 bg-white" style={{ color: INK }}>
              <span className="w-1.5 h-1.5 rounded-full bg-black/70" />
              מכרז · אתה קובע את המחיר
            </span>
          </div>
        </div>

        {/* Dual phones */}
        <div className="mt-12 grid md:grid-cols-2 gap-8 lg:gap-12 items-start justify-items-center">
          <WhatsAppOffersPhone cycle={cycle} />
          <GoiAppOffersPhone cycle={cycle} />
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {OFFERS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === cycle.idx ? 22 : 6,
                background: i === cycle.idx ? WA_GREEN : "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 bg-white border border-black/10 shadow-sm">
            <span className="flex -space-x-2 space-x-reverse">
              <span className="w-7 h-7 rounded-full grid place-items-center text-white ring-2 ring-white" style={{ background: WA_GREEN }}>
                <WhatsAppIcon className="w-3.5 h-3.5" />
              </span>
              <span className="w-7 h-7 rounded-full grid place-items-center ring-2 ring-white text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#1BA898,#0B6B60)", fontFamily: "var(--font-wordmark)" }}>
                GOI
              </span>
            </span>
            <span className="text-[13px] font-semibold text-black/70">
              אותה עבודה, בשני מקומות — בחר איפה נוח לך להגיב.
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/join"
            className="inline-flex items-center gap-2 rounded-full pl-4 pr-5 h-12 text-[14px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(18,140,126,0.6)] hover:scale-[1.02] transition-transform"
            style={{ background: WA_GREEN }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            הצטרף וקבל עבודות
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes waBubbleIn { 0% { opacity: 0; transform: translateY(8px) scale(.96); } 60% { transform: translateY(-1px) scale(1.01); } 100% { opacity: 1; transform: none; } }
        @keyframes goiPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(18,140,126,0.35); } 50% { box-shadow: 0 0 0 8px rgba(18,140,126,0); } }
        @keyframes goiCaret { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes offerSwap { 0% { opacity: 0; transform: translateY(10px) scale(.98); } 100% { opacity: 1; transform: none; } }
      `}</style>
    </section>
  );
}

/* ============ Reusable offer card contents ============ */
function FixedPriceOffer({ offer, inWhatsApp = false }: { offer: FixedOffer; inWhatsApp?: boolean }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: WA_GREEN }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: WA_GREEN, animation: "goiPulse 1.6s infinite" }} />
          מחיר קבוע
        </span>
        <span className="text-[10px] text-black/40 font-medium">לפני רגע</span>
      </div>
      <div className="text-[13.5px] font-bold" style={{ color: INK }}>{offer.title} · {offer.from} ← {offer.to}</div>
      <div className="text-[10.5px] text-black/50 mt-0.5">{offer.km} ק״מ · {offer.tag}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[22px] font-black" style={{ color: INK }}>₪{offer.price}</span>
        <span className="text-[11px] text-black/45 font-semibold">מחיר סופי לשליח</span>
      </div>
      <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2">
        <button className="h-10 rounded-xl text-white text-[13px] font-black shadow-[0_8px_18px_-6px_rgba(18,140,126,0.55)]" style={{ background: WA_GREEN, animation: "goiPulse 2s infinite" }}>
          ✓ לקיחה
        </button>
        <button className={`h-10 rounded-xl text-[13px] font-bold border ${inWhatsApp ? "bg-white border-black/10 text-black/60" : "bg-black/[0.04] border-black/10 text-black/60"}`}>
          דחייה
        </button>
      </div>
    </div>
  );
}

function TenderOfferCard({ offer, inWhatsApp = false }: { offer: TenderOffer; inWhatsApp?: boolean }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-black/70">
          <span className="w-1.5 h-1.5 rounded-full bg-black/70" />
          מכרז פתוח
        </span>
        <span className="text-[10px] text-black/40 font-medium">{offer.bids} הצעות עד כה</span>
      </div>
      <div className="text-[13.5px] font-bold" style={{ color: INK }}>{offer.title} · {offer.from} ← {offer.to}</div>
      <div className="text-[10.5px] text-black/50 mt-0.5">{offer.km} ק״מ · {offer.tag}</div>
      <div className="mt-3">
        <label className="text-[10.5px] font-bold text-black/55">המחיר שלי</label>
        <div className={`mt-1 h-11 rounded-xl border ${inWhatsApp ? "bg-white border-black/10" : "bg-white border-black/12"} flex items-center px-3 gap-2`}>
          <span className="text-[16px] font-black text-black/40">₪</span>
          <span className="text-[17px] font-black" style={{ color: INK }}>{offer.myPrice}</span>
          <span className="inline-block w-[2px] h-4 bg-black/70" style={{ animation: "goiCaret 1s infinite" }} />
          <span className="mr-auto text-[10.5px] text-black/40 font-semibold">טווח לקוח: ₪{offer.range}</span>
        </div>
      </div>
      <button className="mt-3 w-full h-10 rounded-xl text-white text-[13px] font-black" style={{ background: INK }}>
        שלח הצעה למכרז
      </button>
    </div>
  );
}

function OfferCardContent({ offer, inWhatsApp = false }: { offer: Offer; inWhatsApp?: boolean }) {
  return offer.type === "fixed"
    ? <FixedPriceOffer offer={offer} inWhatsApp={inWhatsApp} />
    : <TenderOfferCard offer={offer} inWhatsApp={inWhatsApp} />;
}

/* ============ Phone frames ============ */
function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-3 right-4 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-black bg-white border border-black/10 shadow-sm" style={{ color: INK }}>
          {label}
        </span>
      </div>
      <div className="relative w-[300px] sm:w-[320px] rounded-[2.4rem] p-2.5 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.35)]" style={{ background: "linear-gradient(180deg,#1a1a1a,#0a0a0a)" }}>
        <div className="rounded-[2rem] overflow-hidden bg-white" style={{ height: 640 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

type Cycle = ReturnType<typeof useOfferCycle>;

function WhatsAppOffersPhone({ cycle }: { cycle: Cycle }) {
  const { current, next, idx } = cycle;
  return (
    <PhoneFrame label="וואטסאפ">
      <div className="h-full flex flex-col" style={{ background: "#ECE5DD" }}>
        {/* WA header */}
        <div className="shrink-0 px-3 py-2.5 flex items-center gap-2.5" style={{ background: WA_GREEN }}>
          <div className="w-9 h-9 rounded-full bg-white/15 grid place-items-center text-white text-[11px] font-black" style={{ fontFamily: "var(--font-wordmark)" }}>GOI</div>
          <div className="flex-1 text-white">
            <div className="text-[13px] font-black leading-tight">GOI Bot</div>
            <div className="text-[10.5px] opacity-80">מחובר · שולח עבודות</div>
          </div>
          <WhatsAppIcon className="w-4 h-4 text-white/90" />
        </div>

        {/* Chat body */}
        <div className="flex-1 overflow-hidden px-3 py-3 space-y-3" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-black/50 bg-white/70 rounded-full px-2.5 py-0.5">היום</span>
          </div>

          {/* Current offer bubble */}
          <div key={`cur-${idx}`} className="max-w-[92%] mr-auto" style={{ animation: "offerSwap .5s ease both" }}>
            <div className="bg-white rounded-2xl rounded-tr-sm p-3 shadow-sm">
              <OfferCardContent offer={current} inWhatsApp />
              <div className="mt-1.5 text-[9.5px] text-black/35 text-left">{current.time}</div>
            </div>
          </div>

          {/* Next offer preview (compact) */}
          <div key={`nxt-${idx}`} className="max-w-[82%] mr-auto" style={{ animation: "offerSwap .6s .2s ease both" }}>
            <div className="bg-white rounded-2xl rounded-tr-sm p-2.5 shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: next.type === "fixed" ? WA_GREEN : INK }} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: next.type === "fixed" ? WA_GREEN : "rgba(0,0,0,0.7)" }}>
                  {next.type === "fixed" ? "מחיר קבוע" : "מכרז"} · חדש
                </div>
                <div className="text-[11.5px] font-bold truncate" style={{ color: INK }}>
                  {next.title} · {next.from} ← {next.to}
                </div>
              </div>
              <span className="text-[11px] font-black shrink-0" style={{ color: INK }}>
                {next.type === "fixed" ? `₪${next.price}` : `${next.bids} הצעות`}
              </span>
            </div>
          </div>
        </div>

        {/* WA input */}
        <div className="shrink-0 p-2 flex items-center gap-2" style={{ background: "#F0F0F0" }}>
          <div className="flex-1 h-9 rounded-full bg-white px-3 flex items-center text-[12px] text-black/40">הקלד הודעה…</div>
          <span className="w-9 h-9 rounded-full grid place-items-center text-white shadow-md" style={{ background: WA_GREEN }}>
            <WhatsAppIcon className="w-4 h-4" />
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}

function GoiAppOffersPhone({ cycle }: { cycle: Cycle }) {
  const { current, next, idx } = cycle;
  const isFixed = current.type === "fixed";
  const pinColor = isFixed ? WA_GREEN : INK;
  const pinLabel = isFixed ? `₪${current.price}` : "מכרז";

  return (
    <PhoneFrame label="אפליקציית GOI">
      <div className="h-full flex flex-col bg-[#F7F6F2]">
        {/* App header */}
        <div className="shrink-0 px-4 pt-3 pb-3" style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-white text-[10px] font-black shadow shrink-0" style={{ background: "linear-gradient(135deg,#1BA898,#0B6B60)", fontFamily: "var(--font-wordmark)" }}>GOI</span>
              <div className="min-w-0">
                <div className="text-[13px] font-black truncate" style={{ color: INK }}>עבודות בשבילך</div>
                <div className="text-[10.5px] text-black/50 truncate">אזור: תל אביב · פעיל</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black shrink-0" style={{ background: `${WA_GREEN}18`, color: WA_GREEN }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: WA_GREEN, animation: "goiPulse 1.6s infinite" }} />
              LIVE
            </span>
          </div>
          {/* Tabs */}
          <div className="mt-3 flex gap-1.5 text-[11.5px] font-bold">
            <span className="px-3 py-1.5 rounded-full bg-black/[0.06] text-black/60">רשימה</span>
            <span className="px-3 py-1.5 rounded-full text-white inline-flex items-center gap-1.5" style={{ background: WA_GREEN }}>
              <MapPin className="w-3 h-3" /> מפה · 2
            </span>
            <span className="px-3 py-1.5 rounded-full bg-black/[0.06] text-black/60">מכרזים</span>
          </div>
        </div>

        {/* Map + floating offer cards */}
        <div className="relative flex-1 overflow-hidden">
          {/* Map background */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#E8F1EC 0%,#DDECE2 100%)" }} />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 400" preserveAspectRatio="none" aria-hidden>
            <g stroke="rgba(255,255,255,0.9)" strokeWidth="6" fill="none" strokeLinecap="round">
              <path d="M-20 80 L340 60" />
              <path d="M-20 160 L340 180" />
              <path d="M-20 260 L340 240" />
              <path d="M-20 340 L340 360" />
            </g>
            <g stroke="rgba(255,255,255,0.9)" strokeWidth="5" fill="none" strokeLinecap="round">
              <path d="M60 -20 L80 420" />
              <path d="M170 -20 L160 420" />
              <path d="M260 -20 L270 420" />
            </g>
            <ellipse cx="220" cy="120" rx="55" ry="35" fill="rgba(18,140,126,0.14)" />
            <ellipse cx="55" cy="300" rx="45" ry="30" fill="rgba(18,140,126,0.10)" />
            <path d="M95 130 C 140 150, 180 200, 215 265" stroke={pinColor} strokeWidth="2.5" strokeDasharray="5 5" fill="none" opacity="0.55" />
          </svg>

          {/* Active pin — reflects current offer */}
          <div key={`pinA-${idx}`} className="absolute" style={{ top: "22%", right: "62%", animation: "offerSwap .4s ease both" }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-full" style={{ animation: "goiPulse 1.8s infinite", background: pinColor, opacity: 0.35, width: 38, height: 38, transform: "translate(-5px,-5px)" }} />
              <div className="relative min-w-[32px] h-8 px-2 rounded-full grid place-items-center text-white text-[10px] font-black shadow-lg ring-2 ring-white" style={{ background: pinColor }}>
                {pinLabel}
              </div>
              <div className="mx-auto w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent" style={{ borderTopColor: pinColor }} />
            </div>
          </div>

          {/* Secondary pin — reflects next offer */}
          <div key={`pinB-${idx}`} className="absolute" style={{ top: "58%", right: "28%", animation: "offerSwap .5s .1s ease both" }}>
            <div className="relative">
              <div className="relative min-w-[30px] h-7 px-2 rounded-full grid place-items-center text-white text-[9.5px] font-black shadow-lg ring-2 ring-white opacity-90" style={{ background: next.type === "fixed" ? WA_GREEN : INK }}>
                {next.type === "fixed" ? `₪${next.price}` : "מכרז"}
              </div>
              <div className="mx-auto w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent" style={{ borderTopColor: next.type === "fixed" ? WA_GREEN : INK }} />
            </div>
          </div>

          {/* "you are here" marker */}
          <div className="absolute" style={{ top: "40%", right: "45%" }}>
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/25" />
          </div>

          {/* Bottom-sheet — expanded current + peek next */}
          <div className="absolute inset-x-0 bottom-0 px-2.5 pt-2 pb-2.5">
            <div className="mx-2 rounded-t-2xl bg-white/85 backdrop-blur border border-black/5 border-b-0 px-3 py-2 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-black min-w-0" style={{ color: INK }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: next.type === "fixed" ? WA_GREEN : "rgba(0,0,0,0.7)" }} />
                <span className="truncate">{next.type === "fixed" ? "מחיר קבוע" : "מכרז"} · {next.title}</span>
              </span>
              <span className="text-black/50 font-semibold shrink-0">הבא ↑</span>
            </div>
            <div key={`sheet-${idx}`} className="rounded-2xl bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.25)] border border-black/5 p-3" style={{ animation: "offerSwap .5s ease both" }}>
              <div className="flex justify-center mb-1.5">
                <span className="w-9 h-1 rounded-full bg-black/15" />
              </div>
              <OfferCardContent offer={current} />
            </div>
          </div>
        </div>

        {/* Bottom nav — 5 tabs */}
        <div className="shrink-0 grid grid-cols-5 border-t border-black/5 bg-white">
          {[
            { l: "איזור אישי", Icon: User },
            { l: "רווחים", Icon: Wallet },
            { l: "עבודות", Icon: Package, active: true },
            { l: "צ׳אט", Icon: MessageCircle },
            { l: "פעילות", Icon: Activity },
          ].map((n) => (
            <div
              key={n.l}
              className="relative py-2 grid place-items-center gap-0.5"
              style={n.active ? { color: WA_GREEN } : { color: "rgba(0,0,0,0.42)" }}
            >
              {n.active && <span className="absolute top-0 inset-x-4 h-[2.5px] rounded-full" style={{ background: WA_GREEN }} />}
              <n.Icon className="w-[18px] h-[18px]" strokeWidth={n.active ? 2.3 : 2} />
              <span className="text-[9.5px] font-bold leading-none">{n.l}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}


/* ============ NETWORK HUB visualization — Dynamic engine hub ============ */
function NetworkHub() {
  const senders = [
    { label: "מסעדות ובתי קפה", Icon: UtensilsCrossed },
    { label: "חנויות פרחים", Icon: Flower2 },
    { label: "בתי מרקחת", Icon: Pill },
    { label: "לקוחות פרטיים", Icon: Home },
    { label: "עסקים ומשרדים", Icon: Building2 },
  ];
  const couriers = [
    { label: "אופנוע / קטנוע", Icon: Bike },
    { label: "רכב פרטי", Icon: Car },
    { label: "טנדר / משאית", Icon: Truck },
    { label: "אופניים חשמליים", Icon: Zap },
    { label: "צוות מובילים", Icon: Users },
  ];

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ background: CANVAS }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <div className="text-[13px] font-bold uppercase tracking-widest mb-3" style={{ color: WA_GREEN }}>
            איפה אתה במפה
          </div>
          <h2 className="text-[26px] sm:text-[34px] lg:text-[46px] font-black leading-[1.15]" style={{ color: INK }}>
            אלפי עבודות ביום.<br />
            <span style={{ color: WA_GREEN }}>נשלחות רק למי שמתאים.</span>
          </h2>
          <p className="mt-4 text-[15px] sm:text-[17px] text-black/60 leading-relaxed">
            הבוט שלנו מחבר בין צרכי השוק לזמינות שלך בזמן אמת, כדי להבטיח רווחיות מקסימלית לכל נסיעה.
          </p>
        </div>

        {/* Matching Engine */}
        <div className="relative w-full grid grid-cols-1 lg:grid-cols-11 items-center gap-8">
          {/* Right — senders */}
          <div className="lg:col-span-4 flex flex-col gap-3 z-10 order-2 lg:order-1">
            <div className="text-[11.5px] font-black uppercase tracking-widest text-black/40 mb-1 px-4 text-center lg:text-right">
              מי שולח עבודות
            </div>
            {senders.map(({ label, Icon }, i) => (
              <div
                key={label}
                className="bg-white border border-black/[0.05] shadow-[0_2px_6px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-[0_12px_28px_-10px_rgba(18,140,126,0.28)] hover:border-[color:var(--brand)]/20 hover:-translate-y-0.5 group"
                style={{ ["--brand" as string]: WA_GREEN, animation: `card-in .5s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both` }}
              >
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center transition-colors shrink-0"
                  style={{ background: `${WA_GREEN}0F`, color: WA_GREEN }}
                >
                  <Icon className="w-5 h-5 transition-colors group-hover:text-white" strokeWidth={2} />
                </div>
                <span className="font-bold text-[14.5px]" style={{ color: INK }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Center — router hub */}
          <div className="lg:col-span-3 relative flex flex-col items-center justify-center order-1 lg:order-2 py-6 lg:py-0 min-h-[280px]">
            {/* Rotating rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="absolute w-64 h-64 rounded-full border-2 border-dashed animate-[spin_20s_linear_infinite]"
                style={{ borderColor: `${WA_GREEN}20` }}
              />
              <div
                className="absolute w-48 h-48 rounded-full border-2 border-dashed animate-[spin_12s_linear_infinite_reverse]"
                style={{ borderColor: `${WA_GREEN}33` }}
              />
              <div
                className="absolute w-32 h-32 rounded-full animate-pulse"
                style={{ background: `${WA_GREEN}0D` }}
              />
            </div>

            {/* Central chip */}
            <div className="relative z-20 flex flex-col items-center">
              <div
                className="bg-white/85 backdrop-blur-md border-2 p-6 rounded-3xl shadow-[0_20px_50px_-15px_rgba(18,140,126,0.35)] flex flex-col items-center text-center w-44 transition-transform hover:scale-105"
                style={{ borderColor: WA_GREEN }}
              >
                <div
                  className="w-12 h-12 rounded-full grid place-items-center mb-3"
                  style={{ background: WA_GREEN, boxShadow: `0 8px 20px -6px ${WA_GREEN}80` }}
                >
                  <Radio className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: WA_GREEN }}>
                  GOI Bot Router
                </span>
                <div className="text-[26px] font-black mt-1 leading-none" style={{ color: INK }}>
                  1,240
                </div>
                <span className="text-[11px] font-bold text-black/40 mt-1">עבודות היום</span>
              </div>

              {/* Live status pill */}
              <div
                className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: `${WA_GREEN}1A` }}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: WA_GREEN }} />
                  <span className="relative size-1.5 rounded-full" style={{ background: WA_GREEN }} />
                </span>
                <span className="text-[10px] font-black tracking-wide" style={{ color: WA_GREEN }}>
                  סנכרון פעיל
                </span>
              </div>
            </div>

            {/* Flow lines (desktop) */}
            <svg
              className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: "visible" }}
              aria-hidden
            >
              <style>{`
                @keyframes hub-dash { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
                .hub-flow { stroke: ${WA_GREEN}; stroke-width: 1.5; stroke-dasharray: 6 12; stroke-opacity: 0.18; animation: hub-dash 8s linear infinite; }
              `}</style>
              <path d="M-150,50  Q-50,50  0,250"  className="hub-flow" fill="none" />
              <path d="M-150,150 Q-50,150 0,250"  className="hub-flow" fill="none" />
              <path d="M-150,350 Q-50,350 0,250"  className="hub-flow" fill="none" />
              <path d="M400,250  Q450,50  550,50"  className="hub-flow" fill="none" />
              <path d="M400,250  Q450,150 550,150" className="hub-flow" fill="none" />
              <path d="M400,250  Q450,350 550,350" className="hub-flow" fill="none" />
            </svg>
          </div>

          {/* Left — couriers */}
          <div className="lg:col-span-4 flex flex-col gap-3 z-10 order-3">
            <div className="text-[11.5px] font-black uppercase tracking-widest text-black/40 mb-1 px-4 text-center lg:text-right">
              מי מבצע — אתה
            </div>
            {couriers.map(({ label, Icon }, i) => (
              <div
                key={label}
                className="bg-white border border-black/[0.05] shadow-[0_2px_6px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-[0_12px_28px_-10px_rgba(18,140,126,0.28)] hover:border-[color:var(--brand)]/20 hover:-translate-y-0.5 group"
                style={{ ["--brand" as string]: WA_GREEN, animation: `card-in .5s cubic-bezier(0.16,1,0.3,1) ${i * 0.07 + 0.2}s both` }}
              >
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center transition-colors shrink-0"
                  style={{ background: `${WA_GREEN}0F`, color: WA_GREEN }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span className="font-bold text-[14.5px]" style={{ color: INK }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-14 rounded-2xl px-6 sm:px-8 py-4 text-center max-w-3xl"
          style={{ background: `${WA_GREEN}0D`, border: `1px solid ${WA_GREEN}1F` }}
        >
          <p className="text-[13.5px] sm:text-[14.5px] text-black/70 font-medium leading-relaxed">
            כל עבודה מגיעה רק ל־
            <span className="font-black" style={{ color: WA_GREEN }}>3–5 שליחים</span>
            {" "}רלוונטיים בו־זמנית
            <span className="mx-2 opacity-30">·</span>
            <span className="font-bold" style={{ color: INK }}>הראשון שאישר — לוקח</span>
          </p>
        </div>
      </div>
    </section>
  );
}


/* ============ COMPARISON: GOI vs חברת שליחויות vs Wolt ============ */
function ComparisonTable() {
  const rows = [
    { label: "עמלה שהמפעיל לוקח", goi: "15–20%", legacy: "30–40%", wolt: "35%+" },
    { label: "מתי מקבלים את הכסף", goi: "מיד לחשבון", legacy: "30–60 יום", wolt: "שבועי" },
    { label: "חופש לבחור עבודות", goi: "כן — אתה מחליט", legacy: "מוגבל", wolt: "בקושי" },
    { label: "משמרות מחייבות", goi: "אין", legacy: "יש", wolt: "יש" },
    { label: "צוות אנושי בוואטסאפ", goi: "24/7", legacy: "מוקד", wolt: "צ׳אט אוטומטי" },
    { label: "אפליקציה נפרדת", goi: "לא — בוואטסאפ", legacy: "כן", wolt: "כן — כבדה" },
    { label: "עונש על סירוב עבודה", goi: "אין", legacy: "יש", wolt: "יורד לך המדרג" },
  ];
  return (
    <section className="relative py-16 sm:py-20 lg:py-24" style={{ background: "white" }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: WA_GREEN }}>למה דווקא אצלנו</div>
          <h2 className="text-[26px] sm:text-[34px] lg:text-[44px] font-black leading-[1.15]" style={{ color: INK }}>
            השוואה כנה. <span style={{ color: WA_GREEN }}>אתה תחליט.</span>
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16.5px] text-black/65">
            אנחנו לא חברת שליחויות. אנחנו הפלטפורמה שמחזירה לך את השליטה.
          </p>
        </div>

        {/* Mobile — stacked cards, one row per criterion */}
        <div className="sm:hidden space-y-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className="rounded-2xl border border-black/[0.08] bg-white shadow-[0_6px_20px_-12px_rgba(0,0,0,0.15)] overflow-hidden"
            >
              <div className="px-4 py-3 bg-black/[0.03] border-b border-black/[0.06] text-[13.5px] font-bold text-black/80">
                {r.label}
              </div>
              <div className="divide-y divide-black/[0.06]">
                <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "rgba(16,185,129,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: WA_GREEN }}>GOI</span>
                    <span className="text-[10.5px] font-bold text-black/50">אנחנו</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-black text-[14px]" style={{ color: "#0B6B60" }}>
                    <Check className="w-4 h-4" strokeWidth={3} /> {r.goi}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[11.5px] font-bold text-black/45">חב׳ שליחויות</span>
                  <span className="text-[13px] text-black/70">{r.legacy}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[11.5px] font-bold text-black/45">Wolt / דומות</span>
                  <span className="text-[13px] text-black/70">{r.wolt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet & desktop — full comparison grid */}
        <div className="hidden sm:block rounded-[2rem] overflow-hidden border border-black/[0.08] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)]">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] text-[13.5px] sm:text-[14px]">
            {/* Header */}
            <div className="p-4 lg:p-5 font-bold text-black/50 bg-black/[0.02]">קריטריון</div>
            <div className="p-4 lg:p-5 text-center font-black text-white relative" style={{ background: WA_GREEN }}>
              <div className="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">אנחנו</div>
              GOI
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-300 text-black text-[10px] font-black px-2 py-0.5 rounded-full">מומלץ</span>
            </div>
            <div className="p-4 lg:p-5 text-center font-black text-black/70 bg-black/[0.02]">
              <div className="text-[10px] uppercase tracking-widest text-black/40 mb-0.5">מסורתי</div>
              חב׳ שליחויות
            </div>
            <div className="p-4 lg:p-5 text-center font-black text-black/70 bg-black/[0.02]">
              <div className="text-[10px] uppercase tracking-widest text-black/40 mb-0.5">אפליקציה</div>
              Wolt / דומות
            </div>

            {/* Rows */}
            {rows.map((r, i) => (
              <React.Fragment key={r.label}>
                <div className={`p-4 lg:p-5 font-semibold text-black/80 border-t border-black/[0.06] ${i % 2 ? "bg-black/[0.015]" : ""}`}>{r.label}</div>
                <div className={`p-4 lg:p-5 text-center font-black border-t border-black/[0.06] ${i % 2 ? "bg-emerald-50/60" : "bg-emerald-50/40"}`} style={{ color: "#0B6B60" }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4" strokeWidth={3} /> {r.goi}
                  </span>
                </div>
                <div className={`p-4 lg:p-5 text-center text-black/65 border-t border-black/[0.06] ${i % 2 ? "bg-black/[0.015]" : ""}`}>{r.legacy}</div>
                <div className={`p-4 lg:p-5 text-center text-black/65 border-t border-black/[0.06] ${i % 2 ? "bg-black/[0.015]" : ""}`}>{r.wolt}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 text-yellow-900 px-4 py-2 text-[13px] font-black">
            <TrendingUp className="w-4 h-4" />
            שליחים ברשת מדווחים על הכנסה גבוהה ב־25%–40% אחרי מעבר ל־Goi.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ TESTIMONIALS MARQUEE ============ */
const REVIEWS = [
  {
    name: "יבגני ל.",
    role: "שליח קטנוע · מרכז",
    tenure: "שנה ב־Goi",
    img: personAvi,
    text: "עברתי מ־Wolt ל־Goi ולא מסתכל אחורה. עמלה נמוכה, הצוות באמת עוזר, ההכנסה עלתה ב־30%.",
    stars: 5,
  },
  {
    name: "משה ב.",
    role: "מוביל טנדר · שרון",
    tenure: "8 חודשים",
    img: personMoshe,
    text: "אני עובד לבד עם טנדר, ומקבל בדיוק את ההובלות שמתאימות לי. בלי לפרסם, בלי לרדוף אחרי לקוחות.",
    stars: 5,
  },
  {
    name: "יוסי ק.",
    role: "רכב פרטי · דרום",
    tenure: "חצי שנה",
    img: personYossi,
    text: "הכי אהבתי שאני בוחר מתי לעבוד. בבוקר משמרת קצרה, בערב עוד שעתיים — וזהו, הרווחתי יופי.",
    stars: 5,
  },
  {
    name: "נועה ש.",
    role: "אופניים חשמליים · ת״א",
    tenure: "4 חודשים",
    img: personNoa,
    text: "הבוט חוסך לי שעות. אני מקבלת רק עבודות של 2 ק״מ מסביבי, לוקחת מה שמסתדר לי — וזהו.",
    stars: 5,
  },
  {
    name: "שירה ר.",
    role: "צוות מובילים · חיפה",
    tenure: "שנתיים",
    img: personShira,
    text: "אנחנו צוות של 3 עם משאית. Goi מביאה לנו הובלות דירה קבועות ב־2 סופ״שים בחודש. יציב, אמין, משלמים בזמן.",
    stars: 5,
  },
  {
    name: "אבי ד.",
    role: "אופנוע · ירושלים",
    tenure: "10 חודשים",
    img: personAvi,
    text: "אין אפליקציה כבדה, אין מסלולים מטופשים. שיחת וואטסאפ אחת ואני בדרך. הכי פשוט שיכול להיות.",
    stars: 5,
  },
];

function TestimonialsMarquee() {
  const doubled = [...REVIEWS, ...REVIEWS];
  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden" style={{ background: CANVAS }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: WA_GREEN }}>מה חברי הרשת אומרים</div>
          <h2 className="text-[26px] sm:text-[34px] lg:text-[44px] font-black leading-[1.15]" style={{ color: INK }}>
            500+ שליחים ומובילים. <span style={{ color: WA_GREEN }}>ממוצע דירוג 4.9.</span>
          </h2>
        </div>

        <div className="flex items-center justify-center gap-6 lg:gap-10 mb-8 flex-wrap">
          {[
            { n: "500+", t: "שליחים ומובילים פעילים" },
            { n: "4.9★", t: "דירוג ממוצע לרשת" },
            { n: "24/7", t: "צוות אנושי בוואטסאפ" },
            { n: "0₪", t: "דמי הרשמה או מנוי" },
          ].map((s) => (
            <div key={s.t} className="text-center">
              <div className="text-[26px] lg:text-[30px] font-black" style={{ color: INK }}>{s.n}</div>
              <div className="text-[12px] text-black/55">{s.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10" style={{ background: `linear-gradient(to left, ${CANVAS}, transparent)` }} />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10" style={{ background: `linear-gradient(to right, ${CANVAS}, transparent)` }} />
        <div className="flex gap-4 animate-marquee" style={{ width: "max-content" }}>
          {doubled.map((r, i) => (
            <article
              key={`${r.name}-${i}`}
              className="w-[320px] sm:w-[360px] shrink-0 rounded-3xl bg-white border border-black/5 p-6 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.15)]"
            >
              <div className="flex items-center gap-1 mb-3" style={{ color: "#F59E0B" }}>
                {Array.from({ length: r.stars }).map((_, k) => <Star key={k} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-[14.5px] leading-[1.65] text-black/80 font-medium">"{r.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <img src={r.img} alt={r.name} loading="lazy" className="w-11 h-11 rounded-full object-cover border border-black/5" />
                <div className="text-right">
                  <div className="font-black text-[14px]" style={{ color: INK }}>{r.name}</div>
                  <div className="text-[11.5px] text-black/55">{r.role} · {r.tenure}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 60s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        @keyframes card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </section>
  );
}



/* ============ FAQ ============ */
const FAQ_ITEMS = [
  { q: "האם צריך לשלם דמי הרשמה?", a: "לא. ההצטרפות ל-Goi חינם לחלוטין. אין דמי הרשמה, אין תשלום חודשי, ואין התחייבות." },
  { q: "כמה עמלה Goi גובה?", a: "העמלה שקופה ונמוכה — משתנה לפי סוג המשלוח והאזור. בממוצע 15%-20%, נמוך משמעותית מפלטפורמות אחרות." },
  { q: "מתי מקבלים את הכסף?", a: "תשלום ישיר לחשבון הבנק. אפשר גם למשוך יום למחרת בעמלה קטנה — אתה בוחר." },
  { q: "אילו רכבים מתאימים?", a: "הכל — אופנוע, קטנוע, אופניים חשמליים, רכב פרטי, טנדר, משאית ואפילו צוות הובלות עם עובדים." },
  { q: "מה קורה אם לקוח לא מרוצה?", a: "צוות אנושי זמין 24/7 בוואטסאפ. אנחנו מגבים אותך במקרה של סכסוך, והמשלוח מבוטח." },
  { q: "אני יכול לעבוד רק שעות מסוימות?", a: "בטח. אתה מגדיר מתי אתה זמין, ואם באמצע היום אתה לא זמין — פשוט דוחה. אין קנסות, אין ׳מדרג׳ שנפגע." },
];

function FaqBlock() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-16 sm:py-20 lg:py-28" style={{ background: CANVAS }}>
      {/* Soft background accents */}
      <div
        className="absolute top-10 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-[0.08] pointer-events-none"
        style={{ background: WA_GREEN }}
      />
      <div
        className="absolute bottom-10 left-0 w-[380px] h-[380px] rounded-full blur-3xl opacity-[0.06] pointer-events-none"
        style={{ background: "#35AD29" }}
      />

      <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-[340px_1fr] gap-10 lg:gap-16 items-start">
          {/* Sidebar */}
          <div className="lg:sticky lg:top-24">
            <div
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] font-bold uppercase tracking-wider mb-4"
              style={{ background: "rgba(18,140,126,0.1)", color: WA_GREEN }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              שאלות ותשובות
            </div>
            <h2
              className="text-[30px] sm:text-[38px] lg:text-[46px] font-black leading-[1.1] tracking-tight"
              style={{ color: INK }}
            >
              כל מה ששליחים <br className="hidden lg:block" />
              ומובילים <span style={{ color: WA_GREEN }}>שואלים.</span>
            </h2>
            <p className="mt-4 text-[15px] sm:text-[16px] text-black/60 leading-relaxed">
              לא מצאת תשובה? כתוב לנו בוואטסאפ — צוות אנושי עונה תוך דקות.
            </p>
            <Link
              to="/join"
              className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full text-white text-[14px] font-bold shadow-[0_12px_30px_-10px_rgba(18,140,126,0.55)] hover:scale-[1.02] active:scale-95 transition"
              style={{ background: WA_GREEN }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              דבר איתנו
            </Link>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {FAQ_ITEMS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white border transition-all duration-300"
                  style={{
                    borderColor: isOpen ? "rgba(18,140,126,0.35)" : "rgba(10,30,27,0.08)",
                    boxShadow: isOpen
                      ? "0 18px 40px -20px rgba(18,140,126,0.35)"
                      : "0 2px 10px -6px rgba(10,30,27,0.08)",
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-right"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="grid place-items-center w-9 h-9 rounded-full shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen ? WA_GREEN : "rgba(10,30,27,0.05)",
                        color: isOpen ? "#fff" : INK,
                      }}
                    >
                      <ChevronDown
                        className={`w-4.5 h-4.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                    <span
                      className="flex-1 font-black text-[15.5px] sm:text-[17px] leading-snug"
                      style={{ color: INK }}
                    >
                      {f.q}
                    </span>
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-6 pr-[calc(1.25rem+2.75rem+1rem)] sm:pr-[calc(1.5rem+2.75rem+1rem)] text-[14.5px] sm:text-[15px] text-black/70 leading-[1.75]">
                        {f.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
function FinalCTA() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/10"
          style={{
            background:
              "radial-gradient(120% 90% at 85% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 55%), linear-gradient(160deg, #0B1F1C 0%, #0A1613 60%, #070F0D 100%)",
            boxShadow:
              "0 40px 80px -32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-30"
            style={{ background: "radial-gradient(closest-side, rgba(18,140,126,0.55), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(closest-side, rgba(212,175,110,0.55), transparent 70%)" }}
          />

          <div className="relative flex flex-col items-center px-6 sm:px-10 py-16 md:py-24 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] sm:text-[13px] font-semibold tracking-wide text-white/80 mb-6 backdrop-blur"
              style={{
                borderColor: "rgba(212,175,110,0.35)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "#D4AF6E", boxShadow: "0 0 8px rgba(212,175,110,0.7)" }}
              />
              הצטרפות פתוחה — שליחים ומובילים
            </div>

            <h2
              className="max-w-3xl text-[30px] sm:text-[42px] lg:text-[54px] font-black tracking-tight leading-[1.12] mb-5"
              style={{ color: "#F5F1E8" }}
            >
              מוכן להתחיל לקבל עבודות{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #E8CFA0 0%, #D4AF6E 50%, #B8935A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                בוואטסאפ ובאפליקציה?
              </span>
            </h2>

            <p className="max-w-xl text-[15px] sm:text-[17px] lg:text-[19px] text-white/60 mb-10 font-light leading-relaxed">
              שליחים ומובילים — 2 דקות מילוי פרטים. תוך יום עסקים תהיו בפנים ומקבלים עבודות באזור שלכם.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center items-center">
              <Link
                to="/join"
                className="group relative overflow-hidden w-full sm:w-auto px-9 py-4 rounded-2xl font-bold text-[16px] sm:text-[18px] text-white transition-all hover:scale-[1.02] active:scale-95 inline-flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(180deg, #128C7E 0%, #0E6F64 100%)",
                  boxShadow:
                    "0 14px 34px -12px rgba(18,140,126,0.65), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <WhatsAppIcon className="w-5 h-5" />
                הצטרף עכשיו
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
                />
              </Link>

              <Link
                to="/courier-login"
                className="w-full sm:w-auto px-9 py-4 rounded-2xl font-semibold text-[16px] sm:text-[18px] transition-all active:scale-95 inline-flex items-center justify-center border backdrop-blur hover:bg-white/5"
                style={{
                  borderColor: "rgba(212,175,110,0.4)",
                  color: "#E8CFA0",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                כניסת שליחים ומובילים
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-2 text-white/45 text-[13px]">
              <Handshake className="w-4 h-4" />
              <span>הצטרפות בחינם, בלי התחייבות</span>
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,110,0.5), transparent)" }}
          />
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
function ContactForm() {
  const submit = useServerFn(submitCourierContactLead);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 1) return toast.error("נא להזין שם");
    if (!/^[+\d\s\-()]{6,20}$/.test(trimmedPhone)) return toast.error("מספר טלפון לא תקין");
    setLoading(true);
    try {
      await submit({ data: { name: trimmedName, phone: trimmedPhone, message: message.trim().slice(0, 1000) } });
      toast.success("תודה! ניצור איתך קשר בקרוב");
      setName(""); setPhone(""); setMessage("");
    } catch {
      toast.error("שליחה נכשלה, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2.5" noValidate>
      <div className="grid grid-cols-2 gap-2.5">
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="שם מלא" maxLength={100} required
          className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-[14px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
        />
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="טלפון" maxLength={20} required inputMode="tel"
          className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-[14px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
        />
      </div>
      <textarea
        value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="הודעה (אופציונלי)" maxLength={1000} rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-[14px] focus:outline-none focus:border-white/30 focus:bg-white/10 transition resize-none"
      />
      <button
        type="submit" disabled={loading}
        className="w-full h-11 rounded-xl text-white font-bold text-[14px] transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: WA_GREEN }}
      >
        {loading ? "שולח..." : "שלחו לי פרטים"}
      </button>
    </form>
  );
}

function Footer() {
  return (
    <footer className="relative text-white" style={{ background: INK }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 py-10 lg:py-14 grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2.5">
            <LogoBadge />
            <span className="text-[24px] tracking-[-0.02em]" style={{ fontFamily: "var(--font-wordmark)", fontWeight: 800 }}>
              Goi
            </span>
          </div>
          <p className="mt-3 text-[14px] text-white/60 leading-[1.6] max-w-sm">
            הפלטפורמה של השליחים והמובילים בישראל. עבודות בוואטסאפ, תשלום מהיר, בלי אפליקציות.
          </p>
        </div>

        <div className="md:col-span-2">
          <div className="text-[13px] font-black uppercase tracking-wider mb-3 text-white/50">קישורים</div>
          <ul className="space-y-2 text-[14px]">
            <li><a href="#how" className="hover:text-white text-white/70 transition">איך זה עובד</a></li>
            <li><a href="#benefits" className="hover:text-white text-white/70 transition">היתרונות</a></li>
            <li><a href="#earnings" className="hover:text-white text-white/70 transition">כמה מרוויחים</a></li>
            <li><a href="#faq" className="hover:text-white text-white/70 transition">שאלות נפוצות</a></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="text-[13px] font-black uppercase tracking-wider mb-3 text-white/50">חשבון</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link to="/join" className="hover:text-white text-white/70 transition">הרשמה</Link></li>
            <li><Link to="/courier-login" className="hover:text-white text-white/70 transition">כניסת שליחים</Link></li>
            <li><Link to="/business-login" className="hover:text-white text-white/70 transition">כניסת עסקים</Link></li>
            <li><Link to="/customer-login" className="hover:text-white text-white/70 transition">כניסה לפרטיים</Link></li>
            <li><Link to="/" className="hover:text-white text-white/70 transition">חזרה לדף הבית</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <div className="text-[13px] font-black uppercase tracking-wider mb-3 text-white/50">צור קשר מהיר</div>
          <p className="text-[13px] text-white/60 mb-3 leading-[1.5]">
            השאירו פרטים ונחזור אליכם עם כל המידע להצטרפות לרשת.
          </p>
          <ContactForm />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12.5px] text-white/50">
          <div>© {new Date().getFullYear()} Goi · כל הזכויות שמורות</div>
          <div className="flex items-center gap-2" style={{ color: WA_GREEN }}>
            <WhatsAppIcon className="w-3.5 h-3.5" />
            <span className="text-white/50">עבודות בוואטסאפ, ישראל</span>
          </div>
        </div>
      </div>
    </footer>
  );
}


/* ============ PAGE ============ */
function CouriersLanding() {
  return (
    <div dir="rtl" className="min-h-screen w-full antialiased" style={{ ...font, background: CANVAS, color: INK }}>
      <Nav />
      <Hero />
      <WABotDemo />
      <HowItWorks />
      <NetworkHub />
      <Benefits />
      <TwoModes />
      
      <FaqBlock />
      <FinalCTA />
      <Footer />


      <Link
        to="/join"
        className="fixed bottom-6 left-6 z-40 h-14 pl-4 pr-5 rounded-full text-white font-semibold shadow-[0_20px_40px_-10px_rgba(18,140,126,0.55)] flex items-center gap-2 hover:scale-[1.03] active:scale-100 transition"
        style={{ background: WA_GREEN }}
        aria-label="הצטרף לרשת"
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span className="text-[14px]">הצטרפו לרשת</span>
      </Link>
    </div>
  );
}
