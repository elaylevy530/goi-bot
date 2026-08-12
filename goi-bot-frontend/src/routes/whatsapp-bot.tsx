import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Star,
  Check,
  CheckCheck,
  ChevronDown,
  ShieldCheck,
  Clock,
  X,
  Phone,
  ArrowRight,
  Package,
  FileText,
  Sofa,
  Home,
  ShoppingBag,
  Gift,
  Lock,
  CreditCard,
  MessageCircle,
  Zap,
  Users,
  Tag,
  Handshake,
  BadgeCheck,
  HelpCircle,
  Plus,
  Menu,
} from "lucide-react";
import realHero from "@/assets/real-hero.jpg";
import real1 from "@/assets/person-avi.jpg";
import real2 from "@/assets/person-moshe.jpg";
import real3 from "@/assets/real-3.jpg";
import real4 from "@/assets/real-4.jpg";
import real5 from "@/assets/real-5.jpg";
import personNoa from "@/assets/person-noa.jpg";
import personYossi from "@/assets/person-yossi.jpg";
import personShira from "@/assets/person-shira.jpg";
import svcPackage from "@/assets/svc-package.jpg";
import svcDocs from "@/assets/svc-docs.jpg";
import svcGift from "@/assets/svc-gift.jpg";
import svcStore from "@/assets/svc-store.jpg";
import svcSmallMove from "@/assets/svc-small-move.jpg";
import svcHomeMove from "@/assets/svc-home-move.jpg";
import { partnersUrl } from "@/lib/partners-redirect";

const SITE_URL = "https://goi-bot.lovable.app";

export const Route = createFileRoute("/whatsapp-bot")({
  head: () => ({
    meta: [
      { title: "Goi — משלוחים והובלות בוואטסאפ | מאות שליחים ומובילים בישראל" },
      {
        name: "description",
        content:
          "Goi היא הפלטפורמה שמחברת בין לקוחות פרטיים לרשת של מאות שליחים ומובילים פרטיים בישראל. הזמנה, מחיר, תשלום ומעקב בשיחת וואטסאפ אחת.",
      },
      { property: "og:title", content: "Goi — משלוחים והובלות בשיחת וואטסאפ" },
      {
        property: "og:description",
        content: "הפלטפורמה שמחברת בין לקוחות לרשת של מאות שליחים ומובילים פרטיים בישראל.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: SITE_URL + realHero },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SITE_URL + realHero },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Goi",
          url: SITE_URL,
          image: SITE_URL + realHero,
          description:
            "רשת של מאות שליחים ומובילים פרטיים בישראל — הזמנה, מחיר ותשלום בשיחת וואטסאפ אחת.",
          areaServed: { "@type": "Country", name: "Israel" },
          priceRange: "₪₪",
          address: { "@type": "PostalAddress", addressCountry: "IL" },
        }),
      },
    ],
  }),
  component: LandingPage,
});


const GREEN = "#0F9D58";
const WA_GREEN = "#128C7E";
const WA_HEADER = "#075E54";
const WA_BG = "#ECE5DD";
const WA_BUBBLE_ME = "#DCF8C6";
const INK = "#0A0A0A";
const CANVAS = "#F7F6F2";
const font = { fontFamily: "'Heebo','Assistant',system-ui,sans-serif" };

function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div
      dir="rtl"
      className="min-h-screen w-full antialiased"
      style={{ ...font, background: CANVAS, color: INK }}
    >
      <Nav onStart={() => setModalOpen(true)} />
      <Hero />
      <HowItWorks onStart={() => setModalOpen(true)} />
      
      <PlatformSection onStart={() => setModalOpen(true)} />
      <ServicesGrid onStart={() => setModalOpen(true)} />
      <Testimonials />
      <FAQ />
      <FinalCTA onStart={() => setModalOpen(true)} />
      <Footer />

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 h-14 pl-4 pr-5 rounded-full text-white font-semibold shadow-[0_20px_40px_-10px_rgba(37,211,102,0.55)] flex items-center gap-2 hover:scale-[1.03] active:scale-100 transition"
        style={{ background: WA_GREEN }}
        aria-label="פתח שיחה חדשה"
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span className="text-[14px]">התחל שיחה</span>
      </button>

      {modalOpen && <OrderModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

/* ============ NAV ============ */
function Nav({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(false);
  const links: Array<[string, string, boolean?]> = [
    ["בית", "/"],
    ["איך זה עובד", "#how"],
    ["שירותים", "#services"],
    ["שאלות", "#faq"],
    ["לשליחים ומובילים", partnersUrl("/"), true],
    ["לעסקים", "/for-business", true],
    ["בלוג", "/blog"],
  ];

  // Lock body scroll + close on ESC while drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(247,246,242,0.85)] border-b border-black/[0.06]"
      >
        <div className="relative max-w-[1240px] mx-auto flex items-center justify-between gap-2 px-4 sm:px-5 lg:px-10 h-16">
          {/* START (right in RTL): logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="Goi">
            <Logo />
          </Link>

          {/* CENTER: desktop nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-[14px] text-black/65">
            <Link to="/" className="hover:text-black transition">בית</Link>
            <a href="#how" className="hover:text-black transition">איך זה עובד</a>
            <a href="#services" className="hover:text-black transition">שירותים</a>
            <a href="#faq" className="hover:text-black transition">שאלות</a>
            <a href={partnersUrl("/")} className="hover:text-black transition font-semibold" style={{ color: INK }}>
              לשליחים ומובילים
            </a>
            <Link to="/for-business" className="hover:text-black transition font-semibold" style={{ color: INK }}>
              לעסקים
            </Link>
            <Link to="/blog" className="hover:text-black transition">בלוג</Link>
          </nav>

          {/* END (left in RTL): CTA + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onStart}
              aria-label="התחל שיחה"
              className="inline-flex items-center gap-2 px-3.5 md:px-4 h-10 rounded-full text-white font-semibold text-[12.5px] md:text-[13.5px] transition hover:opacity-90 active:scale-95"
              style={{ background: WA_GREEN }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span className="hidden sm:inline">התחל שיחה</span>
              <span className="sm:hidden">התחל</span>
            </button>
            <button
              onClick={() => setOpen(true)}
              aria-label="פתח תפריט"
              aria-expanded={open}
              className="md:hidden w-11 h-11 grid place-items-center rounded-xl bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] active:scale-95 transition"
            >
              <Menu size={20} className="text-black" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer — rendered OUTSIDE header so backdrop-filter doesn't
          become the containing block for fixed positioning */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" dir="rtl">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="תפריט ראשי"
            className="absolute top-0 right-0 h-full w-[86%] max-w-[360px] bg-white shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.35)] flex flex-col"
            style={{
              animation: "slideInRight 0.28s cubic-bezier(0.2, 0.9, 0.25, 1) both",
              willChange: "transform",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-black/[0.06] shrink-0">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center" aria-label="Goi">
                <Logo />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור תפריט"
                className="w-10 h-10 grid place-items-center rounded-full hover:bg-black/5 active:scale-95 transition"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
              {links.map(([label, href, primary]) => {
                const cls =
                  "flex items-center justify-between text-right px-4 py-3.5 rounded-xl hover:bg-black/[0.04] active:bg-black/[0.06] transition text-[16px] font-semibold text-black";
                if (href.startsWith("/")) {
                  return (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setOpen(false)}
                      className={
                        cls + (primary ? " mt-2 bg-black/[0.03] border border-black/[0.08]" : "")
                      }
                    >
                      <span>{label}</span>
                      <ArrowLeft size={16} className="text-black/40" />
                    </Link>
                  );
                }
                return (
                  <a key={href} href={href} onClick={() => setOpen(false)} className={cls}>
                    <span>{label}</span>
                    <ArrowLeft size={16} className="text-black/30" />
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t border-black/[0.06] shrink-0">
              <button
                onClick={() => {
                  setOpen(false);
                  onStart();
                }}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full text-white font-bold text-[15px] transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: WA_GREEN }}
              >
                <WhatsAppIcon className="w-5 h-5" />
                התחל שיחה בוואטסאפ
              </button>
              <div className="mt-3 text-center text-[11.5px] text-black/50">
                תגובה תוך כ־38 שניות · ללא הרשמה
              </div>
            </div>
          </div>
          <style>{`
 @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
 @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
 `}</style>
        </div>
      )}
    </>
  );
}



/**
 * Shared brand orb: rotating dashed ring around a green gradient core with GOI wordmark.
 * Used for the site logo AND as the profile avatar in WhatsApp-style chat headers,
 * so the same brand mark appears everywhere.
 */
function GoiLogoBadge({
  size = 32,
  ring = true,
  className = "",
}: {
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const fontSize = Math.max(9, Math.round(size * 0.36));
  return (
    <span
      className={`relative inline-grid place-items-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {ring && (
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 w-full h-full animate-spin-slow"
          style={{ animationDuration: "12s" }}
        >
          <circle
            cx="20"
            cy="20"
            r="18.5"
            fill="none"
            stroke={WA_GREEN}
            strokeOpacity="0.55"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          />
        </svg>
      )}
      <span
        className="relative rounded-full grid place-items-center shadow-[0_4px_10px_-3px_rgba(18,140,126,0.55)]"
        style={{
          width: ring ? "78%" : "100%",
          height: ring ? "78%" : "100%",
          background: `radial-gradient(circle at 30% 30%, #1BA898, ${WA_GREEN} 55%, #0B6B60)`,
        }}
      >
        <span
          className="text-white tracking-[-0.03em] leading-none"
          style={{ fontFamily: "var(--font-wordmark)", fontWeight: 900, fontSize }}
        >
          GOI
        </span>
      </span>
    </span>
  );
}

function Logo() {
  return <GoiLogoBadge size={34} />;
}

/* ============ HERO with live embedded order widget ============ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient background */}
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
            <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 pt-6 sm:pt-10 lg:pt-20 pb-14 sm:pb-16 lg:pb-28 flex flex-col gap-7 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:items-start">
        {/* A Intro (eyebrow + h1 + sub). display:contents so children flow into mobile column */}
        <div className="contents lg:block lg:col-start-1 lg:row-start-1">
          {/* Headline Heebo Bold, clean & premium */}
          <h1
            dir="rtl"
            className="text-center lg:text-right text-[26px] leading-[1.2] sm:text-[38px] sm:leading-[1.12] lg:text-[58px] lg:leading-[1.05] break-words"
            style={{
              fontFamily: '"Heebo", system-ui, sans-serif',
              fontWeight: 700,
              letterSpacing: "0",
              fontFeatureSettings: '"kern"',
              color: INK,
            }}
          >
            <span className="block sm:whitespace-nowrap">צריכים משלוח מהיום להיום,</span>
            <span
              className="block mt-1.5 lg:mt-2 font-black sm:whitespace-nowrap"
              style={{ color: WA_GREEN }}
            >
              הובלה קטנה או דירה שלמה?
            </span>
          </h1>

          {/* Unified explainer larger, more readable */}
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
              זה בוט וואטסאפ שמוצא לכם{" "}
              <span className="font-bold whitespace-nowrap" style={{ color: WA_GREEN }}>
                שליחים או מובילים תוך דקות
              </span>
              .
            </p>
            <p className="text-[15px] sm:text-[16px] lg:text-[17px] leading-[1.7] text-black/70 font-normal">
              שולחים הודעה אחת לבוט בוואטסאפ, מקבלים כמה הצעות מרשת של{" "}
              <span className="font-bold text-black/90">500+ שליחים ומובילים פרטיים</span>,{" "}
              משווים מחיר, זמינות ודירוג, בוחרים את מי שבאמת עושה עבודה טובה, ומשלמים אונליין.{" "}
              <span className="font-bold text-black/90">בלי טלפונים.</span>
            </p>
          </div>

          {/* Scroll-down lead-in to the order widget */}
          <div className="mt-5 lg:mt-7 flex justify-center lg:justify-start">
            <a
              href="#order-widget-anchor"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("order-widget-anchor")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="group inline-flex items-center gap-2.5 rounded-full pl-2 pr-4 h-11 text-[13.5px] font-bold shadow-[0_8px_24px_-8px_rgba(37,211,102,0.5)] hover:shadow-[0_12px_32px_-8px_rgba(37,211,102,0.6)] transition-all active:scale-[0.98]"
              style={{ background: WA_GREEN, color: "white" }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>יאלה, תמצא לי מישהו</span>
              <span className="w-7 h-7 rounded-full bg-white/25 grid place-items-center animate-bounce-y">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 5v14M5 12l7 7 7-7"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>
          </div>
        </div>

        {/* Widget sits right under sub on mobile, right column on desktop */}
        <div
          id="order-widget-anchor"
          className="relative max-w-[440px] w-full mx-auto lg:mx-0 lg:max-w-none lg:col-start-2 lg:row-start-1 lg:row-span-2 scroll-mt-24 animate-widget-float"
        >
          {/* soft glow pulsing to draw the eye */}
          <div
            className="absolute -inset-4 sm:-inset-6 -z-10 animate-glow-pulse"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 45%, rgba(37,211,102,0.18), transparent 70%)",
            }}
          />

          {/* top ribbon real order signal */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-bold px-2.5 h-7 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE · הזמנה אמיתית
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-black/55">
              <Lock size={11} color={WA_GREEN} />
              תשלום מאובטח
            </div>
          </div>

          <OrderWidget />

          {/* removed old inline reassurance unified into pill cards below */}
        </div>

        {/* B Trust cards only (chips + CTA removed per request) */}
        <div className="contents lg:block lg:col-start-1 lg:row-start-2">
          {/* Trust 3 horizontal rectangular cards, centered, same on mobile & desktop */}
          <div className="mt-4 lg:mt-10 lg:pt-6 lg:border-t lg:border-black/[0.06]">
            <div
              dir="rtl"
              className="flex flex-col gap-2 sm:gap-2.5 max-w-[440px] lg:max-w-[560px] mx-auto lg:mx-0"
            >
              {[
                {
                  icon: <Users size={18} color="white" strokeWidth={2.5} />,
                  title: "500+ שליחים ומובילים",
                  sub: "רשת ארצית של פרטיים",
                  stat: "500+",
                },
                {
                  icon: <Check size={18} color="white" strokeWidth={3} />,
                  title: "מחיר סופי מראש",
                  sub: "בלי הפתעות בסוף",
                  stat: "0₪",
                },
                {
                  icon: <ShieldCheck size={18} color="white" strokeWidth={2.5} />,
                  title: "תשלום מאובטח",
                  sub: "מוגן ומוצפן",
                  stat: "SSL",
                },
              ].map((it, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden flex items-center gap-3 rounded-2xl bg-white border border-black/[0.06] px-4 py-3 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_28px_-8px_rgba(18,140,126,0.28)] hover:-translate-y-0.5 hover:border-[color:var(--wa-green,#128C7E)]/30 transition-all duration-300 cursor-default"
                  style={{
                    animation: `card-in 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s both`,
                    ["--wa-green" as any]: WA_GREEN,
                  }}
                >
                  {/* subtle green sweep on hover */}
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${WA_GREEN}0A, transparent)`,
                    }}
                  />
                  {/* Icon tile with pulsing halo */}
                  <span
                    className="relative shrink-0 w-11 h-11 rounded-xl grid place-items-center shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)] group-hover:scale-105 transition-transform duration-300"
                    style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-xl animate-pulse-ring"
                      style={{ boxShadow: `0 0 0 0 ${WA_GREEN}55` }}
                    />
                    <span className="relative z-10">{it.icon}</span>
                  </span>
                  <div className="min-w-0 text-right flex-1">
                    <div className="text-[14px] sm:text-[15px] font-bold text-black leading-tight">
                      {it.title}
                    </div>
                    <div className="text-[12px] sm:text-[12.5px] text-black/55 font-medium leading-snug mt-0.5">
                      {it.sub}
                    </div>
                  </div>
                  {/* live dot */}
                  <span
                    aria-hidden
                    className="shrink-0 w-2 h-2 rounded-full opacity-70 group-hover:opacity-100 animate-pulse"
                    style={{ background: WA_GREEN }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MicroStep({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 h-9 pl-3 pr-1 rounded-full bg-white border border-black/[0.08]">
      <span
        className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-black text-white"
        style={{ background: INK }}
      >
        {n}
      </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
function StepArrow() {
  return <ArrowLeft size={14} className="text-black/25 shrink-0" />;
}

/* ============ HOW IT WORKS right under hero ============ */
function HowItWorks({ onStart }: { onStart: () => void }) {
  // Two sides of the marketplace connecting through GOI in the middle
  const suppliers = [
    {
      icon: Package,
      title: "שליחים",
      sub: "מאות שליחים פרטיים באזור",
      faces: [real1, real3, real5],
      count: "312 פעילים",
    },
    {
      icon: Sofa,
      title: "מובילים",
      sub: "צוותים ומשאיות לכל גודל",
      faces: [real2, real4, real1],
      count: "84 צוותים",
    },
  ];
  const demand = [
    {
      icon: MessageCircle,
      title: "הזמנות",
      sub: "לקוחות שולחים בקשה בוואטסאפ",
      faces: [real4, real2, real5],
      count: "1,240 השבוע",
    },
    {
      icon: Users,
      title: "לקוחות",
      sub: "אלפי לקוחות פרטיים בכל הארץ",
      faces: [real5, real1, real3],
      count: "9,500+",
    },
  ];

  return (
    <section id="how" className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-5 lg:px-10">
        <div className="text-center mb-12 lg:mb-16">
          <h2
            className="text-[30px] sm:text-[38px] lg:text-[54px] font-bold leading-[1.08] tracking-[-0.02em]"
            style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
          >
            אנחנו מחברים בין הצדדים
            <span className="block mt-1" style={{ color: WA_GREEN }}>
              הכל דרך בוט אחד.
            </span>
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16.5px] text-black/60 max-w-xl mx-auto leading-[1.65]">
            מצד אחד רשת של שליחים ומובילים פרטיים. מצד שני לקוחות שצריכים משלוח או הובלה. GOI באמצע:
            מזהה, מתאם, מציע ומסגר עסקה הכל אונליין, בלי טלפונים.
          </p>
        </div>

        {/* Hub-and-spoke network */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10">
          {/* SUPPLIERS side */}
          <div className="flex flex-col gap-3 lg:gap-4 order-1 lg:order-1">
            <NetworkCard side="right" label="הצד של הספקים" />
            {suppliers.map((s, i) => (
              <NetworkNode
                key={s.title}
                icon={s.icon}
                title={s.title}
                sub={s.sub}
                faces={s.faces}
                count={s.count}
                delay={0.1 + i * 0.12}
                side="right"
              />
            ))}
          </div>

          {/* CENTER GOI hub with orbiting faces */}
          <div className="order-2 lg:order-2 relative flex items-center justify-center py-4 lg:py-0">
            <GoiHub />
          </div>

          {/* DEMAND side */}
          <div className="flex flex-col gap-3 lg:gap-4 order-3 lg:order-3">
            <NetworkCard side="left" label="הצד של הביקוש" />
            {demand.map((d, i) => (
              <NetworkNode
                key={d.title}
                icon={d.icon}
                title={d.title}
                sub={d.sub}
                faces={d.faces}
                count={d.count}
                delay={0.1 + i * 0.12}
                side="left"
              />
            ))}
          </div>
        </div>

        {/* Visual demos payment + bot search */}
        <div className="mt-14 lg:mt-20 grid md:grid-cols-2 gap-5 lg:gap-8 max-w-[980px] mx-auto">
          <BotSearchDemo />
          <PaymentDemo />
        </div>

        {/* Bottom feature strip */}
        <div className="mt-10 lg:mt-14 grid grid-cols-3 gap-2 sm:gap-3 max-w-[720px] mx-auto">
          {[
            { icon: <Zap size={16} color={WA_GREEN} strokeWidth={2.5} />, label: "התאמה תוך דקות" },
            {
              icon: <CreditCard size={16} color={WA_GREEN} strokeWidth={2.5} />,
              label: "תשלום אונליין",
            },
            {
              icon: <ShieldCheck size={16} color={WA_GREEN} strokeWidth={2.5} />,
              label: "מאובטח ומאומת",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-black/[0.06] py-3 px-3 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.05)]"
              style={{
                animation: `card-in 0.6s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.1}s both`,
              }}
            >
              <span
                className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                style={{ background: `${WA_GREEN}14` }}
              >
                {f.icon}
              </span>
              <span className="text-[12px] sm:text-[13.5px] font-bold text-black/85">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full font-bold text-[14.5px] text-white transition hover:opacity-90 shadow-[0_8px_20px_-6px_rgba(18,140,126,0.5)]"
            style={{ background: WA_GREEN }}
          >
            <WhatsAppIcon className="w-4 h-4" /> יאלה, תמצא לי מישהו <ArrowLeft size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* Stacked avatar cluster for the network cards */
function FaceStack({ faces }: { faces: string[] }) {
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {faces.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm"
          style={{ zIndex: faces.length - i }}
        />
      ))}
      <span className="w-6 h-6 rounded-full border-2 border-white bg-black/5 grid place-items-center text-[9px] font-bold text-black/60">
        +
      </span>
    </div>
  );
}

/* Bot search demo LIVE animated WhatsApp conversation, alternates courier/mover */
type ChatStep =
  | { kind: "me"; text: string; time: string }
  | { kind: "typing" }
  | { kind: "bot-text"; text: string; time: string }
  | {
      kind: "bot-match";
      face: string;
      name: string;
      rating: string;
      price: string;
      eta: string;
      type: string;
      icon: typeof Package;
      time: string;
    }
  | { kind: "bot-status"; label: string; icon: typeof Package; time: string }
  | { kind: "bot-pay"; price: string; time: string }
  | { kind: "bot-done"; face: string; name: string; time: string };

function BotSearchDemo() {
  const scenarios: { badge: string; icon: typeof Package; steps: ChatStep[] }[] = [
    {
      badge: "שליחות",
      icon: Package,
      steps: [
        { kind: "me", text: "היי, צריך שליח לאסוף חבילה 🙏", time: "14:30" },
        { kind: "typing" },
        { kind: "bot-text", text: "בכיף! מאיזה כתובת ולאן צריך להביא?", time: "14:30" },
        { kind: "me", text: "רח' ביאליק 12 רמת גן → דיזנגוף 50 ת״א", time: "14:31" },
        { kind: "typing" },
        { kind: "bot-text", text: "מעולה. עד מתי צריך שיגיע?", time: "14:31" },
        { kind: "me", text: "עד 15:00", time: "14:31" },
        { kind: "typing" },
        { kind: "bot-text", text: "מחפש שליחים באזור... 🔍", time: "14:32" },
        {
          kind: "bot-match",
          face: real1,
          name: "אבי כהן",
          rating: "4.9",
          price: "₪35",
          eta: "12 דק'",
          type: "שליחות",
          icon: Package,
          time: "14:32",
        },
        { kind: "me", text: "בחרתי את אבי 👍", time: "14:33" },
        { kind: "bot-status", label: "אבי יצא לדרך · 12 דק' הגעה", icon: Package, time: "14:33" },
        { kind: "bot-pay", price: "₪35", time: "14:45" },
        { kind: "bot-done", face: real1, name: "אבי", time: "14:47" },
      ],
    },
    {
      badge: "הובלה",
      icon: Sofa,
      steps: [
        { kind: "me", text: "צריך להוביל ספה 3 מושבים 🛋️", time: "10:10" },
        { kind: "typing" },
        { kind: "bot-text", text: "אחלה. מאיזו כתובת ולאן?", time: "10:10" },
        { kind: "me", text: "פ״ת → חולון", time: "10:11" },
        { kind: "typing" },
        { kind: "bot-text", text: "יש מעלית? מאיזו קומה מפנים?", time: "10:11" },
        { kind: "me", text: "קומה 3, בלי מעלית", time: "10:12" },
        { kind: "typing" },
        { kind: "bot-text", text: "מאתר מובילים עם 2 סבלים... 🔍", time: "10:12" },
        {
          kind: "bot-match",
          face: real2,
          name: "משה לוי",
          rating: "4.8",
          price: "₪280",
          eta: "45 דק'",
          type: "הובלה",
          icon: Sofa,
          time: "10:12",
        },
        { kind: "me", text: "מאשר, קדימה", time: "10:13" },
        { kind: "bot-status", label: "משה בדרך אליך · 45 דק'", icon: Sofa, time: "10:13" },
        { kind: "bot-pay", price: "₪280", time: "11:05" },
        { kind: "bot-done", face: real2, name: "משה", time: "11:08" },
      ],
    },
  ];

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [visible, setVisible] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const current = scenarios[scenarioIdx];

  useEffect(() => {
    if (visible < current.steps.length) {
      const nextStep = current.steps[visible];
      const delay = nextStep?.kind === "typing" ? 600 : 1400;
      const t = setTimeout(() => setVisible((v) => v + 1), delay);
      return () => clearTimeout(t);
    }
    // finished pause then switch scenario
    const t = setTimeout(() => {
      setScenarioIdx((i) => (i + 1) % scenarios.length);
      setVisible(1);
    }, 2600);
    return () => clearTimeout(t);
  }, [visible, scenarioIdx]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visible, scenarioIdx]);

  const shown = current.steps.slice(0, visible);
  const isTyping = shown[shown.length - 1]?.kind === "typing";

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-black/[0.08] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.18)]"
      style={{ background: WA_BG, animation: `card-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both` }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: WA_HEADER }}>
        <GoiLogoBadge size={32} />

        <div className="min-w-0 flex-1">
          <div className="text-white text-[12.5px] font-semibold leading-tight">Goi הבוט</div>
          <div className="text-white/70 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            {isTyping ? "מקליד..." : "אונליין"}
          </div>
        </div>
        <span className="text-[9.5px] font-bold text-white/90 bg-white/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
          <current.icon size={10} /> {current.badge}
        </span>
      </div>

      <div ref={scrollRef} className="px-3 py-3 space-y-2 h-[340px] overflow-hidden" dir="rtl">
        {shown.map((step, i) => (
          <ChatBubble key={`${scenarioIdx}-${i}`} step={step} />
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ step }: { step: ChatStep }) {
  const base = "rounded-2xl px-2.5 py-1.5 text-[11.5px] leading-snug shadow-sm";
  const meta = (time: string) => (
    <div className="flex justify-end items-center gap-0.5 mt-0.5 text-[9px] text-black/45">
      {time} <CheckCheck size={10} className="text-sky-500" />
    </div>
  );

  if (step.kind === "me") {
    return (
      <div className="flex justify-end animate-bubble-in">
        <div className={`${base} rounded-tr-sm max-w-[85%]`} style={{ background: WA_BUBBLE_ME }}>
          {step.text}
          {meta(step.time)}
        </div>
      </div>
    );
  }

  if (step.kind === "typing") {
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className="rounded-2xl rounded-tl-sm bg-white shadow-sm px-3 py-2 flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-black/40 animate-typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-black/40 animate-typing-dot"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-black/40 animate-typing-dot"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    );
  }

  if (step.kind === "bot-text") {
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className={`${base} rounded-tl-sm bg-white max-w-[85%]`}>
          {step.text}
          <div className="text-[9px] text-black/45 mt-0.5">{step.time}</div>
        </div>
      </div>
    );
  }

  if (step.kind === "bot-match") {
    const Icon = step.icon;
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className={`${base} rounded-tl-sm bg-white max-w-[90%] w-[240px]`}>
          <div className="flex items-center gap-1 text-black/70 font-semibold mb-1 text-[11px]">
            <span
              className="w-4 h-4 rounded grid place-items-center"
              style={{ background: `${WA_GREEN}18` }}
            >
              <Icon size={10} color={WA_GREEN} strokeWidth={2.5} />
            </span>
            התאמה ל{step.type}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] p-1.5">
            <img src={step.face} alt="" className="w-7 h-7 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-black flex items-center gap-1">
                {step.name}
                <Star size={8} className="fill-yellow-400 text-yellow-400" />
                <span className="text-black/55 font-medium">{step.rating}</span>
              </div>
              <div className="text-[9.5px] text-black/50">הגעה תוך {step.eta}</div>
            </div>
            <div className="text-[12px] font-black" style={{ color: WA_GREEN }}>
              {step.price}
            </div>
          </div>
          <div className="text-[9px] text-black/45 mt-1">{step.time}</div>
        </div>
      </div>
    );
  }

  if (step.kind === "bot-status") {
    const Icon = step.icon;
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className={`${base} rounded-tl-sm bg-white max-w-[90%]`}>
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-black/80">
            <span
              className="w-5 h-5 rounded-full grid place-items-center"
              style={{ background: `${WA_GREEN}18` }}
            >
              <Icon size={11} color={WA_GREEN} strokeWidth={2.5} />
            </span>
            {step.label}
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: WA_GREEN }}
            />
          </div>
          <div className="text-[9px] text-black/45 mt-0.5">{step.time}</div>
        </div>
      </div>
    );
  }

  if (step.kind === "bot-pay") {
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className={`${base} rounded-tl-sm bg-white max-w-[90%]`}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg grid place-items-center"
              style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
            >
              <CreditCard size={14} color="white" strokeWidth={2.4} />
            </div>
            <div className="flex-1">
              <div className="text-[11.5px] font-bold text-black">תשלום בוצע · VISA •••4821</div>
              <div className="text-[9.5px] text-black/50 flex items-center gap-1">
                <Lock size={8} /> Goi Pay
              </div>
            </div>
            <div className="text-[13px] font-black" style={{ color: WA_GREEN }}>
              {step.price}
            </div>
          </div>
          <div className="text-[9px] text-black/45 mt-0.5">{step.time}</div>
        </div>
      </div>
    );
  }

  if (step.kind === "bot-done") {
    return (
      <div className="flex justify-start animate-bubble-in">
        <div className={`${base} rounded-tl-sm bg-white max-w-[90%]`}>
          <div className="flex items-center gap-2">
            <img
              src={step.face}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow"
            />
            <div className="flex-1">
              <div className="text-[11.5px] font-bold text-black flex items-center gap-1">
                נמסר בהצלחה
                <span className="w-4 h-4 rounded-full bg-emerald-500 grid place-items-center">
                  <Check size={10} className="text-white" strokeWidth={3.5} />
                </span>
              </div>
              <div className="text-[9.5px] text-black/55">{step.name} סיים את המשימה</div>
            </div>
          </div>
          <div className="text-[9px] text-black/45 mt-0.5">{step.time}</div>
        </div>
      </div>
    );
  }

  return null;
}

/* Payment demo compact receipts for BOTH delivery + moving */
function PaymentDemo() {
  const rows = [
    {
      face: real1,
      name: "אבי כהן",
      role: "שליחות",
      from: "רמת גן → ת״א",
      price: "₪35",
      icon: Package,
    },
    { face: real2, name: "משה לוי", role: "הובלה", from: "פ״ת → חולון", price: "₪280", icon: Sofa },
  ];
  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-black/[0.08] bg-white shadow-[0_16px_36px_-18px_rgba(0,0,0,0.18)]"
      style={{ animation: `card-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both` }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg grid place-items-center shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)]"
            style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
          >
            <CreditCard size={14} color="white" strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[12.5px] font-bold text-black leading-tight">תשלום מאובטח</div>
            <div className="text-[9.5px] text-black/50 flex items-center gap-1">
              <Lock size={8} /> Goi Pay · SSL
            </div>
          </div>
        </div>
        <div className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 flex items-center gap-1">
          <Check size={10} strokeWidth={3} /> שולם
        </div>
      </div>

      <div className="p-3 space-y-2" dir="rtl">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-gradient-to-br from-slate-50/60 to-white p-2.5"
          >
            <img
              src={r.face}
              alt=""
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-black flex items-center gap-1.5">
                {r.name}
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${WA_GREEN}18`, color: WA_GREEN }}
                >
                  <r.icon size={9} strokeWidth={2.5} /> {r.role}
                </span>
              </div>
              <div className="text-[10px] text-black/50 flex items-center gap-1 mt-0.5">
                <MapPin size={9} /> {r.from}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-black leading-none" style={{ color: WA_GREEN }}>
                {r.price}
              </div>
              <div className="text-[9px] text-emerald-600 font-bold mt-0.5 flex items-center gap-0.5 justify-end">
                <Check size={9} strokeWidth={3} /> שולם
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-black/[0.06] p-2.5 flex items-center gap-2.5 bg-gradient-to-br from-slate-50 to-white">
          <div className="w-9 h-6 rounded-md bg-gradient-to-br from-slate-800 to-slate-600 grid place-items-center">
            <div className="text-white text-[7.5px] font-black tracking-wider">VISA</div>
          </div>
          <div className="flex-1 text-[11px] font-mono text-black/70 tracking-wider">•••• 4821</div>
          <div className="flex items-center gap-1 text-[9.5px] text-black/50">
            <ShieldCheck size={10} /> מגובה על ידי Goi
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small header pill labeling each side */
function NetworkCard({ side, label }: { side: "right" | "left"; label: string }) {
  return (
    <div
      className={`text-[11px] font-bold uppercase tracking-[0.18em] text-black/45 ${side === "right" ? "text-right" : "text-left"} lg:${side === "right" ? "text-right" : "text-left"}`}
    >
      {label}
    </div>
  );
}

/* Individual network node card with animated connecting line to hub */
function NetworkNode({
  icon: Icon,
  title,
  sub,
  delay,
  side,
  faces,
  count,
}: {
  icon: typeof Package;
  title: string;
  sub: string;
  delay: number;
  side: "right" | "left";
  faces?: string[];
  count?: string;
}) {
  return (
    <div
      className="group relative rounded-2xl bg-white border border-black/[0.08] p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_30px_-10px_rgba(18,140,126,0.28)] hover:-translate-y-0.5 transition-all duration-300"
      style={{ animation: `card-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s both` }}
      dir="rtl"
    >
      {/* Connecting arm to central hub desktop only */}
      <div
        className={`hidden lg:block pointer-events-none absolute top-1/2 -translate-y-1/2 h-[2px] w-10 xl:w-16 ${side === "right" ? "-left-10 xl:-left-16" : "-right-10 xl:-right-16"}`}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              side === "right"
                ? `linear-gradient(to left, ${WA_GREEN}, ${WA_GREEN}00)`
                : `linear-gradient(to right, ${WA_GREEN}, ${WA_GREEN}00)`,
            opacity: 0.55,
          }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{
            background: WA_GREEN,
            boxShadow: `0 0 8px ${WA_GREEN}`,
            animation: `arm-flow-${side} 2.4s ease-in-out ${delay}s infinite`,
          }}
        />
      </div>
      {/* Connector node dot on card edge desktop */}
      <span
        className={`hidden lg:block absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white ${side === "right" ? "-left-[5px]" : "-right-[5px]"}`}
        style={{ background: WA_GREEN, boxShadow: `0 0 0 3px ${WA_GREEN}22` }}
        aria-hidden
      />

      {/* Vertical connecting arm mobile only. Suppliers (right) arm goes DOWN to hub, demand (left) arm goes UP from hub */}
      <div
        className={`lg:hidden pointer-events-none absolute left-1/2 -translate-x-1/2 w-[2px] h-6 ${side === "right" ? "-bottom-6" : "-top-6"}`}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              side === "right"
                ? `linear-gradient(to bottom, ${WA_GREEN}, ${WA_GREEN}00)`
                : `linear-gradient(to top, ${WA_GREEN}, ${WA_GREEN}00)`,
            opacity: 0.55,
          }}
        />
        <span
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{
            background: WA_GREEN,
            boxShadow: `0 0 8px ${WA_GREEN}`,
            animation: `arm-flow-v-${side === "right" ? "down" : "up"} 2.4s ease-in-out ${delay}s infinite`,
          }}
        />
      </div>
      {/* Connector node dot on card edge mobile */}
      <span
        className={`lg:hidden absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white ${side === "right" ? "-bottom-[5px]" : "-top-[5px]"}`}
        style={{ background: WA_GREEN, boxShadow: `0 0 0 3px ${WA_GREEN}22` }}
        aria-hidden
      />

      <div
        className={`flex items-center gap-3 ${side === "left" ? "flex-row-reverse text-left" : ""}`}
      >
        <span
          className="shrink-0 w-11 h-11 rounded-xl grid place-items-center shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)]"
          style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
        >
          <Icon size={19} color="white" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-bold text-black leading-tight">{title}</div>
          <div className="text-[12.5px] text-black/55 font-medium leading-snug mt-0.5">{sub}</div>
        </div>
      </div>
      {count && (
        <div
          className={`mt-3 pt-3 border-t border-black/[0.05] flex items-center gap-1.5 ${side === "left" ? "flex-row-reverse" : ""}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: WA_GREEN }}
          />
          <span className="text-[11px] font-bold text-black/60">{count}</span>
        </div>
      )}
    </div>
  );
}

/* Central GOI hub pulsing rings + orbit */
function GoiHub() {
  return (
    <div
      className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] lg:w-[300px] lg:h-[300px]"
      aria-hidden
    >
      {/* outer ring dashed rotating */}
      <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full animate-spin-slow">
        <circle
          cx="150"
          cy="150"
          r="140"
          fill="none"
          stroke={WA_GREEN}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
      </svg>
      {/* middle ring */}
      <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full animate-spin-reverse">
        <circle
          cx="150"
          cy="150"
          r="108"
          fill="none"
          stroke={WA_GREEN}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="2 6"
        />
      </svg>
      {/* pulsing halos */}
      <span
        className="absolute inset-6 rounded-full animate-hub-pulse-1"
        style={{ background: `radial-gradient(circle, ${WA_GREEN}22, transparent 65%)` }}
      />
      <span
        className="absolute inset-10 rounded-full animate-hub-pulse-2"
        style={{ background: `radial-gradient(circle, ${WA_GREEN}33, transparent 60%)` }}
      />

      {/* Orbiting faces real network members */}
      <div className="absolute inset-0 animate-spin-slow">
        {[
          { src: real1, label: "שליח", deg: 0 },
          { src: real2, label: "מוביל", deg: 60 },
          { src: real3, label: "לקוח", deg: 120 },
          { src: real4, label: "שליח", deg: 180 },
          { src: real5, label: "מוביל", deg: 240 },
          { src: real1, label: "לקוח", deg: 300 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `rotate(${p.deg}deg) translate(46%) rotate(-${p.deg}deg) translate(-50%,-50%)`,
              transformOrigin: "0 0",
            }}
          >
            <div className="animate-spin-reverse-slow">
              <div className="relative">
                <img
                  src={p.src}
                  alt=""
                  className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full object-cover ring-2 ring-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.3)]"
                />
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8.5px] font-bold text-white rounded-full px-1.5 py-[1px] whitespace-nowrap shadow"
                  style={{ background: WA_GREEN }}
                >
                  {p.label}
                </span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Core GOI orb */}
      <div
        className="absolute inset-[28%] rounded-full grid place-items-center shadow-[0_20px_50px_-10px_rgba(18,140,126,0.6)]"
        style={{
          background: `radial-gradient(circle at 30% 30%, #1BA898, ${WA_GREEN} 55%, #0B6B60)`,
        }}
      >
        <div
          className="text-white tracking-[-0.02em]"
          style={{
            fontFamily: "var(--font-wordmark)",
            fontWeight: 900,
            fontSize: "clamp(28px, 6vw, 44px)",
          }}
        >
          GOI
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-white border border-black/[0.06] shadow-md rounded-full px-2.5 h-6 text-[10.5px] font-bold text-black/70">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: WA_GREEN }} />
        LIVE
      </div>
    </div>
  );
}

/* ============ TRUST STRIP ============ */
function TrustStrip() {
  return (
    <section className="border-y border-black/[0.06] bg-white/50">
      <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-6 flex items-center gap-8 overflow-hidden">
        <div className="text-[11.5px] uppercase tracking-[0.15em] text-black/45 font-semibold whitespace-nowrap hidden sm:block">
          מהימנות
        </div>
        <div className="flex-1 flex items-center justify-around gap-6 flex-wrap text-black/60">
          <TrustItem icon={<ShieldCheck size={16} />} text="ביטוח עד ₪1,000" />
          <TrustItem icon={<Lock size={16} />} text="תשלום מאובטח" />
          <TrustItem icon={<Check size={16} />} text="שליחים מאומתים" />
          <TrustItem icon={<Clock size={16} />} text="תמיכה 24/7" />
        </div>
      </div>
    </section>
  );
}
function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium">
      {icon}
      {text}
    </div>
  );
}

/* ============ PLATFORM SECTION ============ */
function PlatformSection({ onStart }: { onStart: () => void }) {
  return (
    <section
      id="platform"
      className="relative py-20 lg:py-28 overflow-hidden"
      style={{ background: CANVAS }}
    >
      {/* Ambient background same language as hero */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 60% at 85% 0%, rgba(18,140,126,0.08), transparent 55%), radial-gradient(80% 60% at 10% 100%, rgba(18,140,126,0.06), transparent 60%)",
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden>
          <defs>
            <pattern id="platform-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#platform-grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1240px] mx-auto px-5 lg:px-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center" dir="rtl">
          {/* Text column */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: WA_GREEN }}
              />
              מה זה <span style={{ fontFamily: "var(--font-wordmark)", color: INK }}>GOI</span>
            </div>
            <h2
              className="mt-5 text-[34px] sm:text-[42px] lg:text-[58px] font-bold leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
            >
              אנחנו לא חברת משלוחים.
              <span className="block mt-1 font-black" style={{ color: WA_GREEN }}>
                אנחנו הפלטפורמה.
              </span>
            </h2>
            <p className="mt-5 text-[15.5px] sm:text-[17px] leading-[1.7] text-black/65 max-w-[540px]">
              <span style={{ fontFamily: "var(--font-wordmark)", fontWeight: 900, color: INK }}>
                GOI
              </span>{" "}
              היא התשתית שמחברת בין לקוחות פרטיים לרשת של מאות שליחים ומובילים פרטיים. לא מפעילים
              משאיות. לא מעסיקים שליחים. הבוט החכם מאתר עבורך את הפתרון הכי מדויק, במחיר הכי הוגן
              ובזמן הכי קצר.
            </p>

            {/* Feature list */}
            <div className="mt-8 space-y-3">
              {[
                { t: "רשת רחבה", d: "מאות שליחים ומובילים פעילים בכל הארץ" },
                { t: "תמחור שקוף", d: "הצעת מחיר תוך שניות, בלי הפתעות" },
                { t: "טכנולוגיה חכמה", d: "אלגוריתם התאמה לפי מיקום, גודל וזמן" },
              ].map((f) => (
                <div
                  key={f.t}
                  className="group flex items-start gap-3 rounded-2xl bg-white/70 backdrop-blur border border-black/[0.06] p-3.5 hover:border-black/15 hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center shrink-0 shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)]"
                    style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
                  >
                    <Check size={16} color="white" strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[14.5px] text-black leading-tight">{f.t}</div>
                    <div className="text-[13px] text-black/55 mt-0.5 leading-snug">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual column "מה אנחנו / מה אנחנו לא" comparison card */}
          <div className="relative">
            {/* soft glow */}
            <div
              className="absolute -inset-6 -z-10"
              style={{
                background: `radial-gradient(60% 55% at 50% 45%, ${WA_GREEN}22, transparent 70%)`,
              }}
              aria-hidden
            />

            <div className="rounded-3xl bg-white border border-black/[0.08] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.18)] overflow-hidden">
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center gap-3 border-b border-black/[0.06]"
                style={{ background: `linear-gradient(135deg, ${WA_HEADER}, ${WA_GREEN})` }}
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                  <ShieldCheck size={18} className="text-white" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-white text-[14px] font-bold">מה בדיוק אנחנו</div>
                  <div className="text-white/75 text-[11px]">הפלטפורמה, לא חברת המשלוחים</div>
                </div>
              </div>

              {/* Two columns: NOT / YES */}
              <div
                className="grid grid-cols-2 divide-x divide-black/[0.06]"
                style={{ direction: "rtl" }}
              >
                <div className="p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/40 mb-3">
                    אנחנו לא
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      "חברת משלוחים",
                      "מפעילים משאיות",
                      "מעסיקים שליחים",
                      "לוקחים אחריות על התמחור",
                    ].map((it) => (
                      <li key={it} className="flex items-center gap-2 text-[13.5px] text-black/60">
                        <span className="w-5 h-5 rounded-full grid place-items-center shrink-0 bg-black/[0.05]">
                          <X size={11} className="text-black/40" strokeWidth={3} />
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5" style={{ background: `${WA_GREEN}08` }}>
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
                    style={{ color: WA_GREEN }}
                  >
                    אנחנו כן
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      "פלטפורמה טכנולוגית",
                      "בוט חכם בוואטסאפ",
                      "מחברים ביקוש להיצע",
                      "מבטיחים תשלום ואבטחה",
                    ].map((it) => (
                      <li
                        key={it}
                        className="flex items-center gap-2 text-[13.5px] font-semibold text-black/85"
                      >
                        <span
                          className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                          style={{ background: WA_GREEN }}
                        >
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stats footer */}
              <div className="grid grid-cols-3 border-t border-black/[0.06] bg-gradient-to-br from-slate-50 to-white">
                {[
                  { n: "847", l: "שותפים ברשת" },
                  { n: "12K+", l: "הזמנות בחודש" },
                  { n: "4.9", l: "דירוג ממוצע" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="text-center py-4 border-l border-black/[0.06] last:border-l-0"
                  >
                    <div
                      className="text-[22px] font-black leading-none tracking-[-0.02em]"
                      style={{ color: INK }}
                    >
                      {s.n}
                    </div>
                    <div className="text-[11px] text-black/55 mt-1 font-medium">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Two ordering modes */}
        <TwoModes />

        {/* Partners carousel */}
        <PartnersCarousel onStart={onStart} />
      </div>
    </section>
  );
}

/* Two-way pricing modes visual */
function TwoModes() {
  return (
    <div className="mt-20 lg:mt-28" dir="rtl">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: WA_GREEN }}
          />
          שתי דרכים להזמין
        </div>
        <h3
          className="mt-4 text-[26px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.1] tracking-[-0.02em]"
          style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
        >
          אתה בוחר <span style={{ color: WA_GREEN }}>איך לתמחר</span>, לא הם.
        </h3>
        <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-black/60 leading-[1.6]">
          קבל הצעות מחיר מרשת השליחים והמובילים ואשר את המתאימה, או קבע מחיר משלך והם יאשרו כמו שנוח
          לך.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 lg:gap-6 max-w-[980px] mx-auto">
        {/* Mode A: Get offers */}
        <div className="relative rounded-3xl bg-white border border-black/[0.08] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.15)] p-5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl grid place-items-center shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)]"
              style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
            >
              <Zap size={19} color="white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/45">
                מצב א׳ · דוגמה להובלה
              </div>
              <div className="text-[16px] font-bold text-black leading-tight">קבל הצעות ואשר</div>
            </div>
          </div>
          <p className="text-[13px] text-black/60 leading-[1.6] mb-3">
            שולח מה צריך להוביל הבוט מפזר לרשת המובילים ומחזיר לך את ההצעות הכי טובות.
          </p>
          <div className="rounded-xl bg-black/[0.03] p-2 mb-2 flex items-center gap-2 text-[11.5px] text-black/70">
            <Sofa size={13} color={WA_GREEN} strokeWidth={2.4} />
            הובלת ספה 3 מושבים · פ״ת → חולון · קומה 3
          </div>
          <div className="space-y-2">
            {[
              { face: real2, name: "משה לוי", price: "₪280", meta: "45 דק' · 2 סבלים" },
              { face: personShira, name: "שירה גולן", price: "₪310", meta: "50 דק' · צוות" },
              { face: real4, name: "דני שרון", price: "₪340", meta: "60 דק' · משאית 3 טון" },
            ].map((o, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-xl p-2 border ${i === 0 ? "border-emerald-400/50 bg-emerald-50/40" : "border-black/[0.06] bg-black/[0.02]"}`}
              >
                <img
                  src={o.face}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-black">{o.name}</div>
                  <div className="text-[10.5px] text-black/50">{o.meta}</div>
                </div>
                <div className="text-[13px] font-black" style={{ color: WA_GREEN }}>
                  {o.price}
                </div>
                {i === 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-white rounded-full px-1.5 py-0.5"
                    style={{ background: WA_GREEN }}
                  >
                    <Check size={9} strokeWidth={3} /> נבחר
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mode B: Name your price */}
        <div className="relative rounded-3xl bg-white border border-black/[0.08] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.15)] p-5 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl grid place-items-center shadow-[0_6px_14px_-4px_rgba(18,140,126,0.5)]"
              style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
            >
              <Tag size={19} color="white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/45">
                מצב ב׳ · דוגמה לשליחות
              </div>
              <div className="text-[16px] font-bold text-black leading-tight">
                קבע מחיר, הם יאשרו
              </div>
            </div>
          </div>
          <p className="text-[13px] text-black/60 leading-[1.6] mb-4">
            אתה קובע כמה תשלם על השליחות הרשת מקבלת התראה והראשון שמאשר לוקח את העבודה.
          </p>

          {/* Your offer card */}
          <div
            className="rounded-2xl p-3 mb-2"
            style={{ background: `${WA_GREEN}0F`, border: `1px dashed ${WA_GREEN}55` }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-black/60 flex items-center gap-1">
                <Package size={11} color={WA_GREEN} strokeWidth={2.4} />
                ההצעה שלך
              </div>
              <div className="text-[10px] text-black/50">חבילה · רמת גן → ת״א</div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <div className="text-[26px] font-black leading-none" style={{ color: WA_GREEN }}>
                ₪35
              </div>
              <div className="text-[11px] text-black/50">מוצע לרשת השליחים</div>
            </div>
          </div>

          {/* Provider acceptance */}
          <div className="rounded-xl border border-black/[0.06] p-2.5 flex items-center gap-2.5 bg-white">
            <img src={real1} alt="" className="w-9 h-9 rounded-full object-cover" loading="lazy" />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-black flex items-center gap-1">
                אבי כהן
                <Star size={9} className="fill-yellow-400 text-yellow-400" />
                <span className="text-black/55 font-medium text-[11px]">4.9</span>
              </div>
              <div className="text-[10.5px] text-black/55">אישר את ההצעה · יוצא עכשיו</div>
            </div>
            <span className="w-8 h-8 rounded-full grid place-items-center bg-emerald-500">
              <Check size={16} className="text-white" strokeWidth={3.5} />
            </span>
          </div>
          <div className="mt-2 text-[10.5px] text-black/50 flex items-center gap-1">
            <Handshake size={12} color={WA_GREEN} /> העסקה נסגרה בין שני הצדדים.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Partners carousel verified rated independents */
function PartnersCarousel({ onStart }: { onStart: () => void }) {
  const partners = [
    {
      face: real1,
      name: "אבי כהן",
      role: "שליח · ת״א",
      rating: "4.9",
      reviews: 312,
      spec: "חבילות ומסמכים",
    },
    {
      face: real2,
      name: "משה לוי",
      role: "מוביל · מרכז",
      rating: "4.8",
      reviews: 203,
      spec: "דירות ורהיטים",
    },
    {
      face: personNoa,
      name: "נועה שגיא",
      role: "שליחת אופניים · ת״א",
      rating: "5.0",
      reviews: 178,
      spec: "מסמכים דחופים",
    },
    {
      face: personYossi,
      name: "יוסי מזרחי",
      role: "שליח · ירושלים",
      rating: "4.9",
      reviews: 245,
      spec: "משלוחי סופר",
    },
    {
      face: personShira,
      name: "שירה גולן",
      role: "מובילה · שרון",
      rating: "4.9",
      reviews: 156,
      spec: "פריטים בודדים",
    },
    {
      face: real3,
      name: "רון פרץ",
      role: "שליח · חיפה",
      rating: "4.8",
      reviews: 189,
      spec: "חבילות קטנות",
    },
    {
      face: real4,
      name: "דני שרון",
      role: "מוביל · דרום",
      rating: "4.7",
      reviews: 98,
      spec: "הובלות ארוכות",
    },
    {
      face: real5,
      name: "מיכל ברק",
      role: "שליחת אופנוע · פ״ת",
      rating: "5.0",
      reviews: 67,
      spec: "מתנות ופרחים",
    },
  ];
  const doubled = [...partners, ...partners];
  return (
    <div className="mt-20 lg:mt-28" dir="rtl">
      <div className="flex items-end justify-between max-w-[1140px] mx-auto mb-6 px-1">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
            <BadgeCheck size={12} color={WA_GREEN} />
            הרשת שלנו
          </div>
          <h3
            className="mt-4 text-[24px] sm:text-[30px] lg:text-[38px] font-bold leading-[1.1] tracking-[-0.02em]"
            style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
          >
            שליחים ומובילים <span style={{ color: WA_GREEN }}>עצמאיים, מאומתים ומדורגים</span>
          </h3>
        </div>
        <div className="hidden sm:block text-[13px] text-black/55 font-medium max-w-[280px] leading-snug">
          כולם עוברים אימות זהות, ביטוח ודירוג רציף מלקוחות אמיתיים.
        </div>
      </div>

      {/* Fade masked marquee */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage: "linear-gradient(to left, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to left, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="flex gap-3 sm:gap-4 animate-marquee w-max py-2">
          {doubled.map((p, i) => (
            <div
              key={i}
              className="shrink-0 w-[240px] sm:w-[260px] rounded-2xl bg-white border border-black/[0.08] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.12)] p-3 flex items-center gap-3"
            >
              <div className="relative shrink-0">
                <img
                  src={p.face}
                  alt={p.name}
                  className="w-14 h-14 rounded-2xl object-cover"
                  loading="lazy"
                />
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center ring-2 ring-white"
                  style={{ background: WA_GREEN }}
                >
                  <BadgeCheck size={11} className="text-white" strokeWidth={2.8} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-black leading-tight truncate">
                  {p.name}
                </div>
                <div className="text-[11px] text-black/55 leading-tight mt-0.5 truncate">
                  {p.role}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star size={11} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-[11.5px] font-bold text-black">{p.rating}</span>
                  <span className="text-[10.5px] text-black/45">({p.reviews})</span>
                </div>
                <div className="text-[10.5px] text-black/50 mt-0.5 truncate">{p.spec}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-6 text-[12.5px] text-black/50 font-medium">
        + מאות שליחים ומובילים נוספים ברשת · חדשים מצטרפים בכל שבוע
      </div>

      {/* Mini CTA under carousel */}
      <div className="mt-10 max-w-[560px] mx-auto">
        <div className="relative rounded-2xl bg-white border border-black/[0.08] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)] p-4 sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="hidden sm:grid w-12 h-12 shrink-0 rounded-2xl place-items-center shadow-[0_8px_18px_-6px_rgba(18,140,126,0.55)]"
              style={{ background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)` }}
            >
              <WhatsAppIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-[14.5px] sm:text-[15.5px] font-bold text-black leading-tight">
                מוכן לשלוח או להוביל?
              </div>
              <div className="text-[12px] sm:text-[12.5px] text-black/55 mt-0.5 leading-snug">
                שיחת וואטסאפ אחת עם הבוט הצעות מחיר תוך דקה.
              </div>
            </div>
            <button
              onClick={onStart}
              className="shrink-0 inline-flex items-center gap-1.5 h-11 px-4 sm:px-5 rounded-full text-white font-bold text-[13px] sm:text-[13.5px] shadow-[0_10px_22px_-8px_rgba(18,140,126,0.6)] hover:scale-[1.03] active:scale-100 transition"
              style={{ background: WA_GREEN }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              התחל שיחה
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-center gap-4 text-[10.5px] sm:text-[11px] text-black/50 font-medium">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={12} color={WA_GREEN} /> מאומתים ומבוטחים
            </span>
            <span className="w-1 h-1 rounded-full bg-black/20" />
            <span className="inline-flex items-center gap-1">
              <Clock size={12} color={WA_GREEN} /> הצעה תוך דקה
            </span>
            <span className="w-1 h-1 rounded-full bg-black/20" />
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="fill-yellow-400 text-yellow-400" /> 4.9 דירוג
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ SERVICES ============ */
function ServicesGrid({ onStart }: { onStart: () => void }) {
  const services = [
    {
      icon: Package,
      title: "משלוח חבילה",
      hint: "מהרגע להרגע · עד 30 ק״ג",
      kind: "שליחות",
      img: svcPackage,
    },
    {
      icon: FileText,
      title: "מסמכים דחופים",
      hint: "קורקינט או אופניים · דחוף",
      kind: "שליחות",
      img: svcDocs,
    },
    {
      icon: Gift,
      title: "מתנות עד הבית",
      hint: "היום או מחר · עטיפה וברכה",
      kind: "שליחות",
      img: svcGift,
    },
    {
      icon: ShoppingBag,
      title: "איסוף מחנות",
      hint: "מיד2, החזרות, פוינטים",
      kind: "שליחות",
      img: svcStore,
    },
    {
      icon: Sofa,
      title: "הובלה קטנה",
      hint: "רהיטים, מוצרי חשמל וכאלה",
      kind: "הובלה",
      img: svcSmallMove,
    },
    {
      icon: Home,
      title: "הובלת דירה",
      hint: "צוות, משאית וביטוח כלול",
      kind: "הובלה",
      img: svcHomeMove,
    },
  ];

  // Rotating example queries typewriter
  const queries = [
    "שלח חבילה מרמת גן לחיפה עד היום",
    "צריך מוביל לספה תלת מושבית מפ״ת לתל אביב",
    "משלוח פרחים לאמא לרעננה, ברכה בפנים",
    "מסמכים דחופים ממשרד עורכי דין ליהוד",
    "קנייה בסופר: 3 שקיות, להביא לקומה 5",
    "הובלת דירת 3 חדרים מבאר שבע לירושלים",
  ];
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const full = queries[qi];
    let i = 0;
    let cancelled = false;
    setTyped("");
    const type = () => {
      if (cancelled) return;
      if (i <= full.length) {
        setTyped(full.slice(0, i));
        i++;
        setTimeout(type, 42);
      } else {
        setTimeout(() => {
          if (!cancelled) setQi((n) => (n + 1) % queries.length);
        }, 1800);
      }
    };
    type();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  return (
    <section id="services" className="relative py-24 lg:py-32 overflow-hidden bg-white">
      {/* Local keyframes */}
      <style>{`
 @keyframes svc-fade-up { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform:none;} }
 @keyframes svc-pulse-ring { 0% { transform:scale(1); opacity:.5;} 100% { transform:scale(1.6); opacity:0;} }
 @keyframes svc-float { 0%,100% { transform:translateY(0);} 50% { transform:translateY(-4px);} }
 @keyframes svc-caret { 0%,49% {opacity:1;} 50%,100% {opacity:0;} }
 .svc-appear { opacity:0; animation: svc-fade-up .7s cubic-bezier(.2,.7,.2,1) forwards; }
 `}</style>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 45% at 50% 0%, rgba(18,140,126,0.10), transparent 60%), radial-gradient(50% 40% at 50% 100%, rgba(18,140,126,0.06), transparent 60%)",
          }}
        />
      </div>

      <div className="relative max-w-[1100px] mx-auto px-5 lg:px-10" dir="rtl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-12">
          <div className="svc-appear inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: WA_GREEN }}
            />
            מה אפשר לבקש מהבוט
          </div>
          <h2
            className="svc-appear mt-4 text-[30px] sm:text-[40px] lg:text-[52px] font-bold leading-[1.05] tracking-[-0.025em]"
            style={{
              fontFamily: '"Heebo", system-ui, sans-serif',
              color: INK,
              animationDelay: ".08s",
            }}
          >
            תכתוב בשפה שלך, <span style={{ color: WA_GREEN }}>הבוט מבין</span>.
          </h2>
          <p
            className="svc-appear mt-3 text-[14.5px] sm:text-[15.5px] text-black/60 leading-[1.6]"
            style={{ animationDelay: ".16s" }}
          >
            בלי טפסים, בלי קטגוריות. פשוט אומרים מה צריך הבוט מזהה ומחפש את השליח או המוביל הכי
            מתאים ברשת.
          </p>
        </div>

        {/* Animated WhatsApp-style input compact */}
        <div
          className="svc-appear relative mx-auto max-w-[520px] rounded-2xl p-[3px] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.3)]"
          style={{
            background: `linear-gradient(135deg, ${WA_HEADER}, ${WA_GREEN})`,
            animationDelay: ".22s",
          }}
        >
          <div className="rounded-[15px] bg-white pr-3 pl-2 py-2 flex items-center gap-2.5">
            {/* Bot avatar with pulsing rings */}
            <div className="relative shrink-0">
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: `${WA_GREEN}55`,
                  animation: "svc-pulse-ring 2s ease-out infinite",
                }}
                aria-hidden
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: `${WA_GREEN}33`,
                  animation: "svc-pulse-ring 2s ease-out infinite",
                  animationDelay: ".8s",
                }}
                aria-hidden
              />
              <span
                className="relative grid place-items-center w-9 h-9 rounded-full text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_HEADER})` }}
              >
                <MessageCircle size={16} strokeWidth={2.4} />
              </span>
            </div>

            {/* Typewriter text */}
            <div className="min-w-0 flex-1 flex items-center min-h-[36px]">
              <span className="text-[13.5px] sm:text-[14.5px] font-medium text-black leading-tight truncate">
                {typed}
              </span>
              <span
                className="inline-block w-[2px] h-[15px] mr-0.5"
                style={{ background: WA_GREEN, animation: "svc-caret 1s steps(1) infinite" }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={onStart}
              className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-white shadow-[0_6px_14px_-4px_rgba(18,140,126,0.55)] hover:scale-105 active:scale-95 transition"
              style={{ background: WA_GREEN }}
              aria-label="שלח לבוט"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Service tiles refined */}
        <div className="mt-12 lg:mt-14 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {services.map((s, i) => {
            const Ic = s.icon;
            const isMove = s.kind === "הובלה";
            return (
              <button
                key={s.title}
                onClick={onStart}
                className="svc-appear group relative overflow-hidden text-right rounded-3xl bg-white border border-black/[0.07] shadow-[0_10px_28px_-16px_rgba(0,0,0,0.14)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-22px_rgba(18,140,126,0.35)] transition-all duration-300"
                style={{ animationDelay: `${0.32 + i * 0.06}s` }}
              >
                {/* Colored top block with image + centered icon */}
                <div
                  className="relative h-[130px] sm:h-[150px] overflow-hidden"
                  style={{
                    background: isMove
                      ? `linear-gradient(160deg, #F0FBF6 0%, #DFF5EB 100%)`
                      : `linear-gradient(160deg, #EAF7F4 0%, #D6EFE9 100%)`,
                  }}
                >
                  {/* Photo fills block, subtly blended */}
                  <img
                    src={s.img}
                    alt=""
                    loading="lazy"
                    width={768}
                    height={512}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ mixBlendMode: "multiply" }}
                  />
                  {/* Green tint overlay to keep brand feel */}
                  <div
                    className="absolute inset-0 mix-blend-color pointer-events-none"
                    style={{ background: `${WA_GREEN}30` }}
                    aria-hidden
                  />

                  {/* Corner ribbon kind */}
                  <span
                    className="absolute top-3 right-3 z-10 text-[9.5px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-white/85 backdrop-blur"
                    style={{ color: WA_GREEN }}
                  >
                    {s.kind}
                  </span>

                  {/* Icon medallion top-left corner */}
                  <div
                    className="absolute top-3 left-3 z-10 w-10 h-10 rounded-xl grid place-items-center group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${WA_GREEN}, #0F7368)`,
                      boxShadow: `0 10px 22px -6px ${WA_GREEN}90, inset 0 1px 0 rgba(255,255,255,0.3)`,
                      animation: "svc-float 4.5s ease-in-out infinite",
                      animationDelay: `${i * 0.35}s`,
                    }}
                  >
                    <Ic size={18} color="white" strokeWidth={2.4} />
                  </div>

                  {/* Bottom fade to white */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-8"
                    style={{ background: "linear-gradient(to bottom, transparent, white)" }}
                    aria-hidden
                  />
                </div>

                {/* Body */}
                <div className="p-4 pt-3 sm:p-5 sm:pt-3.5">
                  <div className="font-bold text-[15px] sm:text-[16px] text-black tracking-tight leading-tight">
                    {s.title}
                  </div>
                  <div className="mt-1 text-[11.5px] sm:text-[12.5px] text-black/55 leading-snug min-h-[32px]">
                    {s.hint}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: WA_GREEN }}
                    >
                      <MessageCircle size={11} strokeWidth={2.4} />
                      בקש בבוט
                    </span>
                    <span
                      className="grid place-items-center w-7 h-7 rounded-full transition-all group-hover:-translate-x-0.5"
                      style={{
                        background: WA_GREEN,
                        boxShadow: `0 6px 14px -4px ${WA_GREEN}80`,
                      }}
                    >
                      <ArrowLeft size={13} className="text-white" strokeWidth={2.8} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          className="svc-appear mt-10 text-center text-[12.5px] text-black/50 font-medium"
          style={{ animationDelay: ".9s" }}
        >
          + עשרות בקשות נוספות שהבוט יודע לטפל בהן פשוט תכתוב.
        </div>
      </div>
    </section>
  );
}

/* ============ TESTIMONIALS ============ */
function Testimonials() {
  const t = [
    {
      name: "דנה כהן",
      city: "תל אביב",
      img: real1,
      service: "משלוח חבילה",
      rating: 5,
      text: "שלחתי ספר לחברה בחיפה. הזמנתי בוואטסאפ, קיבלתי מחיר תוך 30 שניות, והחבילה הגיעה תוך 3 שעות.",
    },
    {
      name: "רון לוי",
      city: "רמת גן",
      img: real4,
      service: "הובלת דירה",
      rating: 5,
      text: "עברתי דירה בשבוע. מוביל, משאית, שני עוזרים, הכל דרך הודעה אחת. חצי מהמחיר שביקשו ממני חברות אחרות.",
    },
    {
      name: "מיכל אברהם",
      city: "פתח תקווה",
      img: real5,
      service: "מסמכים דחופים",
      rating: 5,
      text: "הכי אהבתי שראיתי את השליח על המפה. ידעתי מתי הוא מגיע. אין יותר טלפונים ל״איפה השליח״.",
    },
    {
      name: "נועה שגיא",
      city: "רעננה",
      img: personNoa,
      service: "מתנות עד הבית",
      rating: 5,
      text: "הפתעתי את אמא ליום הולדת עם זר פרחים וברכה. הבוט תיאם הכל, השליח שלח סלפי לפני שהגיע. מדהים.",
    },
    {
      name: "יוסי מזרחי",
      city: "ירושלים",
      img: personYossi,
      service: "איסוף מחנות",
      rating: 5,
      text: "החזרתי הזמנה מיד2 בלי לזוז מהבית. השליח בא, איסף, מסר. שילמתי בביט ישר בצ׳אט. פחות מרבע שעה.",
    },
    {
      name: "שירה גולן",
      city: "הרצליה",
      img: personShira,
      service: "הובלה קטנה",
      rating: 5,
      text: "מקרר חדש מרשת חשמל. תיאמתי דרך הבוט, קיבלתי 3 הצעות מובילים, בחרתי את הזול, הגיע בזמן, הכל בוטח.",
    },
  ];
  const stats = [
    { n: "12,400", l: "משלוחים החודש" },
    { n: "4.9", l: "דירוג ממוצע", star: true },
    { n: "97%", l: "לקוחות חוזרים" },
    { n: "38 שניות", l: "זמן ממוצע להצעה" },
  ];
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden" style={{ background: CANVAS }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 45% at 85% 0%, rgba(18,140,126,0.09), transparent 60%), radial-gradient(60% 45% at 15% 100%, rgba(18,140,126,0.06), transparent 60%)",
          }}
        />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-5 lg:px-10" dir="rtl">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-14">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
              <Star size={11} className="fill-yellow-400 text-yellow-400" />
              לקוחות מספרים
            </div>
            <h2
              className="mt-4 text-[30px] sm:text-[40px] lg:text-[52px] font-bold leading-[1.05] tracking-[-0.025em]"
              style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
            >
              12,400 משלוחים החודש.
              <br />
              <span style={{ color: WA_GREEN }}>4.9 דירוג ממוצע.</span>
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:pb-3">
            <p
              className="text-[14.5px] lg:text-[15.5px] text-black/60 leading-[1.7] border-r-2 pr-4"
              style={{ borderColor: WA_GREEN }}
            >
              מאות חוות דעת בכל שבוע. לקוחות שחזרו כי הבוט זכר אותם, המוביל היה בדיוק בזמן, והמחיר
              היה בדיוק מה שהובטח.
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {stats.map((s, i) => (
            <div
              key={i}
              className="relative rounded-2xl bg-white border border-black/[0.07] shadow-[0_10px_28px_-18px_rgba(0,0,0,0.15)] p-4 sm:p-5 overflow-hidden"
            >
              <div
                className="absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl"
                style={{ background: `${WA_GREEN}18` }}
                aria-hidden
              />
              <div className="relative flex items-baseline gap-1.5">
                <div
                  className="text-[26px] sm:text-[30px] font-black tracking-[-0.02em] tabular-nums"
                  style={{ color: INK }}
                >
                  {s.n}
                </div>
                {s.star && <Star size={16} className="fill-yellow-400 text-yellow-400" />}
              </div>
              <div className="relative mt-1 text-[11.5px] sm:text-[12px] text-black/55 font-medium">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Reviews marquee carousel */}
        <div
          className="relative overflow-hidden -mx-5 lg:-mx-10"
          style={{
            maskImage: "linear-gradient(to left, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to left, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="flex gap-4 lg:gap-5 animate-marquee w-max py-4 px-5 lg:px-10 hover:[animation-play-state:paused]">
            {[...t, ...t].map((r, i) => (
              <figure
                key={i}
                className="group relative shrink-0 w-[300px] sm:w-[340px] lg:w-[380px] rounded-3xl p-6 lg:p-7 bg-white border border-black/[0.07] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_28px_54px_-24px_rgba(18,140,126,0.35)] transition-all duration-300 overflow-hidden"
              >
                {/* Quote mark bg */}
                <div
                  className="absolute -top-4 -left-2 text-[140px] leading-none font-black opacity-[0.06] select-none pointer-events-none"
                  style={{ fontFamily: '"Georgia", serif', color: WA_GREEN }}
                  aria-hidden
                >
                  „
                </div>

                {/* Service tag */}
                <div className="relative flex items-center justify-between mb-4">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                    style={{ background: `${WA_GREEN}12`, color: WA_GREEN }}
                  >
                    {r.service}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} size={13} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>

                <blockquote className="relative text-[14.5px] lg:text-[15px] leading-[1.7] text-black/85 font-medium">
                  {r.text}
                </blockquote>

                <figcaption className="relative mt-6 pt-5 border-t border-black/[0.06] flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={r.img}
                      alt={r.name}
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full grid place-items-center ring-2 ring-white"
                      style={{ background: WA_GREEN }}
                    >
                      <CheckCheck size={11} className="text-white" strokeWidth={3} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] text-black tracking-tight">{r.name}</div>
                    <div className="flex items-center gap-1 text-[11.5px] text-black/50">
                      <MapPin size={10} />
                      {r.city}
                      <span className="w-1 h-1 rounded-full bg-black/25 mx-1" />
                      לקוח/ה מאומת/ת
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* Why through the bot comparison */}
        <div className="mt-16 lg:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
              <Zap size={12} color={WA_GREEN} />
              למה דרך הבוט
            </div>
            <h3
              className="mt-4 text-[24px] sm:text-[32px] lg:text-[38px] font-bold leading-[1.1] tracking-[-0.02em]"
              style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
            >
              חברות משלוחים והובלות <span style={{ color: WA_GREEN }}>מהיום להיום</span> מפוצצות במחיר. פה
              אתה עובד <span style={{ color: WA_GREEN }}>ישירות מול שליחים ומובילים פרטיים</span>
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 lg:gap-5 max-w-[980px] mx-auto">
            {/* GOI side */}
            <div
              className="relative rounded-3xl p-6 lg:p-7 overflow-hidden shadow-[0_24px_50px_-24px_rgba(18,140,126,0.5)]"
              style={{ background: `linear-gradient(160deg, ${WA_HEADER}, ${WA_GREEN})` }}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
                aria-hidden
              />
              <div className="relative flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl grid place-items-center bg-white/15 border border-white/25 backdrop-blur">
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">
                    אצלנו
                  </div>
                  <div className="text-white font-bold text-[17px] leading-tight">
                    משלוח או הובלה דרך הבוט
                  </div>
                </div>
              </div>
              <ul className="relative space-y-3">
                {[
                  "מקבל 3–5 הצעות מחיר תחרותיות תוך דקה משליחים ומובילים",
                  "אתה בוחר: הכי זול, הכי מהיר או הכי מדורג",
                  "משלם ישירות לשליח או למוביל, 0% עמלה למתווכים",
                  "רואה את השליח/המוביל על המפה, מתחילת התהליך עד סופו",
                  "אין דמי טיפול, אין הפתעות בחשבון",
                ].map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-white/95 text-[13.5px] leading-[1.55]"
                  >
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center bg-white/20 border border-white/30">
                      <Check size={12} strokeWidth={3.5} className="text-white" />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>

            {/* Traditional courier company side */}
            <div className="relative rounded-3xl p-6 lg:p-7 bg-white border-2 border-red-400/70 shadow-[0_18px_40px_-22px_rgba(239,68,68,0.35)] overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl grid place-items-center bg-black/[0.05] border border-black/10">
                  <X size={20} className="text-black/50" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">
                    אצלם
                  </div>
                  <div className="font-bold text-[17px] leading-tight text-black/80">
                    חברת שליחויות / הובלות רגילה
                  </div>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "מחיר אחיד וגבוה בלי תחרות בין שליחים או מובילים",
                  "מתקשרים אליך לוודא כתובת, בונים ומחכים",
                  "עמלת חברה של 30–50% מהמחיר לשליח או למוביל",
                  "בלי מפה, בלי עדכונים ״הוא בדרך״",
                  "דמי טיפול, ביטוח, שירות הכל בנפרד",
                ].map((it, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-black/65 text-[13.5px] leading-[1.55]"
                  >
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center bg-black/[0.05] border border-black/10">
                      <X size={12} strokeWidth={3} className="text-black/50" />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Savings pill */}
          <div className="mt-6 flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 h-10 text-[12.5px] font-bold border shadow-[0_10px_22px_-10px_rgba(18,140,126,0.4)]"
              style={{ background: "white", borderColor: `${WA_GREEN}40`, color: WA_HEADER }}
            >
              <BadgeCheck size={15} color={WA_GREEN} />
              חוסך בממוצע <span className="text-black font-black">40–50%</span> על כל משלוח או הובלה
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-[12.5px] text-black/55 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} color={WA_GREEN} /> חוות דעת מאומתות בלבד
          </span>
          <span className="w-1 h-1 rounded-full bg-black/20" />
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} color={WA_GREEN} /> יותר מ-24,000 לקוחות פעילים
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: "צריך להוריד אפליקציה?",
      a: "לא. Goi פועלת ישירות בוואטסאפ. פותחים שיחה עם המספר שלנו וזהו אין הרשמה, אין הורדות.",
    },
    {
      q: "איך נקבע המחיר?",
      a: "האלגוריתם מחשב מחיר לפי מרחק, גודל המשלוח, סוג השליח וזמינות באזור. אתה מקבל הצעה סופית לפני אישור.",
    },
    {
      q: "מי השליחים? האם זה בטוח?",
      a: "כל שליח ומוביל ברשת עובר אימות זהות, רישיונות וביטוח. יש דירוג ציבורי מלקוחות קודמים ואתה רואה בדיוק מי מגיע אליך.",
    },
    {
      q: "מה קורה אם המשלוח נפגע?",
      a: "כל משלוח מבוטח אוטומטית עד ₪1,000. להובלות גדולות ניתן להוסיף כיסוי מורחב מראש.",
    },
    {
      q: "איך משלמים?",
      a: "ישירות בצ׳אט ביט, אשראי, Apple Pay או Google Pay. תקן PCI, בלי לשמור פרטי כרטיס.",
    },
    {
      q: "אפשר לתזמן מראש?",
      a: "כן. כותבים בבוט מתי היום, מחר בבוקר, יום ראשון בערב ואנחנו נדאג שהשליח יגיע בזמן.",
    },
  ];
  return (
    <section
      id="faq"
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: CANVAS }}
    >
      {/* Ambient blobs */}
      <div
        className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${WA_GREEN}33, transparent 70%)` }}
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${WA_HEADER}33, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative max-w-[1100px] mx-auto px-5 lg:px-10">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-14 lg:mb-16">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur px-3 h-7 text-[11.5px] font-bold text-black/70">
              <HelpCircle size={12} color={WA_GREEN} />
              שאלות נפוצות
            </div>
            <h2
              className="mt-4 text-[34px] sm:text-[44px] lg:text-[56px] font-black leading-[1.02] tracking-[-0.025em]"
              style={{ fontFamily: '"Heebo", system-ui, sans-serif', color: INK }}
            >
              כל מה שרצית לדעת.
              <br />
              <span style={{ color: WA_GREEN }}>בלי אותיות קטנות.</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[15px] lg:text-[16px] text-black/60 leading-[1.7]">
              לא מצאת תשובה? כתוב לנו בוואטסאפ ונחזור אליך תוך דקות אותו בוט, אותה שיחה.
            </p>
          </div>
        </div>

        {/* Accordion */}
        <div className="grid gap-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border bg-white/80 backdrop-blur transition-all duration-300 ${
                  isOpen
                    ? "border-transparent shadow-[0_20px_44px_-24px_rgba(18,140,126,0.35)]"
                    : "border-black/[0.07] hover:border-black/15 hover:bg-white"
                }`}
                style={isOpen ? { borderColor: `${WA_GREEN}55` } : undefined}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full py-5 lg:py-6 px-5 lg:px-7 text-right flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <span
                      className="shrink-0 w-8 h-8 rounded-xl grid place-items-center text-[12px] font-black tabular-nums transition-colors"
                      style={{
                        background: isOpen ? WA_GREEN : "rgba(0,0,0,0.04)",
                        color: isOpen ? "white" : "rgba(0,0,0,0.55)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="font-bold text-[15.5px] lg:text-[17px] tracking-tight text-right">
                      {it.q}
                    </div>
                  </div>
                  <span
                    className="shrink-0 w-9 h-9 rounded-full grid place-items-center transition-all duration-300"
                    style={{
                      background: isOpen ? WA_GREEN : "rgba(0,0,0,0.04)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <Plus
                      size={17}
                      strokeWidth={2.75}
                      className={isOpen ? "text-white" : "text-black/60"}
                    />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 lg:px-7 pb-6 pr-[68px] lg:pr-[80px] text-[14.5px] text-black/65 leading-[1.7]">
                      {it.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <span className="text-[13.5px] text-black/55">עדיין יש שאלה?</span>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full h-11 px-5 text-[13.5px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(18,140,126,0.6)] hover:scale-[1.03] transition"
            style={{ background: WA_GREEN }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            כתוב לנו בוואטסאפ
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
function FinalCTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="pb-24 lg:pb-32 pt-8" style={{ background: CANVAS }}>
      <div className="max-w-[1240px] mx-auto px-5 lg:px-10">
        <div
          className="relative rounded-[36px] overflow-hidden"
          style={{
            background: `linear-gradient(150deg, ${WA_HEADER} 0%, ${WA_GREEN} 55%, #0e7d70 100%)`,
            boxShadow: "0 40px 90px -30px rgba(18,140,126,0.55)",
          }}
        >
          {/* Dotted texture */}
          <div
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden
          />
          {/* Soft glow blobs */}
          <div
            className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, #ffffff55, transparent 70%)" }}
            aria-hidden
          />
          <div
            className="absolute -bottom-40 -left-20 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, #ffffff44, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative px-5 py-12 sm:px-10 sm:py-20 lg:px-20 lg:py-28 text-center">
            {/* Live status pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 h-7 sm:h-8 text-[11.5px] sm:text-[12px] font-bold text-white">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-white" />
              </span>
              418 שליחים פעילים ברגע זה
            </div>

            <h2
              className="mt-5 sm:mt-6 text-[28px] sm:text-[52px] lg:text-[72px] font-black leading-[1.05] tracking-[-0.03em] text-white"
              style={{ fontFamily: '"Heebo", system-ui, sans-serif' }}
            >
              המשלוח הבא שלך?
              <br />
              <span className="text-white/95">בהודעת וואטסאפ אחת.</span>
            </h2>

            <p className="mt-4 sm:mt-6 text-[14px] sm:text-[17px] text-white/80 max-w-xl mx-auto leading-[1.65]">
              בלי הרשמה. בלי אפליקציה. בלי טפסים. פותחים שיחה עם הבוט, כותבים מה צריך, ומקבלים הצעות מחיר תוך דקה.
            </p>

            {/* CTAs */}
            <div className="mt-7 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={onStart}
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-6 sm:px-8 rounded-full font-bold text-[15px] sm:text-[16px] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.4)] hover:scale-[1.04] active:scale-[0.98] transition"
                style={{ background: "white", color: WA_HEADER }}
              >
                <WhatsAppIcon className="w-5 h-5" />
                התחל שיחה עכשיו
                <ArrowLeft
                  size={17}
                  strokeWidth={2.75}
                  className="transition-transform group-hover:-translate-x-1"
                />
              </button>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-6 rounded-full font-bold text-[14px] sm:text-[14.5px] text-white/90 border border-white/30 hover:bg-white/10 transition"
              >
                איך זה עובד?
              </a>
            </div>

            {/* Trust row */}
            <div className="mt-7 sm:mt-10 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-[11.5px] sm:text-[12.5px] text-white/75 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-white" /> תשלום מאובטח
              </span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} className="text-white fill-white" /> 4.9 מעל 24,000 לקוחות
              </span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} className="text-white" /> תגובה תוך 38 שניות
              </span>
            </div>
          </div>
        </div>
      </div>


      <style>{`
        @keyframes finalFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </section>
  );
}

/* ============ FOOTER ============ */
function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{ background: INK, color: "white" }}>
      {/* Ambient glow */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${WA_GREEN}, transparent 70%)` }}
        aria-hidden
      />

      {/* Courier CTA strip */}
      <div className="relative border-b border-white/10">
        <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-6 lg:py-10 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-5">
          <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-right w-full sm:w-auto">
            <div
              className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl shrink-0"
              style={{ background: `${WA_GREEN}20`, border: `1px solid ${WA_GREEN}55` }}
            >
              <Handshake size={20} color={WA_GREEN} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[14.5px] sm:text-[16px] lg:text-[18px] tracking-tight text-white leading-tight">
                שליח או מוביל? הצטרף לרשת של Goi
              </div>
              <div className="text-[12px] sm:text-[12.5px] lg:text-[13px] text-white/60 mt-0.5 leading-snug">
                עצמאים לגמרי — מקבלים הצעות עבודה ישירות מהבוט לוואטסאפ, בוחרים מה לאשר, ומנהלים את הכל באפליקציה שלכם.
              </div>
            </div>
          </div>
          <a
            href={partnersUrl("/join")}
            className="group inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full font-bold text-[13.5px] shadow-[0_12px_28px_-12px_rgba(18,140,126,0.6)] hover:scale-[1.03] active:scale-[0.98] transition shrink-0 w-full sm:w-auto"
            style={{ background: WA_GREEN, color: "white" }}
          >
            <WhatsAppIcon className="w-4 h-4" />
            הצטרף אלינו
          </a>

        </div>
      </div>


      {/* Main footer */}
      <div className="relative max-w-[1240px] mx-auto px-5 lg:px-10 py-10 lg:py-16 grid md:grid-cols-12 gap-8 md:gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span
              className="text-[24px] tracking-[-0.02em] text-white"
              style={{ fontFamily: "var(--font-wordmark)", fontWeight: 800 }}
            >
              Goi
            </span>
          </div>
          <p className="mt-4 text-[13.5px] text-white/60 leading-[1.7] max-w-sm">
            הפלטפורמה שמחברת בין לקוחות פרטיים לרשת של מאות שליחים ומובילים פרטיים. משלוחים והובלות בשיחת וואטסאפ אחת.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <a
              href="#"
              className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="וואטסאפ"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="טלפון"
            >
              <Phone size={15} className="text-white" />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="הודעה"
            >
              <MessageCircle size={15} className="text-white" />
            </a>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          <FooterCol
            title="לקוחות פרטיים"
            links={[
              ["אפליקציית הלקוחות", "/app"],
              ["איך זה עובד", "#how"],
              ["שירותים", "#services"],
              ["שאלות נפוצות", "#faq"],
            ]}
          />
          <FooterCol
            title="החברה"
            links={[
              ["הפלטפורמה", "#platform"],
              ["צור קשר", "#"],
              ["מדיניות פרטיות", "#"],
            ]}
          />
          <FooterCol
            title="שותפים"
            links={[
              ["אזור לקוחות פרטיים", "/customer-login"],
              ["שליח או מוביל?", partnersUrl("/")],
              ["התחברות שליח", "/courier-login"],
              ["כניסת עסקים", "/business-login"],
              ["ניהול", "/admin-login"],
            ]}
          />
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-6 flex items-center justify-between text-[12px] text-white/45 flex-wrap gap-3">
          <div>© {new Date().getFullYear()} Goi. כל הזכויות שמורות.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} color={WA_GREEN} /> מבוטח
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={13} color={WA_GREEN} /> מאובטח
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={13} color={WA_GREEN} /> מאומת
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[11.5px] font-bold uppercase tracking-[0.15em] mb-4 text-white/90">
        {title}
      </div>
      <ul className="space-y-2.5 text-[13.5px] text-white/55">
        {links.map(([l, h], i) => (
          <li key={i}>
            {h.startsWith("/") ? (
              <Link to={h} className="hover:text-white transition-colors">
                {l}
              </Link>
            ) : (
              <a href={h} className="hover:text-white transition-colors">
                {l}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ SHARED ICONS ============ */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  // Unified brand mark: white circle badge with the classic WhatsApp phone glyph in WA green.
  // Renders consistently on any button background (green CTAs, white, dark).
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.256.59 4.462 1.712 6.406L3.2 28.8l6.578-1.715a12.76 12.76 0 006.222 1.6h.005c7.06 0 12.8-5.74 12.8-12.8s-5.742-12.685-12.802-12.685zm0 23.31h-.004a10.6 10.6 0 01-5.4-1.478l-.387-.23-3.902 1.018 1.04-3.8-.252-.39a10.55 10.55 0 01-1.62-5.63c0-5.842 4.754-10.596 10.6-10.596 2.83 0 5.49 1.104 7.49 3.106a10.52 10.52 0 013.106 7.49c0 5.847-4.754 10.51-10.67 10.51zm5.813-7.876c-.318-.16-1.884-.93-2.176-1.036-.292-.106-.504-.16-.716.16s-.82 1.036-1.006 1.248-.372.24-.69.08c-.318-.16-1.344-.495-2.56-1.578-.946-.844-1.586-1.886-1.772-2.204-.186-.318-.02-.49.14-.65.144-.144.318-.372.478-.558.16-.186.212-.318.318-.53.106-.212.053-.398-.027-.558-.08-.16-.716-1.726-.98-2.362-.258-.62-.52-.536-.716-.546l-.61-.01c-.212 0-.556.08-.848.398-.292.318-1.113 1.086-1.113 2.646 0 1.56 1.14 3.068 1.3 3.28.16.212 2.244 3.428 5.436 4.808.76.328 1.353.524 1.816.67.762.242 1.456.208 2.005.126.612-.09 1.884-.77 2.15-1.512.266-.742.266-1.378.186-1.512-.08-.132-.29-.212-.61-.372z"/>
    </svg>
  );
}
function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/* ============================================================ */
/* ============ ORDER WIDGET (inline + modal) ================= */
/* ============================================================ */

type Msg = { who: "bot" | "me"; text: string; time?: string };
type Step =
  | "track"
  | "subtype"
  | "from"
  | "from_floor"
  | "to"
  | "to_floor"
  | "fragile"
  | "assembly"
  | "when"
  | "phone"
  | "quote"
  | "pay"
  | "processing"
  | "done";
type PayMethod = "bit" | "card" | "apple" | "google" | "cash";
type Track = "delivery" | "moving";

const TRACK_OPTIONS: {
  id: Track;
  label: string;
  desc: string;
  icon: typeof Package;
  hint: string;
}[] = [
  {
    id: "delivery",
    label: "שליח",
    desc: "חבילה, מסמכים, מתנה, יד2",
    icon: Package,
    hint: "עד 30 ק״ג · שליח בודד",
  },
  {
    id: "moving",
    label: "מוביל",
    desc: "רהיטים, דירה, משרד",
    icon: Sofa,
    hint: "פריט · דירה · צוות ומשאית",
  },
];

const DELIVERY_SUBTYPES = [
  { id: "docs", label: "מעטפה / מסמכים", desc: "עד 1 ק״ג · דחוף", icon: FileText },
  { id: "small", label: "חבילה קטנה", desc: "עד 5 ק״ג", icon: Package },
  { id: "medium", label: "חבילה בינונית", desc: "עד 15 ק״ג", icon: Package },
  { id: "large", label: "חבילה גדולה", desc: "עד 30 ק״ג", icon: Package },
];

const MOVING_SUBTYPES = [
  { id: "single", label: "פריט בודד", desc: "ספה, מקרר, מיטה", icon: Sofa },
  { id: "few", label: "כמה פריטים", desc: "3-10 פריטים", icon: Sofa },
  { id: "apartment", label: "דירה שלמה", desc: "מלאה", icon: Home },
  { id: "office", label: "משרד / עסק", desc: "ציוד משרדי", icon: Home },
];

const FLOOR_OPTIONS = [
  { id: "0", label: "קרקע", desc: "ללא מדרגות" },
  { id: "1-3e", label: "1-3 עם מעלית", desc: "" },
  { id: "1-3n", label: "1-3 בלי מעלית", desc: "" },
  { id: "4e", label: "4+ עם מעלית", desc: "" },
  { id: "4n", label: "4+ בלי מעלית", desc: "צריך צוות" },
];

const ASSEMBLY_OPTIONS = [
  { id: "yes", label: "כן, מלא", desc: "פירוק + הרכבה" },
  { id: "partial", label: "חלקי", desc: "רק פירוק / רק הרכבה" },
  { id: "no", label: "לא צריך", desc: "מוכן להעברה" },
];

const FRAGILE_OPTIONS = [
  { id: "yes", label: "כן, שביר", desc: "טיפול עדין" },
  { id: "no", label: "לא", desc: "רגיל" },
];

const WHEN_DELIVERY = [
  { id: "now", label: "עכשיו", desc: "איסוף תוך שעה" },
  { id: "today", label: "היום", desc: "עוד היום" },
  { id: "tomorrow", label: "מחר", desc: "בחירת שעה" },
  { id: "scheduled", label: "תזמון מדויק", desc: "יום ושעה" },
];

const WHEN_MOVING = [
  { id: "today", label: "היום", desc: "אם יש זמינות" },
  { id: "tomorrow", label: "מחר", desc: "בחירת שעה" },
  { id: "week", label: "השבוע", desc: "3-7 ימים" },
  { id: "scheduled", label: "תזמון מדויק", desc: "יום ושעה" },
];

const PAY_BASE: { id: PayMethod; label: string; sub: string }[] = [
  { id: "bit", label: "ביט", sub: "העברה מיידית" },
  { id: "card", label: "אשראי", sub: "Visa · Mastercard" },
  { id: "apple", label: "Apple Pay", sub: "מהיר ומאובטח" },
  { id: "google", label: "Google Pay", sub: "מהיר ומאובטח" },
];
const PAY_CASH = { id: "cash" as PayMethod, label: "מזומן בהגעה", sub: "משולם למוביל" };

function now() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

type OptionLike = { label: string; desc?: string };

function useOrderFlow() {
  const [step, setStep] = useState<Step>("track");
  const [track, setTrack] = useState<Track | null>(null);
  const [subtypeLabel, setSubtypeLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [eta, setEta] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: "bot", text: "שלום 👋 אני הבוט של Goi.\nאת מי אני מחפש לך היום?", time: "" },
  ]);
  useEffect(() => {
    setMsgs((m) => m.map((msg, i) => (i === 0 && !msg.time ? { ...msg, time: now() } : msg)));
  }, []);
  const [typing, setTyping] = useState(false);

  const botSay = (text: string, delay = 650) =>
    new Promise<void>((resolve) => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMsgs((m) => [...m, { who: "bot", text, time: now() }]);
        resolve();
      }, delay);
    });
  const meSay = (text: string) => setMsgs((m) => [...m, { who: "me", text, time: now() }]);

  /* Step 1 track (משלוח / הובלה) */
  const pickTrack = async (t: (typeof TRACK_OPTIONS)[number]) => {
    setTrack(t.id);
    meSay(t.label);
    if (t.id === "delivery") {
      await botSay("מעולה. איזה משלוח?");
    } else {
      await botSay("מעולה. מה מעבירים?");
    }
    setStep("subtype");
  };

  /* Step 2 subtype (varies by track) */
  const pickSubtype = async (s: OptionLike & { id: string }) => {
    setSubtypeLabel(s.label);
    meSay(s.label);
    await botSay("קיבלתי. מאיפה אוספים? 📍");
    setStep("from");
  };

  const submitFrom = async (v: string) => {
    if (!v.trim()) return;
    setFrom(v);
    meSay(`📍 ${v}`);
    if (track === "moving") {
      await botSay("באיזו קומה זה?");
      setStep("from_floor");
    } else {
      await botSay("מעולה. ולאן מוסרים?");
      setStep("to");
    }
  };
  const pickFromFloor = async (f: (typeof FLOOR_OPTIONS)[number]) => {
    meSay(`🏢 מוצא: ${f.label}`);
    await botSay("ולאן מעבירים?");
    setStep("to");
  };
  const submitTo = async (v: string) => {
    if (!v.trim()) return;
    setTo(v);
    meSay(`📍 ${v}`);
    if (track === "moving") {
      await botSay("ובאיזו קומה ביעד?");
      setStep("to_floor");
    } else if (subtypeLabel.includes("מעטפה")) {
      // Skip fragile for docs
      await botSay("מתי לאסוף? ⏱");
      setStep("when");
    } else {
      await botSay("יש משהו שביר או עדין?");
      setStep("fragile");
    }
  };
  const pickToFloor = async (f: (typeof FLOOR_OPTIONS)[number]) => {
    meSay(`🏢 יעד: ${f.label}`);
    await botSay("צריך פירוק / הרכבה של רהיטים?");
    setStep("assembly");
  };
  const pickFragile = async (f: (typeof FRAGILE_OPTIONS)[number]) => {
    meSay(f.label);
    await botSay("מתי לאסוף? ⏱");
    setStep("when");
  };
  const pickAssembly = async (a: (typeof ASSEMBLY_OPTIONS)[number]) => {
    meSay(a.label);
    await botSay("מתי נוח לך שיגיעו? ⏱");
    setStep("when");
  };
  const pickWhen = async (w: OptionLike & { id: string }) => {
    meSay(w.label);
    await botSay("מספר טלפון לעדכונים וקישור מעקב?");
    setStep("phone");
  };

  const submitPhone = async (v: string) => {
    const clean = v.replace(/[-\s]/g, "");
    if (!/^0\d{8,9}$/.test(clean)) return;
    meSay(`📱 ${v}`);
    setTyping(true);
    setTimeout(async () => {
      setTyping(false);
      if (track === "delivery") {
        setMsgs((m) => [...m, { who: "bot", text: "מחפש שליח מבין 127 באזור...", time: now() }]);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const p = 32 + Math.floor(Math.random() * 40);
          const e = "45 דקות";
          setPrice(p);
          setEta(e);
          setMsgs((m) => [
            ...m,
            {
              who: "bot",
              text: `✅ נמצאה התאמה\n\n📦 ${subtypeLabel}\n📍 ${from}\n➡️ ${to}\n⏱ הגעה: ${e}\n\n💰 סה״כ: ${p}₪ · כולל ביטוח`,
              time: now(),
            },
          ]);
          setStep("quote");
        }, 1200);
      } else {
        setMsgs((m) => [
          ...m,
          { who: "bot", text: "בודק זמינות אצל 3 מובילים באזור...", time: now() },
        ]);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const min = 480 + Math.floor(Math.random() * 120);
          const max = min + 200 + Math.floor(Math.random() * 150);
          const e = "אישור סופי תוך 2-5 דקות";
          setPrice(min);
          setPriceMax(max);
          setEta(e);
          setMsgs((m) => [
            ...m,
            {
              who: "bot",
              text: `📋 טווח מחיר משוער\n\n🛋 ${subtypeLabel}\n📍 ${from}\n➡️ ${to}\n\n💰 ${min} - ${max}₪ · כולל צוות ומשאית\n\nמוביל יאשר מחיר סופי תוך 2-5 דק׳`,
              time: now(),
            },
          ]);
          setStep("quote");
        }, 1400);
      }
    }, 900);
  };

  const proceedToPay = async () => {
    meSay(track === "moving" ? "אישור המחיר" : "מאשר ומשלם");
    await botSay(
      track === "moving" ? "בחר אמצעי תשלום 🔒\n(מזומן משולם למוביל בהגעה)" : "בחר אמצעי תשלום 🔒",
    );
    setStep("pay");
  };

  const pickPay = async (pm: PayMethod) => {
    const all = track === "moving" ? [...PAY_BASE, PAY_CASH] : PAY_BASE;
    const label = all.find((p) => p.id === pm)?.label ?? "";
    meSay(`💳 ${label}`);
    setStep("processing");
    setTyping(true);
    setTimeout(async () => {
      setTyping(false);
      if (pm === "cash") {
        setMsgs((m) => [
          ...m,
          { who: "bot", text: `✅ הזמנה נשמרה · תשלום ${price}₪ בהגעה`, time: now() },
        ]);
      } else {
        setMsgs((m) => [
          ...m,
          {
            who: "bot",
            text: `✅ תשלום ${price}${priceMax ? ` (מקדמה מתוך ${priceMax})` : "₪"} אושר`,
            time: now(),
          },
        ]);
      }
      await botSay(
        track === "moving"
          ? "צוות המובילים בדרך אליך.\nקישור מעקב נשלח לוואטסאפ 📍"
          : "יוסי (⭐ 5.0) בדרך אליך.\nקישור מעקב נשלח לוואטסאפ 📍",
        700,
      );
      setStep("done");
    }, 1600);
  };

  return {
    step,
    msgs,
    typing,
    track,
    subtypeLabel,
    from,
    to,
    price,
    priceMax,
    eta,
    pickTrack,
    pickSubtype,
    submitFrom,
    pickFromFloor,
    submitTo,
    pickToFloor,
    pickFragile,
    pickAssembly,
    pickWhen,
    submitPhone,
    proceedToPay,
    pickPay,
  };
}

function ChatMessages({
  msgs,
  typing,
  flow,
}: {
  msgs: Msg[];
  typing: boolean;
  flow?: ReturnType<typeof useOrderFlow>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [msgs, typing, flow?.step]);
  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0"
      style={{
        background: "#EFEAE2",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%23000' stroke-opacity='0.035' stroke-width='1.2'><path d='M20 30 q10 -12 22 0 q10 12 22 0'/><path d='M65 70 q10 -12 22 0 q10 12 22 0'/><circle cx='30' cy='85' r='5'/><circle cx='95' cy='25' r='5'/><path d='M8 105 l6 -8 l6 8 z'/><path d='M100 100 l6 -8 l6 8 z'/></g></svg>\")",
      }}
    >
      {/* Date divider */}
      <div className="flex justify-center py-1">
        <span className="text-[10.5px] text-black/55 bg-white/85 px-2.5 py-0.5 rounded-md shadow-sm">
          היום
        </span>
      </div>

      {msgs.map((m, i) => {
        const prev = msgs[i - 1];
        const grouped = prev && prev.who === m.who;
        return (
          <div
            key={i}
            className={`flex ${m.who === "me" ? "justify-end" : "justify-start"} animate-[fadeIn_0.22s_ease-out] ${grouped ? "" : "pt-1"}`}
          >
            <div
              className={`relative max-w-[82%] px-2.5 py-1.5 text-[13.5px] leading-[1.35] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] whitespace-pre-line ${
                m.who === "me"
                  ? `rounded-[7px] ${grouped ? "" : "rounded-tr-[2px]"}`
                  : `rounded-[7px] ${grouped ? "" : "rounded-tl-[2px]"}`
              }`}
              style={{ background: m.who === "me" ? WA_BUBBLE_ME : "#FFFFFF", color: "#111B21" }}
            >
              {/* WA tail */}
              {!grouped && (
                <span
                  aria-hidden
                  className="absolute top-0 w-0 h-0"
                  style={
                    m.who === "me"
                      ? {
                          right: -6,
                          borderTop: `8px solid ${WA_BUBBLE_ME}`,
                          borderLeft: "6px solid transparent",
                        }
                      : {
                          left: -6,
                          borderTop: `8px solid #FFFFFF`,
                          borderRight: "6px solid transparent",
                        }
                  }
                />
              )}
              <span className="pr-1">{m.text}</span>
              <span className="inline-flex items-center gap-0.5 float-left mt-1 mr-2 rtl:ml-0">
                <span className="text-[10px] text-black/45 tabular-nums" suppressHydrationWarning>
                  {m.time}
                </span>
                {m.who === "me" && <CheckCheck size={13} className="text-[#53BDEB]" />}
              </span>
              <span className="clear-both block" />
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="flex justify-start pt-1">
          <div className="bg-white rounded-[7px] rounded-tl-[2px] px-3 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
            <TypingDots />
          </div>
        </div>
      )}
      {flow && !typing && <InlineActions flow={flow} />}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }`}</style>
    </div>
  );
}

/* Inline interactive buttons appear under the last bot bubble like WA reply buttons */
function InlineActions({ flow }: { flow: ReturnType<typeof useOrderFlow> }) {
  const { step, track, price, priceMax, eta, subtypeLabel } = flow;

  /* Step 1 משלוח / הובלה */
  if (step === "track") {
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {TRACK_OPTIONS.map((t) => {
            const Ic = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => flow.pickTrack(t)}
                className="text-right p-3 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] hover:border-[#008069] active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `${WA_GREEN}18` }}
                  >
                    <Ic size={17} color="#008069" />
                  </div>
                  <div className="font-bold text-[14px] leading-tight">{t.label}</div>
                </div>
                <div className="text-[11px] text-black/60 leading-tight">{t.desc}</div>
                <div className="text-[10px] text-black/40 mt-1 leading-tight">{t.hint}</div>
              </button>
            );
          })}
        </div>
      </ActionCard>
    );
  }

  /* Step 2 subtype (varies by track) */
  if (step === "subtype") {
    const options = track === "moving" ? MOVING_SUBTYPES : DELIVERY_SUBTYPES;
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((s) => {
            const Ic = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => flow.pickSubtype(s)}
                className="text-right p-2 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-md grid place-items-center shrink-0"
                  style={{ background: `${WA_GREEN}18` }}
                >
                  <Ic size={14} color="#008069" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold truncate leading-tight">
                    {s.label}
                  </div>
                  <div className="text-[10.5px] text-black/50 truncate leading-tight">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </ActionCard>
    );
  }

  /* Floor selection (moving) */
  if (step === "from_floor" || step === "to_floor") {
    const onPick = step === "from_floor" ? flow.pickFromFloor : flow.pickToFloor;
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {FLOOR_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className="p-2.5 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition text-right"
            >
              <div className="text-[12.5px] font-semibold leading-tight">{f.label}</div>
              {f.desc && (
                <div className="text-[10.5px] text-black/50 mt-0.5 leading-tight">{f.desc}</div>
              )}
            </button>
          ))}
        </div>
      </ActionCard>
    );
  }

  if (step === "fragile") {
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {FRAGILE_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => flow.pickFragile(f)}
              className="p-2.5 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition text-right"
            >
              <div className="text-[12.5px] font-semibold leading-tight">{f.label}</div>
              <div className="text-[10.5px] text-black/50 mt-0.5 leading-tight">{f.desc}</div>
            </button>
          ))}
        </div>
      </ActionCard>
    );
  }

  if (step === "assembly") {
    return (
      <ActionCard>
        <div className="grid grid-cols-1 gap-1.5">
          {ASSEMBLY_OPTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => flow.pickAssembly(a)}
              className="p-2.5 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition text-right flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-[12.5px] font-semibold leading-tight">{a.label}</div>
                <div className="text-[10.5px] text-black/50 mt-0.5 leading-tight">{a.desc}</div>
              </div>
              <ArrowLeft size={13} className="text-black/30" />
            </button>
          ))}
        </div>
      </ActionCard>
    );
  }

  if (step === "when") {
    const options = track === "moving" ? WHEN_MOVING : WHEN_DELIVERY;
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((w) => (
            <button
              key={w.id}
              onClick={() => flow.pickWhen(w)}
              className="p-2.5 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition text-right flex items-center gap-2"
            >
              <Clock size={13} className="text-black/40 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate leading-tight">{w.label}</div>
                {w.desc && (
                  <div className="text-[10.5px] text-black/50 truncate leading-tight">{w.desc}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </ActionCard>
    );
  }

  if (step === "quote") {
    const isRange = track === "moving" && priceMax > 0;
    return (
      <ActionCard>
        <div className="rounded-lg p-2.5 mb-2" style={{ background: `${WA_GREEN}10` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-black/55">
                {isRange ? "טווח משוער" : "סה״כ לתשלום"}
              </div>
              <div className="text-[20px] font-black tracking-tight leading-none mt-0.5">
                {isRange ? `${price}-${priceMax}₪` : `${price}₪`}
              </div>
            </div>
            <div className="text-left">
              <div className="text-[10.5px] text-black/55">{isRange ? "אישור סופי" : "הגעה"}</div>
              <div className="text-[12px] font-semibold mt-0.5 leading-tight">
                {isRange ? "2-5 דק׳" : eta}
              </div>
            </div>
          </div>
          <div className="text-[10.5px] text-black/55 mt-1.5 pt-1.5 border-t border-black/[0.08]">
            {subtypeLabel} · כולל ביטוח{track === "moving" ? " · צוות ומשאית" : ""}
          </div>
        </div>
        <button
          onClick={flow.proceedToPay}
          className="w-full h-11 rounded-full font-bold text-white text-[14px] flex items-center justify-center gap-2 transition hover:opacity-95 active:scale-[0.99]"
          style={{ background: "#008069" }}
        >
          <Lock size={14} /> {isRange ? "אישור טווח והמשך" : "אישור ותשלום מאובטח"}
        </button>
      </ActionCard>
    );
  }

  if (step === "pay") {
    const options = track === "moving" ? [...PAY_BASE, PAY_CASH] : PAY_BASE;
    return (
      <ActionCard>
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((p) => (
            <button
              key={p.id}
              onClick={() => flow.pickPay(p.id)}
              className="text-right p-2 rounded-lg border border-black/[0.08] hover:bg-black/[0.03] active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-2">
                <PayLogo id={p.id} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold truncate leading-tight">
                    {p.label}
                  </div>
                  <div className="text-[10px] text-black/50 truncate leading-tight">{p.sub}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-black/45 pt-2">
          <Lock size={10} /> PCI · לא נשמרים פרטי כרטיס
        </div>
      </ActionCard>
    );
  }

  if (step === "processing") {
    return (
      <ActionCard>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border-2 border-black/10 border-t-[#008069] animate-spin" />
          <div className="text-[13px] text-black/70">מעבד תשלום מאובטח...</div>
        </div>
      </ActionCard>
    );
  }

  if (step === "done") {
    return (
      <ActionCard>
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full grid place-items-center shrink-0"
            style={{ background: "#008069" }}
          >
            <Check size={20} color="white" strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[13.5px] leading-tight">ההזמנה אושרה ✓</div>
            <div className="text-[11.5px] text-black/60 mt-0.5 leading-tight">
              קישור מעקב נשלח לוואטסאפ
            </div>
          </div>
        </div>
      </ActionCard>
    );
  }

  return null;
}

/* WhatsApp-style bubble container for interactive buttons */
function ActionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start pt-1 animate-[fadeIn_0.25s_ease-out]">
      <div className="max-w-[85%] w-full p-2 rounded-[7px] rounded-tl-[2px] bg-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative">
        <span
          aria-hidden
          className="absolute top-0 w-0 h-0"
          style={{ left: -6, borderTop: `8px solid #FFFFFF`, borderRight: "6px solid transparent" }}
        />
        {children}
      </div>
    </div>
  );
}

function ChatInput({ flow }: { flow: ReturnType<typeof useOrderFlow> }) {
  const { step } = flow;
  const isText = step === "from" || step === "to" || step === "phone";

  return (
    <div className="p-2" style={{ background: "#F0F2F5" }}>
      {step === "from" && (
        <TextInput
          placeholder="הקלד כתובת איסוף עיר, רחוב, מספר"
          onSubmit={flow.submitFrom}
          icon={<MapPin size={16} />}
        />
      )}
      {step === "to" && (
        <TextInput
          placeholder="הקלד כתובת יעד"
          onSubmit={flow.submitTo}
          icon={<MapPin size={16} />}
        />
      )}
      {step === "phone" && (
        <TextInput
          placeholder="050-1234567"
          onSubmit={flow.submitPhone}
          icon={<Phone size={16} />}
          type="tel"
        />
      )}
      {!isText && (
        <div
          className="flex items-center gap-2 bg-white rounded-full h-11 px-3 opacity-90"
          dir="rtl"
        >
          <span className="text-black/30">
            <Package size={17} />
          </span>
          <div className="flex-1 text-[13px] text-black/40 truncate">
            בחר אפשרות מהכפתורים למעלה 👆
          </div>
          <span className="text-black/25">
            <Phone size={17} />
          </span>
        </div>
      )}
    </div>
  );
}

function StepBar({ step }: { step: Step }) {
  const pct = (
    {
      track: 6,
      subtype: 14,
      from: 24,
      from_floor: 32,
      to: 42,
      to_floor: 50,
      fragile: 55,
      assembly: 55,
      when: 65,
      phone: 74,
      quote: 84,
      pay: 92,
      processing: 97,
      done: 100,
    } as Record<Step, number>
  )[step];
  return (
    <div className="h-[3px] bg-black/5">
      <div
        className="h-full transition-all duration-500"
        style={{ background: WA_GREEN, width: `${pct}%` }}
      />
    </div>
  );
}

function WAHeader({ typing, onClose }: { typing: boolean; onClose?: () => void }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/10"
      style={{ background: "#008069", color: "white" }}
      dir="ltr"
    >
      {onClose ? (
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-full hover:bg-white/10"
          aria-label="סגור"
        >
          <ArrowLeft size={20} className="rotate-180" />
        </button>
      ) : null}
      <div className="relative shrink-0">
        <GoiLogoBadge size={42} />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 z-10"
          style={{ background: "#22c55e", borderColor: "#008069" }}
        />
      </div>
      <div className="flex-1 min-w-0 text-right" dir="rtl">
        <div className="text-[15.5px] font-semibold leading-tight flex items-center gap-1.5">
          <span>Goi · שליחויות והובלות</span>
          <ShieldCheck size={13} className="text-white/80" />
        </div>
        <div className="text-[11.5px] text-white/85 leading-tight mt-0.5">
          {typing ? "מקליד..." : "מקוון · תגובה מיידית"}
        </div>
      </div>
      <div className="flex items-center gap-3 text-white/90">
        <Phone size={17} className="opacity-90" />
        <MessageCircle size={17} className="opacity-90" />
      </div>
    </div>
  );
}

function OrderWidget() {
  const flow = useOrderFlow();
  return (
    <div className="w-full rounded-[24px] sm:rounded-[28px] overflow-hidden bg-white border border-black/[0.08] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35)] flex flex-col h-[560px] sm:h-[620px] lg:h-[640px]">
      <WAHeader typing={flow.typing} />
      <ChatMessages msgs={flow.msgs} typing={flow.typing} flow={flow} />
      <ChatInput flow={flow} />
      <StepBar step={flow.step} />
    </div>
  );
}

function OrderModal({ onClose }: { onClose: () => void }) {
  const flow = useOrderFlow();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-[fadeIn_0.2s]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-[440px] h-[94vh] sm:h-[740px] sm:rounded-[28px] overflow-hidden shadow-2xl flex flex-col bg-white animate-[slideUp_0.3s_ease-out]">
        <WAHeader typing={flow.typing} onClose={onClose} />
        <ChatMessages msgs={flow.msgs} typing={flow.typing} flow={flow} />
        <ChatInput flow={flow} />
        <StepBar step={flow.step} />
      </div>
      <style>{`
 @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
 @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
 `}</style>
    </div>
  );
}

function PayLogo({ id }: { id: PayMethod }) {
  const base =
    "w-9 h-9 rounded-lg grid place-items-center shrink-0 text-white font-black text-[10.5px]";
  if (id === "bit")
    return (
      <div className={base} style={{ background: "#0066FF" }}>
        bit
      </div>
    );
  if (id === "card")
    return (
      <div className={base} style={{ background: INK }}>
        <CreditCard size={15} />
      </div>
    );
  if (id === "apple") return <div className={base} style={{ background: INK }}></div>;
  if (id === "cash")
    return (
      <div className={base} style={{ background: "#22c55e" }}>
        ₪
      </div>
    );
  return (
    <div className={base} style={{ background: "#4285F4" }}>
      G
    </div>
  );
}

function TextInput({
  placeholder,
  onSubmit,
  icon,
  type = "text",
}: {
  placeholder: string;
  onSubmit: (v: string) => void;
  icon?: React.ReactNode;
  type?: string;
}) {
  const [v, setV] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
        setV("");
      }}
      className="flex items-center gap-2 bg-black/5 rounded-full pl-1 pr-4 h-12"
    >
      {icon && <span className="text-black/40">{icon}</span>}
      <input
        ref={inputRef}
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-black/40"
      />
      <button
        type="submit"
        className="w-10 h-10 rounded-full grid place-items-center hover:scale-105 transition"
        style={{ background: WA_GREEN }}
      >
        <WhatsAppIcon className="w-5 h-5 text-white" />
      </button>
    </form>
  );
}
