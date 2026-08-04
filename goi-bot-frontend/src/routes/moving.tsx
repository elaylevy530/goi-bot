import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import tileMunch from "@/assets/tile-munch.png";
import tileMove from "@/assets/tile-move.png";
import tileBring from "@/assets/tile-bring.png";
import tileDelivery from "@/assets/tile-delivery.png";
import homeShot from "@/assets/home-screen-shot.png";
import deliveryScreen from "@/assets/delivery-screen.png.asset.json";
import moverAvi from "@/assets/mover-avi.jpg";
import moverYossi from "@/assets/mover-yossi.jpg";
import moverMoshe from "@/assets/mover-moshe.jpg";
import {
  ArrowLeft,
  MapPin,
  Star,
  Check,
  Clock,
  X,
  Package,
  Home,
  ShoppingBag,
  MessageCircle,
  Zap,
  Plus,
  Menu,
  Bell,
  Navigation,
  UserCircle2,
  Activity,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Download,
  Bike,
  Truck,
  HandPlatter,
  Sofa,
  Bed,
  Refrigerator,
  Tv,
  Piano,
  Boxes,
  Armchair,
  Wallet,
  PackageCheck,
  TrendingUp,
  Gift,
  Route as RouteIcon,
  CreditCard,
  Phone,
  Camera,
  Utensils,
  WashingMachine,
  Handshake,
  BadgeCheck,
  Lock,
  Timer,
  Users,
  Shield,
  Copy,
  Link2 as LinkIcon,

} from "lucide-react";

import { InstallAppButton } from "@/components/InstallApp";

const SITE_URL = "https://goi-bot.lovable.app";
const OG_IMAGE = SITE_URL + "/og-join.jpg";

export const Route = createFileRoute("/moving")({
  head: () => ({
    meta: [
      { title: "הובלות Goi — הובלה קטנה, דירה או משרד בקליק" },
      {
        name: "description",
        content:
          "צריכים הובלה? Goi מחברת אתכם למובילים מומלצים להובלות קטנות, דירות ומשרדים. קבלו הצעות מחיר בזמן אמת, עקבו אחר המשאית במפה ושלמו בביטחון.",
      },
      { property: "og:title", content: "הובלות Goi — עוברים דירה בקלות" },
      {
        property: "og:description",
        content:
          "הובלות קטנות וגדולות בכמה נגיעות. מפה חיה, צ׳אט עם המוביל וביטוח מלא — הכל באפליקציה של Goi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/moving" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/moving" }],
  }),
  component: MovingLandingPage,
});

/* ============ TOKENS ============ */
const BRAND = "#35AD29";
const BRAND_DARK = "#2E9A24";
const INK = "#0A0A0A";
const CANVAS = "#F7F6F2";
const YELLOW = "#F5C518";
const MOVE_BLUE = "#5C7CFA";
const font = { fontFamily: "'Heebo','Assistant',system-ui,sans-serif" };

/* ============ ROOT ============ */
function MovingLandingPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen w-full antialiased"
      style={{ ...font, background: CANVAS, color: INK }}
    >
      <Nav />
      <MovingHero />
      <TrustBar />
      <MovingShowcase />
      <TrackAndChatShowcase />
      <FeaturesGrid />
      <InstallSection />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ============ NAV ============ */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        dir="rtl"
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-black/40 border-b border-white/10"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-2 px-4 sm:px-5 lg:px-10 h-16">
          <Link to="/" className="flex items-center shrink-0" aria-label="Goi">
            <GoiLogoBadge size={34} />
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-[14px] text-white/80">
            <Link to="/" className="hover:text-white transition">בית</Link>
            <a href="#how" className="hover:text-white transition">איך זה עובד</a>
            <Link to="/deliveries" className="hover:text-white transition">משלוחים</Link>
            <Link to="/moving" className="hover:text-white transition">הובלות</Link>
            <a href="#faq" className="hover:text-white transition">שאלות</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="פתח תפריט"
              className="md:hidden w-11 h-11 grid place-items-center rounded-xl bg-white/10 border border-white/20 text-white backdrop-blur"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>


      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[86%] max-w-[360px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-black/[0.06]">
              <GoiLogoBadge size={34} />
              <button onClick={() => setOpen(false)} className="w-10 h-10 grid place-items-center rounded-full hover:bg-black/5">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
              {[
                ["בית", "/"],
                ["איך זה עובד", "#how"],
                ["משלוחים", "/deliveries"],
                ["הובלות", "/moving"],
                ["שאלות", "#faq"],
              ].map(([label, href]) => {
                const cls = "flex items-center justify-between text-right px-4 py-3.5 rounded-xl hover:bg-black/[0.04] text-[16px] font-semibold text-black";
                return href.startsWith("/") ? (
                  <Link key={href} to={href} onClick={() => setOpen(false)} className={cls}>
                    <span>{label}</span>
                    <ArrowLeft size={16} className="text-black/40" />
                  </Link>
                ) : (
                  <a key={href} href={href} onClick={() => setOpen(false)} className={cls}>
                    <span>{label}</span>
                    <ArrowLeft size={16} className="text-black/30" />
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t border-black/[0.06]">
              <a
                href="#install"
                onClick={() => setOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full text-white font-bold text-[15px]"
                style={{ background: BRAND }}
              >
                <Download className="w-5 h-5" />
                התקינו את האפליקציה
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoiLogoBadge({ size = 34 }: { size?: number }) {
  const fontSize = Math.max(9, Math.round(size * 0.36));
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <span
        className="rounded-full grid place-items-center shadow-[0_4px_10px_-3px_rgba(53,173,41,0.55)]"
        style={{
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 30% 30%, #4EC244, ${BRAND} 55%, #1E7217)`,
        }}
      >
        <span className="text-white tracking-[-0.03em] leading-none font-black" style={{ fontSize }}>
          GOI
        </span>
      </span>
    </span>
  );
}

/* ============ HERO ============ */
function MovingHero() {
  return (
    <section className="relative overflow-hidden bg-[#0A0B0D] text-white">
      {/* Ambient background: grid + orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 85%)",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl opacity-40"
          style={{ background: `radial-gradient(closest-side, ${BRAND}, transparent 70%)` }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(closest-side, ${YELLOW}, transparent 70%)` }} />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 pt-24 sm:pt-28 lg:pt-32 pb-6 lg:pb-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-6 sm:gap-10 lg:gap-14 items-center">
        <div className="text-center lg:text-right">



          <h1
            className="text-[32px] leading-[1.05] sm:text-[54px] sm:leading-[1] lg:text-[72px] lg:leading-[0.96] font-black tracking-[-0.04em]"
          >
            צריך הובלה קטנה,
            <span className="block mt-1">דירה או משרד?</span>
            <span className="block mt-1 sm:mt-2">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(100deg, ${BRAND} 0%, #6EE7B7 50%, ${BRAND} 100%)` }}
              >
                יש GOI הובלות.
              </span>
            </span>
          </h1>

          <p className="mt-4 lg:mt-7 text-[15px] sm:text-[18px] lg:text-[19.5px] leading-[1.6] sm:leading-[1.7] text-white/60 max-w-[560px] mx-auto lg:mx-0">
            <span className="font-semibold text-white/90">מאות מובילים מומלצים זמינים עבורכם.</span>
            <span className="block mt-1.5 sm:mt-2">הובלה עם ביטוח, מפה חיה וצ'אט ישיר.</span>
            <span className="block mt-2 sm:mt-3 font-semibold text-white/90">בלי כאבי ראש. פשוט עוברים דירה.</span>
          </p>



          <div className="mt-7 lg:mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link
              to="/customer/new-order"
              className="group relative inline-flex items-center gap-3 h-14 sm:h-16 px-8 rounded-full font-bold text-[15px] sm:text-[17px] overflow-hidden transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${BRAND} 0%, #2b8f22 100%)`,
                color: "white",
                boxShadow: `0 20px 40px -10px ${BRAND}66`,
              }}
            >
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>הזמנת הובלה עכשיו</span>
            </Link>

            <a
              href="#install"
              className="group relative inline-flex items-center gap-3 h-14 sm:h-16 px-8 rounded-full font-bold text-[15px] sm:text-[17px] overflow-hidden transition hover:scale-[1.02] active:scale-[0.98] border-2 border-white/20 hover:border-white/40 bg-white/5 backdrop-blur-sm"
              style={{
                color: "white",
              }}
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>התקנת אפליקציה</span>
            </a>
          </div>



          {/* Trust micro-row - desktop only, mobile version below phone */}
          <div className="hidden lg:flex mt-7 items-center gap-4 justify-start text-[12.5px] text-white/55 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} style={{ color: BRAND }} />
              תשלום בטוח לגמרי
            </span>
            <span className="size-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5">
              <Zap size={15} style={{ color: YELLOW }} />
              מוכן לשימוש בשנייה
            </span>
            <span className="size-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5">
              <Star size={15} className="fill-current" style={{ color: YELLOW }} />
              אוהבים אותנו — 4.9 מ-2,400 לקוחות
            </span>
          </div>


        </div>

        {/* Phone stack */}
        <div className="relative flex justify-center lg:justify-end min-h-[560px] lg:min-h-[600px] items-center">
          <div className="relative scale-[0.82] sm:scale-[0.88] lg:scale-90 origin-center" style={{ perspective: "1800px" }}>
            <div className="absolute -inset-16 -z-10 rounded-full blur-3xl opacity-60" style={{ background: `radial-gradient(closest-side, ${BRAND}55, transparent 65%)` }} />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 -z-10 rounded-full blur-3xl opacity-50" style={{ background: `radial-gradient(closest-side, ${YELLOW}55, transparent 70%)` }} />
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-[85%] h-16 rounded-[100%] bg-black/60 blur-3xl" />

            <div
              className="hidden sm:block absolute -right-24 top-16 opacity-95"
              style={{ transform: "rotateY(-24deg) rotateX(10deg) rotateZ(8deg)", transformStyle: "preserve-3d" }}
            >
              <PhoneFrame small><MovingBookScreen /></PhoneFrame>
            </div>
            <div
              className="hidden sm:block absolute -left-20 top-24 opacity-90"
              style={{ transform: "rotateY(-8deg) rotateX(6deg) rotateZ(-10deg)", transformStyle: "preserve-3d" }}
            >
              <PhoneFrame small><DashboardScreen /></PhoneFrame>
            </div>

            <div
              className="relative animate-[phoneFloat_6s_ease-in-out_infinite] z-10"
              style={{ transformStyle: "preserve-3d" }}
            >
              <PhoneFrame><HomeMapScreen /></PhoneFrame>
            </div>
          </div>
        </div>

        {/* Trust micro-row - mobile only, below phone */}
        <div className="lg:hidden flex items-center gap-2 justify-center text-[11px] text-white/55 flex-nowrap whitespace-nowrap -mt-4" dir="rtl">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={13} style={{ color: BRAND }} />
            תשלום בטוח
          </span>
          <span className="size-1 rounded-full bg-white/20" />
          <span className="inline-flex items-center gap-1">
            <Zap size={13} style={{ color: YELLOW }} />
            מוכן בשנייה
          </span>
          <span className="size-1 rounded-full bg-white/20" />
          <span className="inline-flex items-center gap-1">
            <Star size={13} className="fill-current" style={{ color: YELLOW }} />
            4.9 מ-2,400
          </span>
        </div>
      </div>

      <style>{`
@keyframes phoneFloat {
  0%,100% { transform: rotateY(-16deg) rotateX(8deg) rotateZ(-1.5deg) translateY(0); }
  50% { transform: rotateY(-16deg) rotateX(8deg) rotateZ(-1.5deg) translateY(-10px); }
}
@keyframes shineSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`}</style>
    </section>

  );
}

/* ============ PHONE FRAME ============ */
function PhoneFrame({
  children,
  className = "",
  small = false,
}: {
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}) {
  const dims = small
    ? "w-[240px] h-[500px] rounded-[38px] p-[8px]"
    : "w-[300px] sm:w-[320px] h-[610px] sm:h-[650px] rounded-[48px] p-[10px]";
  return (
    <div
      className={`relative mx-auto bg-[#0a0a0a] ${dims} ${className}`}
      style={{
        boxShadow:
          "0 60px 120px -30px rgba(0,0,0,0.55), 0 20px 40px -20px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.06)",
      }}
    >
      {/* Side buttons */}
      {!small && (
        <>
          <div className="absolute -right-[3px] top-24 w-[3px] h-14 bg-[#111] rounded-r-sm" />
          <div className="absolute -left-[3px] top-20 w-[3px] h-8 bg-[#111] rounded-l-sm" />
          <div className="absolute -left-[3px] top-32 w-[3px] h-14 bg-[#111] rounded-l-sm" />
          <div className="absolute -left-[3px] top-52 w-[3px] h-14 bg-[#111] rounded-l-sm" />
        </>
      )}
      {/* Dynamic island */}
      <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 ${small ? "w-24 h-5" : "w-[92px] h-[26px]"} bg-black rounded-full z-30 ring-1 ring-white/5`} />
      <div className={`w-full h-full ${small ? "rounded-[32px]" : "rounded-[40px]"} overflow-hidden bg-[#f5f6f8] relative`}>
        {children}
      </div>
    </div>
  );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-6 pt-2 pb-1 text-[10px] font-bold ${
        dark ? "text-white/90" : "text-black/80"
      }`}
      dir="ltr"
    >
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span>••••</span>
        <span>100%</span>
      </span>
    </div>
  );
}

/* ============ DASHBOARD SCREEN (matches customer.dashboard.tsx) ============ */
function DashboardScreen() {
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-[#f5f6f8]">
      <StatusBar />
      {/* Top bar */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between bg-white border-b border-black/5">
        <div className="flex items-center gap-2">
          <GoiLogoBadge size={26} />
          <span className="text-[12.5px] font-bold">Goi</span>
        </div>
        <div className="size-8 rounded-full grid place-items-center ring-1 ring-[#F5C518]/40" style={{ background: `${YELLOW}22` }}>
          <UserCircle2 className="size-4.5" />
        </div>
      </div>

      <div className="px-3 pt-3 space-y-3 flex-1 overflow-hidden">
        {/* Hero greeting card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-4 relative overflow-hidden">
          <div className="absolute -left-6 -bottom-6 size-24 rounded-full bg-[#F5C518]/15 blur-2xl" />
          <div className="relative">
            <div className="text-[9px] font-bold text-white/60 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
              <Sparkles className="size-3" /> Goi Express
            </div>
            <div className="text-[15px] font-black leading-tight">שלום, ברוך הבא</div>
            <div className="text-[10.5px] text-white/70 mt-0.5">ביצעת 12 משלוחים איתנו</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: Wallet, l: "הוצאת", v: "₪482", accent: "bg-[#E6F7EF] text-[#0E7A4A]" },
            { icon: PackageCheck, l: "משלוחים", v: "12", accent: "bg-[#E4F0FF] text-[#0B5FCC]" },
            { icon: TrendingUp, l: "החודש", v: "₪126", accent: "bg-[#FFF3D6] text-[#8A6100]" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-white ring-1 ring-black/5 p-2 flex flex-col items-center gap-1">
              <div className={`size-7 rounded-lg ${s.accent} grid place-items-center`}>
                <s.icon className="size-3.5" strokeWidth={2.2} />
              </div>
              <div className="text-[8px] font-bold text-black/50 uppercase tracking-wide">{s.l}</div>
              <div className="text-[12px] font-black leading-none">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Yellow promo */}
        <div className="rounded-2xl bg-gradient-to-l from-[#F5C518] to-[#f7d64c] p-2.5 flex items-center gap-2 ring-1 ring-[#F5C518]/40">
          <div className="size-8 rounded-xl bg-[#101418] grid place-items-center shrink-0">
            <Gift className="size-4 text-[#F5C518]" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black text-[#101418] leading-tight">חבר מביא חבר</div>
            <div className="text-[9.5px] text-[#101418]/75 mt-0.5">₪20 זיכוי במשלוח הבא</div>
          </div>
          <div className="text-[10px] font-black text-[#101418] bg-white/70 rounded-lg px-2 py-1">שתף</div>
        </div>

        {/* Active */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-black">בפעילות עכשיו</div>
            <span className="text-[9px] font-bold text-[#0E7A4A] bg-[#E6F7EF] px-1.5 py-0.5 rounded-full">1 פעילה</span>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-black/5 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold text-black/50">#4821</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-[#F1E7FF] text-[#5B21B6]">נבחר שליח</span>
              </div>
              <div className="font-black text-[12px]">₪42</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-[#0E7A4A]" />
                <div className="text-[10.5px] truncate">דיזנגוף 99, תל אביב</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-[#DC2626]" />
                <div className="text-[10.5px] truncate">ז׳בוטינסקי 22, רמת גן</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active={0} />
    </div>
  );
}

/* ============ NEW ORDER — DELIVERY CATEGORY (matches customer.new-order.tsx) ============ */
function NewDeliveryScreen() {
  const cats = [
    { icon: Bike,        title: "משלוח",       desc: "לשלוח פריט תקום למקום",     bg: "linear-gradient(160deg,#F3FBF2 0%,#DDF2DA 100%)", glow: "#22C55E", active: true },
    { icon: HandPlatter, title: "תביאו לי",    desc: "לאסוף פריט משהו והביא אלי", bg: "linear-gradient(160deg,#F1FBF5 0%,#DAF3E4 100%)", glow: "#22C55E" },
    { icon: Truck,       title: "הובלה קטנה",  desc: "פריט כבד או רכב תואם",       bg: "linear-gradient(160deg,#F4F6FA 0%,#E6EAF2 100%)", glow: MOVE_BLUE },
    { icon: ShoppingBag, title: "מאנצ׳",       desc: "הזמנה מקיוסקים",             bg: "linear-gradient(160deg,#FFF7EE 0%,#FFE7CE 100%)", glow: "#FF8A3D" },
  ];
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-white">
      <StatusBar />
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-black/5">
        <ArrowLeft className="size-4 rotate-180" />
        <div className="text-[13px] font-black">הזמנה חדשה</div>
      </div>

      <div className="p-3 space-y-2.5 overflow-hidden">
        <div className="text-[10px] font-black text-black/50 uppercase tracking-[0.14em]">בחרו סוג שירות</div>
        <div className="grid grid-cols-2 gap-2">
          {cats.map((c) => (
            <div
              key={c.title}
              className={`relative rounded-2xl p-2.5 overflow-hidden ${c.active ? "ring-2" : "ring-1"} ring-inset`}
              style={{
                background: c.bg,
                boxShadow: c.active ? `inset 0 0 0 2px ${c.glow}` : `inset 0 0 0 1px rgba(0,0,0,0.05)`,
              }}
            >
              <div className="absolute -left-4 -bottom-4 size-16 rounded-full blur-2xl opacity-40" style={{ background: c.glow }} />
              <div className="relative">
                <div className="size-9 rounded-xl bg-white/80 grid place-items-center shadow-sm mb-2">
                  <c.icon className="size-4.5" style={{ color: c.glow }} strokeWidth={2.2} />
                </div>
                <div className="text-[11.5px] font-black leading-tight">{c.title}</div>
                <div className="text-[9px] text-black/55 mt-0.5 leading-tight">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pickup */}
        <div className="rounded-xl border border-black/5 p-2.5 mt-1">
          <div className="text-[9px] font-black text-black/50 mb-1 uppercase tracking-wide">מאיפה</div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg grid place-items-center" style={{ background: `${BRAND}18` }}>
              <MapPin className="size-3.5" style={{ color: BRAND }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold truncate">דיזנגוף 99, תל אביב</div>
              <div className="text-[9px] text-black/50">קומה 3, דירה 12</div>
            </div>
          </div>
        </div>

        {/* Dropoff */}
        <div className="rounded-xl border border-black/5 p-2.5">
          <div className="text-[9px] font-black text-black/50 mb-1 uppercase tracking-wide">לאן</div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-black text-white grid place-items-center">
              <MapPin className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold truncate">ז׳בוטינסקי 22, רמת גן</div>
              <div className="text-[9px] text-black/50">כניסה ראשית</div>
            </div>
          </div>
        </div>

        {/* Price card */}
        <div className="rounded-xl p-2.5 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] opacity-80">מחיר סופי</div>
              <div className="text-[19px] font-black leading-none mt-0.5">₪42</div>
            </div>
            <div className="text-[9px] opacity-95 flex items-center gap-1">
              <Clock className="size-3" />
              15–25 דק׳
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-3">
        <div className="w-full h-11 rounded-full grid place-items-center text-white font-black text-[12.5px]" style={{ background: BRAND }}>
          המשך לתשלום
        </div>
      </div>
    </div>
  );
}

/* ============ NEW ORDER — MOVING (הובלה) ============ */
function MovingBookScreen() {
  const furniture = [
    { icon: Sofa, l: "ספה" },
    { icon: Bed, l: "מיטה" },
    { icon: Refrigerator, l: "מקרר" },
    { icon: Armchair, l: "כורסה" },
    { icon: Tv, l: "טלוויזיה" },
    { icon: Boxes, l: "קרטונים" },
    { icon: Piano, l: "פסנתר" },
    { icon: Package, l: "ארון" },
  ];
  const vehicles = [
    { l: "טנדר", sub: "עד ~8 מ״ק", active: true },
    { l: "משאית 3.5 ט׳", sub: "דירה קטנה" },
    { l: "משאית 8 ט׳", sub: "3-4 חד׳" },
  ];
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-white">
      <StatusBar />
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-black/5">
        <ArrowLeft className="size-4 rotate-180" />
        <div className="text-[13px] font-black">הובלה חדשה</div>
      </div>

      <div className="p-3 space-y-2.5 overflow-hidden">
        {/* Selected category */}
        <div
          className="rounded-2xl p-3 relative overflow-hidden ring-2 ring-inset"
          style={{
            background: "linear-gradient(160deg,#F4F6FA 0%,#E6EAF2 100%)",
            boxShadow: `inset 0 0 0 2px ${MOVE_BLUE}`,
          }}
        >
          <div className="absolute -left-6 -bottom-6 size-20 rounded-full blur-2xl opacity-40" style={{ background: MOVE_BLUE }} />
          <div className="relative flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-white grid place-items-center shadow-sm">
              <Truck className="size-5" style={{ color: MOVE_BLUE }} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[12px] font-black">הובלה קטנה</div>
              <div className="text-[9.5px] text-black/60">פריט כבד או רכב תואם</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[9.5px] font-black text-black/60 uppercase mb-1.5 tracking-wide">מה מזיזים?</div>
          <div className="grid grid-cols-4 gap-1.5">
            {furniture.map((f, i) => (
              <div
                key={f.l}
                className={`aspect-square rounded-xl border ${
                  i < 2 ? "bg-[#EEF2FE] border-[#5C7CFA]/50" : "border-black/5 bg-white"
                } flex flex-col items-center justify-center gap-0.5`}
              >
                <f.icon className={`size-3.5 ${i < 2 ? "text-[#5C7CFA]" : "text-black/55"}`} strokeWidth={2.2} />
                <span className="text-[8px] font-bold text-black/70 leading-none">{f.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[9.5px] font-black text-black/60 uppercase mb-1.5 tracking-wide flex items-center gap-1">
            <Truck className="size-3" /> סוג רכב
          </div>
          <div className="space-y-1">
            {vehicles.map((v) => (
              <div
                key={v.l}
                className={`rounded-lg p-1.5 flex items-center justify-between border ${
                  v.active ? "bg-[#EEF2FE] border-[#5C7CFA]/50" : "border-black/5"
                }`}
              >
                <div>
                  <div className="text-[10px] font-black">{v.l}</div>
                  <div className="text-[8.5px] text-black/55">{v.sub}</div>
                </div>
                {v.active && <Check className="size-3.5" style={{ color: MOVE_BLUE }} strokeWidth={3} />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-2.5 text-white" style={{ background: `linear-gradient(135deg, ${MOVE_BLUE}, #3F5FE0)` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] opacity-80">בקשת הצעת מחיר</div>
              <div className="text-[14px] font-black leading-none mt-0.5">מובילים יתמחרו לך</div>
            </div>
            <div className="size-8 rounded-full bg-white/25 grid place-items-center">
              <ArrowLeft className="size-3.5 rotate-180" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ TRACK SCREEN ============ */
/* ============ HOME MAP SCREEN + auto demo flow ============ */
type SvcKey = "delivery" | "bring" | "move" | "munch";
type Svc = {
  key: SvcKey; img: string; label: string; sub: string; bg: string; badge?: string;
  itemLabel: string; itemValue: string; itemIcon: any;
  price: string; eta: string; courierName: string; vehicle: string;
};
function HomeMapScreen() {
  const services: Svc[] = [
    { key: "delivery", img: tileDelivery, label: "משלוח", sub: "לשלוח פריט\nממקום למקום", bg: "#D9F3E0",
      itemLabel: "פריט למשלוח", itemValue: "מעטפה קטנה", itemIcon: Package,
      price: "17.90 ₪", eta: "12 דק׳", courierName: "רון א.", vehicle: "אופנוע" },
    { key: "bring", img: tileBring, label: "תביאו לי", sub: "לאיסוף פריט\nוהבאה אליך", bg: "#DDF3E1",
      itemLabel: "מה לאסוף?", itemValue: "תרופה מבית מרקחת", itemIcon: ShoppingBag,
      price: "24.00 ₪", eta: "18 דק׳", courierName: "יעל מ.", vehicle: "רכב" },
    { key: "move", img: tileMove, label: "הובלה קטנה", sub: "פריט בודד\nאו ריהוט קטן", bg: "#E5EAF6",
      itemLabel: "מה מובילים?", itemValue: "שידה קטנה", itemIcon: Sofa,
      price: "89.00 ₪", eta: "35 דק׳", courierName: "עומר ב.", vehicle: "טנדר" },
    { key: "munch", img: tileMunch, label: "מאנצ׳", sub: "הזמנה\nמקיוסקים", bg: "#FDECDC", badge: "חדש",
      itemLabel: "עגלה", itemValue: "קולה + חטיף", itemIcon: HandPlatter,
      price: "32.50 ₪", eta: "15 דק׳", courierName: "דנה ל.", vehicle: "אופנוע" },
  ];
  const [active, setActive] = useState(0);
  // -1: home ; 0: opening tap ; 1: order form ; 2: matching ; 3: en-route ; 4: delivered
  const [phase, setPhase] = useState(-1);
  useEffect(() => {
    // phase 1 (order form) is longer for delivery/package flows so scroll animation can play
    const key = services[active]?.key;
    const isMove = key === "move";
    const isPackage = key === "delivery";
    const isMunch = key === "munch";
    const phase1Time = isMove || isPackage ? 8500 : isMunch ? 5000 : 2200;
    const timings = [2200, 700, phase1Time, isMove ? 4200 : 2000, 2400, 2200];
    const idx = phase + 1;
    const t = setTimeout(() => {
      setPhase((p) => {
        if (p >= 4) { setActive((a) => (a + 1) % services.length); return -1; }
        return p + 1;
      });
    }, timings[idx] ?? 1500);
    return () => clearTimeout(t);
  }, [phase, active, services.length]);

  const cur = services[active];
  const showFlow = phase >= 1;

  return (
    <div dir="rtl" className="w-full h-full bg-[#F7F7F5] overflow-hidden relative flex flex-col">
      {/* iOS status bar */}
      <div className="absolute top-0 inset-x-0 h-7 z-40 flex items-center justify-between px-5 pt-1 text-black text-[10px] font-bold pointer-events-none" dir="ltr">
        <span>9:41</span>
        <span className="w-[70px]" />
        <span className="flex items-center gap-1">
          <svg width="12" height="9" viewBox="0 0 14 10" fill="currentColor"><path d="M1 8h1.5v1H1zM4 6h1.5v3H4zM7 4h1.5v5H7zM10 2h1.5v7H10z"/></svg>
          <svg width="20" height="9" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="1" width="18" height="8" rx="2" stroke="currentColor" opacity="0.5"/><rect x="2" y="2.5" width="14" height="5" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
        </span>
      </div>

      {/* ---------- HOME base ---------- */}
      <HomeBase services={services} active={active} phase={phase} />

      {/* ---------- FLOW OVERLAY ---------- */}
      {showFlow && (
        <div className="absolute inset-x-0 top-7 bottom-0 z-30 bg-[#F7F7F5] flex flex-col" style={{ animation: "slide-in-right 0.35s ease-out" }}>
          {svc_isDelivery(cur) && phase === 1
            ? <DeliveryOrderScreen />
            : svc_isDelivery(cur) && phase === 2
            ? <MoveQuotesScreen />
            : svc_isPackage(cur) && phase === 1
            ? <DeliveryPackageScreen />
            : svc_isMunch(cur) && phase === 1
            ? <MunchOrderScreen />
            : <FlowScreen svc={cur} phase={phase} />}
        </div>
      )}

      {/* Bottom nav */}
      <div className="border-t border-black/[0.06] bg-white flex items-stretch pt-1 pb-1.5 relative z-40">
        {[
          { icon: UserCircle2, label: "אזור אישי" },
          { icon: MessageCircle, label: "צ׳אט" },
          { icon: Plus, label: "הזמנה", primary: true },
          { icon: Activity, label: "פעילות" },
          { icon: Home, label: "בית", active: true },
        ].map((n) => (
          <div key={n.label} className="flex-1 flex flex-col items-center gap-0.5 relative">
            {n.primary ? (
              <div className="size-9 rounded-full grid place-items-center text-white shadow-lg -mt-4 ring-4 ring-white bg-black">
                <n.icon className="size-4" strokeWidth={2.8} />
              </div>
            ) : (
              <n.icon className="size-4" style={{ color: n.active ? BRAND : "rgba(0,0,0,0.4)" }} strokeWidth={2.2} />
            )}
            <div className="text-[7.5px] font-bold" style={{ color: n.active ? BRAND : "rgba(0,0,0,0.5)" }}>{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeBase({ services, active, phase }: { services: Svc[]; active: number; phase: number }) {
  return (
    <>
      {/* MAP */}
      <div className="relative overflow-hidden" style={{ height: 290 }}>
        {/* Base */}
        <div className="absolute inset-0" style={{ background: "#EAE7DC" }} />

        {/* Park (top-right green) */}
        <svg className="absolute" style={{ top: 8, right: 6, width: 120, height: 78 }} viewBox="0 0 120 78">
          <path d="M 6 8 Q 30 0 60 6 T 118 14 L 116 66 Q 80 78 40 72 T 4 62 Z" fill="#CFE0B8" />
          <circle cx="28" cy="30" r="6" fill="#A8C88A" />
          <circle cx="46" cy="46" r="5" fill="#A8C88A" />
          <circle cx="80" cy="26" r="7" fill="#A8C88A" />
          <circle cx="98" cy="50" r="5" fill="#A8C88A" />
        </svg>

        {/* River (bottom-left blue curve) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 240" preserveAspectRatio="none">
          <path d="M -10 200 Q 60 180 100 210 T 200 220 T 320 240 L 320 260 L -10 260 Z" fill="#B9D8E8" />
          <path d="M -10 200 Q 60 180 100 210 T 200 220 T 320 240" stroke="#9CC5DA" strokeWidth="1" fill="none" opacity="0.6"/>
        </svg>

        {/* Building blocks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 240" preserveAspectRatio="none">
          <g fill="#F5F2E8" stroke="#DED8C4" strokeWidth="0.6">
            <rect x="14" y="94" width="34" height="26" rx="2" />
            <rect x="54" y="94" width="22" height="26" rx="2" />
            <rect x="14" y="126" width="26" height="34" rx="2" />
            <rect x="46" y="126" width="30" height="18" rx="2" />
            <rect x="46" y="150" width="30" height="16" rx="2" />
            <rect x="138" y="14" width="24" height="30" rx="2" />
            <rect x="168" y="14" width="30" height="20" rx="2" />
            <rect x="168" y="40" width="30" height="18" rx="2" />
            <rect x="138" y="96" width="28" height="26" rx="2" />
            <rect x="172" y="96" width="34" height="26" rx="2" />
            <rect x="212" y="96" width="28" height="26" rx="2" />
            <rect x="138" y="128" width="24" height="24" rx="2" />
            <rect x="168" y="128" width="38" height="24" rx="2" />
            <rect x="212" y="128" width="28" height="24" rx="2" />
            <rect x="246" y="128" width="24" height="24" rx="2" />
            <rect x="138" y="158" width="30" height="20" rx="2" />
            <rect x="174" y="158" width="26" height="20" rx="2" />
            <rect x="206" y="158" width="34" height="20" rx="2" />
          </g>
        </svg>

        {/* Streets */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 240" preserveAspectRatio="none">
          {/* Main avenues */}
          <path d="M 0 88 L 300 84" stroke="#fff" strokeWidth="8" />
          <path d="M 0 88 L 300 84" stroke="#EFEAD8" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 0 194 L 300 190" stroke="#fff" strokeWidth="7" />
          {/* Secondary */}
          <path d="M 0 122 L 300 120" stroke="#fff" strokeWidth="4" />
          <path d="M 0 156 L 300 152" stroke="#fff" strokeWidth="4" />
          {/* Verticals */}
          <path d="M 132 0 L 130 240" stroke="#fff" strokeWidth="6" />
          <path d="M 132 0 L 130 240" stroke="#EFEAD8" strokeWidth="0.8" strokeDasharray="3 4" />
          <path d="M 206 0 L 204 240" stroke="#fff" strokeWidth="4" />
          <path d="M 244 0 L 242 240" stroke="#fff" strokeWidth="3" />
          <path d="M 82 88 L 80 240" stroke="#fff" strokeWidth="3" />
        </svg>

        {/* Street labels */}
        <div className="absolute text-[6.5px] font-semibold text-black/40 tracking-tight" style={{ top: 76, right: 42, transform: "rotate(-0.5deg)" }}>שדרות רוטשילד</div>
        <div className="absolute text-[6px] font-semibold text-black/35" style={{ top: 144, right: 24 }}>אלנבי</div>
        <div className="absolute text-[6px] font-semibold text-black/35" style={{ top: 108, left: 24 }}>דיזנגוף</div>

        {/* Top overlay: logo + menu */}
        <div className="absolute top-7 inset-x-0 px-3 flex items-start justify-between z-10">
          <div className="w-8" />
          <div className="text-[16px] font-black tracking-tight leading-none italic mt-1">
            <span className="text-black">GO</span><span style={{ color: BRAND }}>I</span>
          </div>
          <button className="size-8 rounded-full bg-white shadow-md grid place-items-center ring-1 ring-black/5">
            <Menu className="size-3.5" />
          </button>
        </div>


        {/* Pickup pin + label */}
        <div className="absolute z-10" style={{ top: 100, left: "30%" }}>
          <div className="relative">
            <div className="size-3.5 rounded-full ring-2 ring-white shadow-md" style={{ background: BRAND }} />
            <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-white rounded-md px-1.5 py-[2px] shadow-md ring-1 ring-black/5 text-[7.5px] font-bold text-black">
              רוטשילד 45
            </div>
          </div>
        </div>

        {/* Dropoff pin + label */}
        <div className="absolute z-10" style={{ top: 152, right: "22%" }}>
          <div className="relative">
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <path d="M 7 17 C 3 12, 0 9, 0 6 A 7 7 0 0 1 14 6 C 14 9, 11 12, 7 17 Z" fill="#DC2626" stroke="white" strokeWidth="1.2"/>
              <circle cx="7" cy="6" r="2" fill="white"/>
            </svg>
            <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-white rounded-md px-1.5 py-[2px] shadow-md ring-1 ring-black/5 text-[7.5px] font-bold text-black">
              דיזנגוף 120
            </div>
          </div>
        </div>

        {/* ETA chip */}
        <div className="absolute bottom-2 left-2 z-10 bg-white rounded-full px-2 py-[3px] shadow-md ring-1 ring-black/5 flex items-center gap-1">
          <div className="size-1.5 rounded-full" style={{ background: BRAND }} />
          <span className="text-[7.5px] font-black text-black">12 דק׳</span>
          <span className="text-[6.5px] text-black/45">· 3.4 ק״מ</span>
        </div>

      </div>

      {/* Address inputs */}
      <div className="px-3 pt-6 pb-1.5 space-y-1.5">
        <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] px-3 py-2 flex items-center gap-2 shadow-sm">
          <div className="size-2.5 rounded-full" style={{ background: BRAND }} />
          <div className="flex-1 text-right leading-tight">
            <div className="text-[9px] font-medium" style={{ color: BRAND }}>מאיפה?</div>
            <div className="text-[10px] font-normal text-black/55">כתובת איסוף</div>
          </div>
          <MapPin className="size-3.5 text-black/35" />
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] px-3 py-2 flex items-center gap-2 shadow-sm">
          <div className="size-2.5 rounded-full bg-[#DC2626]" />
          <div className="flex-1 text-right leading-tight">
            <div className="text-[9px] font-medium text-[#DC2626]">לאן?</div>
            <div className="text-[10px] font-normal text-black/55">כתובת מסירה</div>
          </div>
          <MapPin className="size-3.5 text-black/35" />
        </div>
      </div>

      {/* Tiles */}
      <div className="px-3 pt-2 pb-2 flex-1 flex flex-col justify-end">
        <div className="text-right mb-1.5">
          <div className="text-[11px] font-black text-black">מה תרצה לעשות היום?</div>
          <div className="text-[8px] text-black/50 mt-0.5">בחר שירות המתאים לצורך שלך</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {services.map((t, i) => {
            const isActive = i === active;
            const tapping = isActive && phase === 0 && t.key !== "bring";
            return (
              <div
                key={t.label}
                className={`rounded-2xl p-1 flex flex-col items-center text-center relative overflow-hidden aspect-[3/4] transition-all duration-300 ${isActive ? "ring-2 scale-[1.06] shadow-lg z-10" : "ring-1 ring-black/[0.04]"} ${tapping ? "scale-[0.94]" : ""}`}
                style={{ background: t.bg, ...(isActive ? { boxShadow: `0 8px 20px -6px ${BRAND}66`, ["--tw-ring-color" as string]: BRAND } : {}) }}
              >
                {t.badge && (
                  <span className="absolute top-1 right-1 text-[6px] font-black bg-[#7C3AED] text-white px-1.5 py-[1px] rounded-md z-10 leading-none">{t.badge}</span>
                )}
                {tapping && (
                  <span className="absolute inset-0 grid place-items-center pointer-events-none z-20">
                    <span className="size-8 rounded-full animate-ping" style={{ background: `${BRAND}55` }} />
                  </span>
                )}
                <div className={`w-[68%] aspect-square grid place-items-center mt-0.5 transition-transform duration-500 ${isActive ? "animate-float-y" : ""}`}>
                  <img src={t.img} alt={t.label} className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" draggable={false} />
                </div>
                <div className="flex-1 flex flex-col justify-center gap-0.5 mt-0.5">
                  <div className="text-[9.5px] font-extrabold text-black leading-none tracking-tight">{t.label}</div>
                  <div className="text-[6.5px] font-medium text-black/55 leading-[1.2] px-0.5 whitespace-pre-line">{t.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function FlowScreen({ svc, phase }: { svc: Svc; phase: number }) {
  const ItemIcon = svc.itemIcon;
  return (
    <div className="flex flex-col h-full bg-[#F7F7F5]">
      {/* header */}
      <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-black/5 bg-white">
        <ArrowLeft className="size-4 text-black/70 rotate-180" />
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md grid place-items-center" style={{ background: svc.bg }}>
            <img src={svc.img} alt="" className="w-4 h-4 object-contain" />
          </div>
          <div className="text-[11px] font-black text-black">{svc.label}</div>
        </div>
        <div className="w-4" />
      </div>

      {/* progress steps */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-1">
        {["פרטים", "מחפש שליח", "בדרך", "נמסר"].map((lbl, i) => {
          const stepIdx = phase - 1; // phase 1..4 → step 0..3
          const done = i < stepIdx;
          const now = i === stepIdx;
          return (
            <div key={lbl} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="h-1 w-full rounded-full transition-colors" style={{ background: done || now ? BRAND : "rgba(0,0,0,0.1)" }} />
              <div className="text-[6.5px] font-bold" style={{ color: now ? BRAND : done ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)" }}>{lbl}</div>
            </div>
          );
        })}
      </div>

      {/* body */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        {phase === 1 && (
          <div className="space-y-1.5 animate-[fade-in_0.3s_ease-out]">
            <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-1.5 flex items-center gap-2">
              <div className="size-2 rounded-full" style={{ background: BRAND }} />
              <div className="flex-1 text-right leading-tight">
                <div className="text-[7px] font-bold" style={{ color: BRAND }}>איסוף</div>
                <div className="text-[9px] font-bold text-black">דיזנגוף 120, ת״א</div>
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-1.5 flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#DC2626]" />
              <div className="flex-1 text-right leading-tight">
                <div className="text-[7px] font-bold text-[#DC2626]">מסירה</div>
                <div className="text-[9px] font-bold text-black">אבן גבירול 45, ת״א</div>
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-1.5 flex items-center gap-2">
              <ItemIcon className="size-3.5" style={{ color: BRAND }} />
              <div className="flex-1 text-right leading-tight">
                <div className="text-[7px] font-bold text-black/50">{svc.itemLabel}</div>
                <div className="text-[9px] font-bold text-black">{svc.itemValue}</div>
              </div>
            </div>
            <div className="rounded-xl px-2.5 py-1.5 flex items-center justify-between" style={{ background: svc.bg }}>
              <div className="text-[8px] font-bold text-black/60">מחיר משוער</div>
              <div className="text-[12px] font-black text-black">{svc.price}</div>
            </div>
            <button className="w-full mt-1 h-8 rounded-xl text-white text-[11px] font-black shadow-md animate-claim-pulse" style={{ background: BRAND }}>
              הזמן עכשיו
            </button>
          </div>
        )}

        {phase === 2 && (
          <div className="h-full flex flex-col gap-2 animate-[fade-in_0.3s_ease-out]">
            {/* radar-scan map */}
            <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 flex-1" style={{ background: "linear-gradient(180deg,#EDEBE3 0%,#E4E8DA 100%)" }}>
              {/* streets */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 220" preserveAspectRatio="none">
                <path d="M 0 60 L 300 55" stroke="#fff" strokeWidth="7" opacity="0.9"/>
                <path d="M 0 140 L 300 145" stroke="#fff" strokeWidth="6" opacity="0.9"/>
                <path d="M 70 0 L 68 220" stroke="#fff" strokeWidth="5" opacity="0.9"/>
                <path d="M 210 0 L 214 220" stroke="#fff" strokeWidth="5" opacity="0.9"/>
                <path d="M 0 190 L 300 195" stroke="#fff" strokeWidth="3" opacity="0.6"/>
              </svg>

              {/* concentric radar rings */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                {[0, 0.6, 1.2].map((d, i) => (
                  <div key={i} className="absolute rounded-full" style={{
                    width: 220, height: 220, left: -110, top: -110,
                    border: `2px solid ${BRAND}`,
                    animation: `radarPing 2.4s ease-out ${d}s infinite`,
                    opacity: 0,
                  }} />
                ))}
              </div>

              {/* rotating sweep beam */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{
                width: 260, height: 260,
                animation: "radarSweep 2.6s linear infinite",
              }}>
                <div className="absolute inset-0" style={{
                  background: `conic-gradient(from 0deg, ${BRAND}66 0deg, ${BRAND}22 40deg, transparent 90deg, transparent 360deg)`,
                  borderRadius: "9999px",
                  maskImage: "radial-gradient(circle, black 55%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 70%)",
                }} />
              </div>

              {/* center pin (customer) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative size-8 grid place-items-center">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${BRAND}55` }} />
                  <div className="relative size-6 rounded-full grid place-items-center shadow-lg ring-2 ring-white" style={{ background: BRAND }}>
                    <Navigation className="size-3 text-white" />
                  </div>
                </div>
              </div>

              {/* courier pins detected by sweep */}
              {[
                { top: "22%", left: "20%", delay: "0.4s" },
                { top: "30%", left: "72%", delay: "1.1s" },
                { top: "68%", left: "28%", delay: "1.6s" },
                { top: "72%", left: "70%", delay: "0.8s" },
                { top: "48%", left: "82%", delay: "2.0s" },
              ].map((p, i) => (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: p.top, left: p.left }}>
                  <div className="size-5 rounded-full bg-white shadow-md grid place-items-center ring-1 ring-black/10" style={{
                    animation: `pinPop 2.6s ease-out ${p.delay} infinite`,
                  }}>
                    <Bike className="size-2.5" style={{ color: BRAND }} strokeWidth={2.5} />
                  </div>
                </div>
              ))}

              {/* status chip */}
              <div className="absolute inset-x-0 bottom-2 flex justify-center">
                <div className="bg-white/95 backdrop-blur rounded-full px-3 py-1.5 shadow-md ring-1 ring-black/5 flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full animate-pulse" style={{ background: BRAND }} />
                  <div className="text-[9px] font-black text-black">סורק שליחים באזור</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-1.5 text-center">
              <div className="text-[10px] font-black text-black">מחפש שליח קרוב...</div>
              <div className="text-[7.5px] text-black/50 mt-0.5">בדרך כלל תוך 30 שניות</div>
            </div>

            <style>{`
@keyframes radarSweep { to { transform: rotate(360deg); } }
@keyframes radarPing {
  0% { transform: scale(0.15); opacity: 0.7; }
  80% { opacity: 0.05; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes pinPop {
  0%, 40% { transform: scale(0.4); opacity: 0; }
  50% { transform: scale(1.25); opacity: 1; }
  70% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.85; }
@keyframes routeDash { to { stroke-dashoffset: -24; } }
@keyframes courierHalo {
  0% { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1.8); opacity: 0; }
}
}
            `}</style>
          </div>
        )}


        {phase === 3 && (
          <div className="h-full flex flex-col gap-2 animate-[fade-in_0.3s_ease-out]">
            {/* mini map with courier gliding along route */}
            <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 flex-1" style={{ background: "#EDEBE3" }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice">
                {/* faint grid streets */}
                <g stroke="#fff" strokeWidth="1" opacity="0.55">
                  <path d="M 0 50 H 300" /><path d="M 0 110 H 300" /><path d="M 0 160 H 300" />
                  <path d="M 60 0 V 200" /><path d="M 160 0 V 200" /><path d="M 230 0 V 200" />
                </g>
                {/* route base */}
                <path id="courierRoute" d="M 20 20 Q 100 60 160 90 T 280 170" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" />
                {/* animated dashed progress */}
                <path d="M 20 20 Q 100 60 160 90 T 280 170" stroke={BRAND} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 6" style={{ animation: "routeDash 1.2s linear infinite" }} />
                {/* start pin (courier origin) */}
                <circle cx="20" cy="20" r="5" fill={BRAND} stroke="#fff" strokeWidth="2" />
                {/* destination pin */}
                <g transform="translate(273 162)">
                  <path d="M 7 17 C 3 12, 0 9, 0 6 A 7 7 0 0 1 14 6 C 14 9, 11 12, 7 17 Z" fill="#DC2626" stroke="white" strokeWidth="1.2"/>
                </g>
                {/* moving courier with pulse halo */}
                <g>
                  <circle r="6" fill={BRAND} opacity="0.3">
                    <animate attributeName="r" values="6;16;6" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.45;0;0.45" dur="1.6s" repeatCount="indefinite" />
                    <animateMotion dur="6s" repeatCount="indefinite"><mpath href="#courierRoute" /></animateMotion>
                  </circle>
                  <circle r="6" fill="#fff" stroke={BRAND} strokeWidth="2.5">
                    <animateMotion dur="6s" repeatCount="indefinite" rotate="auto"><mpath href="#courierRoute" /></animateMotion>
                  </circle>
                  <circle r="2.2" fill={BRAND}>
                    <animateMotion dur="6s" repeatCount="indefinite" rotate="auto"><mpath href="#courierRoute" /></animateMotion>
                  </circle>
                </g>
              </svg>
              {/* live badge */}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-white/95 ring-1 ring-black/5 flex items-center gap-1">
                <span className="size-1.5 rounded-full animate-pulse" style={{ background: BRAND }} />
                <span className="text-[7px] font-black text-black">LIVE</span>
              </div>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-2 flex items-center gap-2">
              <div className="size-8 rounded-full grid place-items-center text-white font-black text-[10px]" style={{ background: BRAND }}>
                {svc.courierName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-right leading-tight">
                <div className="text-[9.5px] font-black text-black truncate">{svc.courierName} • {svc.vehicle}</div>
                <div className="text-[7px] text-black/50">בדרך אליך</div>
              </div>
              <div className="text-left">
                <div className="text-[7px] text-black/50">הגעה</div>
                <div className="text-[11px] font-black" style={{ color: BRAND }}>{svc.eta}</div>
              </div>
            </div>
          </div>
        )}

        {phase === 4 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 animate-[fade-in_0.3s_ease-out]">
            <div className="size-16 rounded-full grid place-items-center shadow-lg animate-[scale-in_0.4s_ease-out]" style={{ background: BRAND }}>
              <Check className="size-8 text-white" strokeWidth={3.5} />
            </div>
            <div className="text-[13px] font-black text-black">נמסר בהצלחה!</div>
            <div className="text-[8px] text-black/55">תודה שהשתמשת ב-Goi</div>
            <div className="flex gap-0.5 mt-1">
              {[1,2,3,4,5].map((n) => <Star key={n} className="size-3.5" fill="#FFB800" stroke="#FFB800" />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ DELIVERY (משלוח) — realistic order screen matching production ============ */
function svc_isDelivery(s: Svc) { return s.key === "move"; }
function svc_isPackage(s: Svc) { return s.key === "delivery"; }
function svc_isMunch(s: Svc) { return s.key === "munch"; }

function MunchOrderScreen() {
  const products = [
    { name: "קולה 500 מ״ל", sub: "משקה מוגז", price: 8, emoji: "🥤", addAt: 1000 },
    { name: "במבה 80 גרם", sub: "אסם", price: 6, emoji: "🥜", addAt: 2000 },
    { name: "שוקולד מריר", sub: "עלית 100 גרם", price: 12, emoji: "🍫", addAt: 3000 },
    { name: "מים 1.5 ליטר", sub: "נביעות", price: 7, emoji: "💧" },
  ];
  return (
    <div dir="rtl" className="flex flex-col h-full bg-[#F7F7F5] relative overflow-hidden">
      {/* header */}
      <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-black/5 bg-white">
        <ArrowLeft className="size-4 text-black/70 rotate-180" />
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-md grid place-items-center" style={{ background: "#FDECDC" }}>
            <img src={tileMunch} alt="" className="w-4 h-4 object-contain" />
          </div>
          <div className="text-[11px] font-black text-black">מאנצ׳</div>
        </div>
        <div className="w-4" />
      </div>

      {/* kiosk card */}
      <div className="px-3 pt-2">
        <div className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-2 flex items-center gap-2">
          <div className="size-9 rounded-lg grid place-items-center text-[16px] shrink-0" style={{ background: "#FFE7CE" }}>🏪</div>
          <div className="flex-1 text-right leading-tight min-w-0">
            <div className="text-[10.5px] font-black text-black truncate">קיוסק דיזנגוף סנטר</div>
            <div className="text-[8px] text-black/55 flex items-center justify-end gap-1 mt-0.5">
              <Star className="size-2.5 fill-[#F5C518] text-[#F5C518]" /> 4.8 · פתוח · ~12 דק׳
            </div>
          </div>
          <button className="text-[8.5px] font-bold text-black/50 shrink-0">החלף</button>
        </div>
      </div>

      {/* products */}
      <div className="px-3 pt-2 pb-2 text-right text-[10px] font-black text-black">מוצרים פופולריים</div>
      <div className="flex-1 px-3 pb-2 space-y-1.5 overflow-hidden">
        {products.map((p, i) => {
          const isTapping = typeof p.addAt === "number";
          return (
            <div key={p.name} className="rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-1.5 flex items-center gap-2">
              <div className="size-9 rounded-lg grid place-items-center text-[18px] shrink-0 bg-black/[0.03]">{p.emoji}</div>
              <div className="flex-1 text-right leading-tight min-w-0">
                <div className="text-[10px] font-black text-black truncate">{p.name}</div>
                <div className="text-[8px] text-black/50 mt-0.5">{p.sub}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-black text-black mb-0.5">₪ {p.price}</div>
                <button
                  className="h-6 min-w-[46px] px-2 rounded-full text-white text-[9.5px] font-black flex items-center justify-center gap-0.5"
                  style={{
                    background: "#FF8A3D",
                    ...(isTapping ? { animation: `munchTap 0.7s ease-out ${p.addAt}ms 1 both` } : {}),
                  }}
                >
                  <Plus className="size-3" strokeWidth={3} /> הוסף
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky cart bar — appears after first item */}
      <div
        className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-2 bg-gradient-to-t from-white via-white to-white/0"
        style={{ animation: "cartBarUp 0.4s ease-out 1200ms both" }}
      >
        <button
          className="w-full h-11 rounded-full flex items-center justify-between px-4 text-white font-black text-[12px] shadow-lg"
          style={{
            background: "#FF8A3D",
            boxShadow: "0 6px 16px -4px rgba(255,138,61,0.6)",
            animation: "cartBarTap 1s ease-out 4200ms 1 both",
            transformOrigin: "center",
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] bg-white/25 rounded-full px-1.5 py-[1px]">
              <CartCount />
            </span>
            <span>המשך לסל</span>
          </span>
          <span className="flex items-center gap-1">
            <CartTotal />
            <span>₪</span>
          </span>
        </button>
      </div>

      <style>{`
@keyframes munchTap {
  0%   { transform: scale(1); filter: brightness(1); }
  30%  { transform: scale(0.88); filter: brightness(0.85); }
  60%  { transform: scale(1.06); filter: brightness(1.08); }
  100% { transform: scale(1); filter: brightness(1); }
}
@keyframes cartBarUp {
  0%   { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes cartBarTap {
  0%   { transform: scale(1); filter: brightness(1); }
  20%  { transform: scale(0.95); filter: brightness(0.85); }
  60%  { transform: scale(1.02); filter: brightness(1.05); }
  100% { transform: scale(1); filter: brightness(1); }
}
@keyframes countStep1 { 0%,60%{content:"1 פריטים"} 60.01%,100%{content:"2 פריטים"} }
      `}</style>
    </div>
  );
}

function CartCount() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setN(2), 1000);
    const t2 = setTimeout(() => setN(3), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return <>{n} פריטים</>;
}
function CartTotal() {
  const [v, setV] = useState(8);
  useEffect(() => {
    const t1 = setTimeout(() => setV(14), 1000);
    const t2 = setTimeout(() => setV(26), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return <>{v}</>;
}


function DeliveryPackageScreen() {
  const sizes = [
    { l: "מעטפה", s: "מסמכים" },
    { l: "קטן", s: "עד 5 ק״ג", selected: true },
    { l: "בינוני", s: "עד 10 ק״ג" },
    { l: "גדול", s: "עד 20 ק״ג" },
  ];
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-[#F7F7F5] relative overflow-hidden">
      {/* Map sliver */}
      <div className="absolute inset-x-0 top-0 h-[110px] overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#dfe9d8 0%,#e6edd8 100%)" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 110" preserveAspectRatio="none">
          <path d="M 0 30 L 300 28" stroke="#fff" strokeWidth="6" />
          <path d="M 0 70 L 300 66" stroke="#fff" strokeWidth="5" />
          <path d="M 90 0 L 88 110" stroke="#fff" strokeWidth="3" />
          <path d="M 200 0 L 198 110" stroke="#fff" strokeWidth="3" />
        </svg>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[18px] font-black tracking-tight italic text-black/80">
          GO<span style={{ color: BRAND }}>I</span>
        </div>
        <button className="absolute top-2 right-2 size-8 rounded-full bg-white shadow-md grid place-items-center ring-1 ring-black/5">
          <Menu className="size-3.5" />
        </button>
        <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-md px-3 py-1.5 ring-1 ring-black/5">
          <div className="text-[8.5px] font-bold text-black/70 text-center leading-tight">בחר כתובת איסוף ומסירה<br/>למטה</div>
        </div>
      </div>

      {/* White sheet */}
      <div className="absolute inset-x-0 top-[94px] bottom-0 bg-white rounded-t-2xl shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="pt-1.5 pb-1 grid place-items-center">
          <div className="w-8 h-1 rounded-full bg-black/15" />
        </div>
        <div className="relative h-[calc(100%-14px)] overflow-hidden">
          <div dir="rtl" className="absolute inset-x-0 top-0 px-3 pb-2" style={{ animation: "packageScroll 8s cubic-bezier(.55,.05,.35,1) forwards" }}>
            {/* Header */}
            <div dir="rtl" className="flex items-center gap-2 pt-1.5 pb-2">
              <div className="size-9 rounded-full bg-black grid place-items-center shrink-0">
                <Bike className="size-4 text-white" strokeWidth={2.2} />
              </div>
              <div className="text-right leading-tight">
                <div className="text-[13px] font-black text-black">משלוח</div>
                <div className="text-[8.5px] text-black/50">לשלוח פריט תקום למקום</div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-1.5">
              <AddrRow color={BRAND} label="מאיפה?" placeholder="כתובת איסוף" />
              <AddrRow color="#DC2626" label="לאן?" placeholder="כתובת מסירה" />
            </div>

            <button className="mt-1.5 w-full h-8 rounded-xl border border-dashed border-black/25 text-[9.5px] font-bold text-black/70 flex items-center justify-center gap-1.5">
              <Plus className="size-3" /> אותו שליח, כמה יעדים
            </button>

            {/* Package size */}
            <div dir="rtl" className="mt-3 text-right text-[10px] font-black text-black">גודל החבילה</div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-4 gap-1.5">
              {sizes.map(({ l, s, selected }) => (
                <div
                  key={l}
                  className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 ${selected ? "ring-2 bg-[#FEF6D6]" : "bg-black/[0.04]"}`}
                  style={selected ? { ["--tw-ring-color" as string]: YELLOW } : undefined}
                >
                  <div className="text-[10px] font-black text-black">{l}</div>
                  <div className="text-[7.5px] text-black/55">{s}</div>
                </div>
              ))}
            </div>

            {/* When to leave */}
            <div dir="rtl" className="mt-3 text-right text-[10px] font-black text-black">מתי לצאת</div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button className="h-9 rounded-xl bg-black text-white text-[10.5px] font-black">יציאה עכשיו</button>
              <button className="h-9 rounded-xl bg-black/[0.05] text-[10.5px] font-bold text-black/70">במהלך היום</button>
            </div>
            <div dir="rtl" className="mt-1.5 text-right text-[8.5px] text-black/55">עד מתי אפשר למסור</div>
            <div dir="rtl" className="mt-1 h-9 rounded-xl bg-black/[0.04] px-2.5 flex items-center justify-between">
              <ChevronDown className="size-3.5 text-black/40" />
              <div className="text-[12px] font-black text-black">21:56</div>
            </div>

            {/* Vehicle */}
            <div dir="rtl" className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-black">
              <Bike className="size-3.5" /> סוג רכב מועדף
            </div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button className="h-11 rounded-xl px-2.5 flex items-center justify-start gap-1.5 ring-2 bg-[#FEF6D6] text-right" style={{ ["--tw-ring-color" as string]: YELLOW }}>
                <div className="leading-tight">
                  <div className="text-[10.5px] font-black text-black">דו-גלגלי</div>
                  <div className="text-[7.5px] text-black/60">אופנוע / קטנוע</div>
                </div>
                <Bike className="size-4 text-black/70" />
              </button>
              <button className="h-11 rounded-xl bg-black/[0.05] px-2.5 flex items-center justify-start gap-1.5 text-right">
                <div className="leading-tight">
                  <div className="text-[10.5px] font-black text-black">רכב</div>
                  <div className="text-[7.5px] text-black/50">פרטי / מסחרי קטן</div>
                </div>
                <Truck className="size-4 text-black/60" />
              </button>
            </div>
            <div dir="rtl" className="mt-1 text-right text-[8px] text-black/50">אופציונלי — ללא בחירה נשלח לכל השליחים הזמינים</div>

            {/* Recipient */}
            <div dir="rtl" className="mt-3 flex items-center justify-between">
              <div className="text-[10px] font-black text-black flex items-center gap-1"><UserCircle2 className="size-3.5" /> פרטי הנמען</div>
              <label className="text-[8.5px] text-black/60 flex items-center gap-1"><span className="size-3 rounded-[3px] bg-black/10 grid place-items-center" /> אני הנמען</label>
            </div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="h-9 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center justify-start text-[11px] font-bold text-black">דנה כהן</div>
              <div className="h-9 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center justify-end text-[11px] font-bold text-black" dir="ltr">054-8127396</div>
            </div>

            {/* Photos */}
            <div dir="rtl" className="mt-3 text-right text-[9.5px] text-black/70 flex items-center gap-1 justify-end">
              תמונות (אופציונלי, עד 6) <Camera className="size-3" />
            </div>
            <div dir="rtl" className="mt-1.5 flex justify-start">
              <div className="w-16 h-16 rounded-xl border border-dashed border-black/25 flex flex-col items-center justify-center gap-0.5 bg-black/[0.02]">
                <Camera className="size-4 text-black/40" />
                <div className="text-[8px] font-bold text-black/50">הוסף</div>
              </div>
            </div>

            {/* Notes */}
            <div dir="rtl" className="mt-3 text-right text-[9.5px] text-black/70">תיאור החבילה / הערות לשליח (אופציונלי)</div>
            <div dir="rtl" className="mt-1.5 h-9 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center justify-end text-[11px] font-bold text-black">
              קטן
            </div>

            {/* Price */}
            <div dir="rtl" className="mt-3 text-right text-[10px] font-black text-black">מחיר</div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button className="h-8 rounded-full bg-black text-white text-[10px] font-black">אני מציע מחיר</button>
              <button className="h-8 rounded-full bg-black/[0.05] text-[10px] font-bold text-black/70">קבל הצעות</button>
            </div>
            <div dir="rtl" className="mt-1.5 h-9 rounded-xl bg-black/[0.04] px-3 flex items-center justify-start text-[13px] font-black text-black">
              ₪ 35
            </div>
            <div dir="rtl" className="mt-1 text-right text-[7.5px] text-black/50 leading-tight">
              זה מחיר מומלץ בלבד — אתה חופשי להציע כל סכום. מחיר גבוה יותר מגדיל את הסיכוי שיאשרו מהר.
            </div>

            {/* CTA — part of the scrolling content so it flows in naturally */}
            <div className="mt-3">
              <button className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-white font-black text-[13px] shadow-lg" style={{ background: BRAND, boxShadow: "0 6px 16px -4px rgba(53,173,41,0.55)", animation: "ctaPress 8s ease-out forwards", transformOrigin: "center" }}>
                <Radar14 /> מצא לי שליח עכשיו
              </button>
              <div className="mt-1.5 flex items-center gap-1.5 text-[8.5px] text-black/60">
                <div className="size-4 rounded-md grid place-items-center shrink-0" style={{ background: YELLOW }}>
                  <Check className="size-2.5 text-black" strokeWidth={3.5} />
                </div>
                <span>קראתי ואני מאשר את <u>תנאי השירות</u> ו<u>מדיניות הפרטיות</u>.</span>
              </div>
            </div>
            <div className="h-4" />
          </div>
        </div>
      </div>
      <style>{`
@keyframes packageScroll {
  0%   { transform: translateY(0); }
  10%  { transform: translateY(0); }
  35%  { transform: translateY(-180px); }
  60%  { transform: translateY(-360px); }
  85%  { transform: translateY(-540px); }
  100% { transform: translateY(-560px); }
}
@keyframes ctaReveal {
  0%,80% { opacity: 0; transform: translateY(8px); }
  90%,100% { opacity: 1; transform: translateY(0); }
}
@keyframes ctaPress {
  0%,90% { transform: scale(1); filter: brightness(1); }
  93%    { transform: scale(0.94); filter: brightness(0.88); }
  100%   { transform: scale(1); filter: brightness(1); }
}
      `}</style>
    </div>
  );
}

function DeliveryOrderScreen() {
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-[#F7F7F5] relative overflow-hidden">
      {/* Map sliver behind the sheet */}
      <div className="absolute inset-x-0 top-0 h-[110px] overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#dfe9d8 0%,#e6edd8 100%)" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 110" preserveAspectRatio="none">
          <path d="M 0 30 L 300 28" stroke="#fff" strokeWidth="6" />
          <path d="M 0 70 L 300 66" stroke="#fff" strokeWidth="5" />
          <path d="M 90 0 L 88 110" stroke="#fff" strokeWidth="3" />
          <path d="M 200 0 L 198 110" stroke="#fff" strokeWidth="3" />
        </svg>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[18px] font-black tracking-tight italic text-black/80">
          GO<span style={{ color: BRAND }}>I</span>
        </div>
        <button className="absolute top-2 right-2 size-8 rounded-full bg-white shadow-md grid place-items-center ring-1 ring-black/5">
          <Menu className="size-3.5" />
        </button>
        <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-md px-3 py-1.5 ring-1 ring-black/5">
          <div className="text-[8.5px] font-bold text-black/70 text-center leading-tight">בחר כתובת איסוף ומסירה<br/>למטה</div>
        </div>
      </div>

      {/* White sheet with grabber, holds the scrolling form */}
      <div className="absolute inset-x-0 top-[94px] bottom-0 bg-white rounded-t-2xl shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="pt-1.5 pb-1 grid place-items-center">
          <div className="w-8 h-1 rounded-full bg-black/15" />
        </div>
        <div className="relative h-[calc(100%-14px)] overflow-hidden">
          <div dir="rtl" className="absolute inset-x-0 top-0 px-3 pb-2" style={{ animation: "deliveryScroll 8s cubic-bezier(.55,.05,.35,1) forwards" }}>
            {/* --- Service header row --- */}
            <div dir="rtl" className="flex items-center gap-2 pt-1.5 pb-2">
              <div className="size-9 rounded-full bg-black grid place-items-center shrink-0">
                <Truck className="size-4 text-white" strokeWidth={2.2} />
              </div>
              <div className="text-right leading-tight">
                <div className="text-[13px] font-black text-black">הובלה קטנה</div>
                <div className="text-[8.5px] text-black/50">פריט כבד או רכב תואם</div>
              </div>
            </div>

            {/* --- Pickup / dropoff --- */}
            <div className="space-y-1.5">
              <AddrRow color={BRAND} label="מאיפה?" placeholder="כתובת איסוף" />
              <AddrRow color="#DC2626" label="לאן?" placeholder="כתובת מסירה" />
            </div>

            {/* + multi-stop */}
            <button className="mt-1.5 w-full h-8 rounded-xl border border-dashed border-black/25 text-[9.5px] font-bold text-black/70 flex items-center justify-center gap-1.5">
              <Plus className="size-3" /> אותו שליח, כמה יעדים
            </button>

            {/* --- What are we moving --- */}
            <div dir="rtl" className="mt-3 text-right text-[10px] font-black text-black">מה מעבירים?</div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-5 gap-1">
              {[
                { Icon: Refrigerator, l: "מקרר" },
                { Icon: Armchair, l: "כורסה" },
                { Icon: Package, l: "ארון" },
                { Icon: Bed, l: "מיטה", selected: true },
                { Icon: Sofa, l: "ספה" },
                { Icon: Boxes, l: "קרטונים" },
                { Icon: Piano, l: "פסנתר" },
                { Icon: Utensils, l: "שולחן" },
                { Icon: Tv, l: "טלוויזיה" },
                { Icon: WashingMachine, l: "מכ׳ כביסה" },
              ].map(({ Icon, l, selected }) => (
                <div
                  key={l}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 ${
                    selected ? "ring-2 bg-[#FEF6D6]" : "bg-black/[0.04]"
                  }`}
                  style={selected ? { ["--tw-ring-color" as string]: YELLOW } : undefined}
                >
                  <Icon className={`size-3.5 ${selected ? "text-[#A37500]" : "text-black/70"}`} strokeWidth={2.2} />
                  <div className="text-[7.5px] font-bold text-black">{l}</div>
                </div>
              ))}
            </div>

            {/* --- Floors --- */}
            <div dir="rtl" className="mt-3 grid grid-cols-2 gap-1.5 text-right">
              <div>
                <div className="text-[9.5px] text-black/70">קומה באיסוף</div>
                <div className="mt-1 h-8 rounded-xl bg-black/[0.04] px-2.5 flex items-center text-[10px] font-bold text-black">0 = קרקע</div>
              </div>
              <div>
                <div className="text-[9.5px] text-black/70">קומה במסירה</div>
                <div className="mt-1 h-8 rounded-xl bg-black/[0.04] px-2.5 flex items-center text-[10px] font-bold text-black">0 = קרקע</div>
              </div>
            </div>

            {/* --- Vehicle --- */}
            <div dir="rtl" className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-black">
              <Truck className="size-3.5" /> סוג רכב להובלה
            </div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button className="h-11 rounded-xl px-2.5 flex flex-col items-start justify-center ring-2 bg-[#FEF6D6] text-right" style={{ ["--tw-ring-color" as string]: YELLOW }}>
                <div className="text-[10.5px] font-black text-black">מיני-טנדר</div>
                <div className="text-[7.5px] text-black/60">עד ~5 מ״ק</div>
              </button>
              <button className="h-11 rounded-xl bg-black/[0.05] px-2.5 flex flex-col items-start justify-center text-right">
                <div className="text-[10.5px] font-black text-black">טנדר</div>
                <div className="text-[7.5px] text-black/50">עד ~8 מ״ק</div>
              </button>
              <button className="col-span-2 h-11 rounded-xl bg-black/[0.05] px-2.5 flex flex-col items-start justify-center text-right">
                <div className="text-[10.5px] font-black text-black">משאית 3.5 טון</div>
                <div className="text-[7.5px] text-black/50">דירה קטנה</div>
              </button>
            </div>

            {/* + add item */}
            <button className="mt-2 w-full h-8 rounded-xl border border-dashed border-black/25 text-[9.5px] font-bold text-black/70 flex items-center justify-center gap-1.5">
              <Plus className="size-3" /> הוסף פריט עם כמות
            </button>

            {/* --- Recipient --- */}
            <div dir="rtl" className="mt-3 flex items-center justify-between">
              <div className="text-[10px] font-black text-black flex items-center gap-1"><UserCircle2 className="size-3.5" /> פרטי הנמען</div>
              <label className="text-[8.5px] text-black/60 flex items-center gap-1"><span className="size-3 rounded-[3px] bg-black/10 grid place-items-center" /> אני הנמען</label>
            </div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="h-8 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center text-[10px] text-black/40">שם הנמען</div>
              <div className="h-8 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center text-[10px] text-black/40">טלפון הנמען</div>
            </div>

            {/* --- Photos --- */}
            <div dir="rtl" className="mt-3 text-right text-[9.5px] text-black/70 flex items-center gap-1">
              <Camera className="size-3" /> תמונות (אופציונלי, עד 6)
            </div>
            <div dir="rtl" className="mt-1.5 flex justify-start">
              <div className="w-16 h-16 rounded-xl border border-dashed border-black/25 flex flex-col items-center justify-center gap-0.5 bg-black/[0.02]">
                <Camera className="size-4 text-black/40" />
                <div className="text-[8px] font-bold text-black/50">הוסף</div>
              </div>
            </div>

            {/* --- Notes --- */}
            <div dir="rtl" className="mt-3 text-right text-[9.5px] text-black/70">הערות (קומה, מעלית, פירוק וכו׳)</div>
            <div dir="rtl" className="mt-1.5 h-9 rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 flex items-center text-[10px] text-black/40">
              למשל: קומה 3 בלי מעלית
            </div>

            {/* --- Price --- */}
            <div dir="rtl" className="mt-3 text-right text-[10px] font-black text-black">מחיר</div>
            <div dir="rtl" className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button className="h-8 rounded-full bg-black text-white text-[10px] font-black">אני מציע מחיר</button>
              <button className="h-8 rounded-full bg-black/[0.05] text-[10px] font-bold text-black/70">קבל הצעות</button>
            </div>
            <div dir="rtl" className="mt-1.5 h-9 rounded-xl bg-black/[0.04] px-3 flex items-center justify-end text-[13px] font-black text-black">
              ₪ 280
            </div>

            <div dir="rtl" className="mt-1 text-right text-[7.5px] text-black/50 leading-tight">
              זה מחיר מומלץ בלבד — אתה חופשי להציע כל סכום. מחיר גבוה יותר מגדיל את הסיכוי שיאשרו מהר.
            </div>

            {/* CTA — part of the scrolling content */}
            <div className="mt-3">
              <button className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-white font-black text-[13px] shadow-lg" style={{ background: BRAND, boxShadow: "0 6px 16px -4px rgba(53,173,41,0.55)", animation: "ctaPress 8s ease-out forwards", transformOrigin: "center" }}>
                <Radar14 /> מצא לי מוביל עכשיו
              </button>
              <div className="mt-1.5 flex items-center gap-1.5 text-[8.5px] text-black/60">
                <div className="size-4 rounded-md grid place-items-center shrink-0" style={{ background: YELLOW }}>
                  <Check className="size-2.5 text-black" strokeWidth={3.5} />
                </div>
                <span>קראתי ואני מאשר את <u>תנאי השירות</u> ו<u>מדיניות הפרטיות</u>.</span>
              </div>
            </div>
            <div className="h-4" />
          </div>
        </div>
      </div>

      <style>{`
@keyframes deliveryScroll {
  0%   { transform: translateY(0); }
  10%  { transform: translateY(0); }
  35%  { transform: translateY(-190px); }
  60%  { transform: translateY(-390px); }
  85%  { transform: translateY(-590px); }
  100% { transform: translateY(-610px); }
}
@keyframes ctaReveal {
  0%,80% { opacity: 0; transform: translateY(8px); }
  90%,100% { opacity: 1; transform: translateY(0); }
}
@keyframes ctaPress {
  0%,90% { transform: scale(1); filter: brightness(1); }
  93%    { transform: scale(0.94); filter: brightness(0.88); }
  100%   { transform: scale(1); filter: brightness(1); }
}
@keyframes quoteIn {
  0%   { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes quoteSelect {
  0%,100% { box-shadow: 0 0 0 0 rgba(53,173,41,0); }
  50%     { box-shadow: 0 0 0 6px rgba(53,173,41,0.18); }
}
@keyframes quoteTap {
  0%   { transform: scale(1); filter: brightness(1); }
  20%  { transform: scale(0.92); filter: brightness(0.85); }
  60%  { transform: scale(1.02); filter: brightness(1.05); }
  100% { transform: scale(1); filter: brightness(1); }
}
      `}</style>
    </div>
  );
}

function MoveQuotesScreen() {
  const quotes = [
    { name: "אבי כהן", vehicle: "טנדר · 8 מ״ק", rating: 4.9, jobs: 312, eta: 22, price: 260, delay: 0, photo: moverAvi },
    { name: "יוסי ברק", vehicle: "מיני-טנדר · 5 מ״ק", rating: 4.8, jobs: 187, eta: 18, price: 240, delay: 900, photo: moverYossi },
    { name: "משה לוי", vehicle: "משאית 3.5 טון", rating: 5.0, jobs: 421, eta: 30, price: 310, delay: 1800, photo: moverMoshe },
  ];
  return (
    <div dir="rtl" className="flex flex-col h-full bg-[#F7F7F5]">
      {/* header */}
      <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-black/5 bg-white">
        <ArrowLeft className="size-4 text-black/70 rotate-180" />
        <div className="text-[11px] font-black text-black">הצעות מובילים</div>
        <div className="w-4" />
      </div>

      {/* progress */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-1">
        {["פרטים", "הצעות", "בדרך", "בוצע"].map((lbl, i) => {
          const now = i === 1;
          const done = i < 1;
          return (
            <div key={lbl} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="h-1 w-full rounded-full" style={{ background: done || now ? BRAND : "rgba(0,0,0,0.1)" }} />
              <div className="text-[6.5px] font-bold" style={{ color: now ? BRAND : done ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)" }}>{lbl}</div>
            </div>
          );
        })}
      </div>

      {/* body */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10.5px] font-black text-black">3 הצעות התקבלו</div>
          <div className="flex items-center gap-1 text-[8.5px] font-bold text-black/60">
            <span className="size-1.5 rounded-full bg-[#35AD29] animate-pulse" />
            ממתין להצעות
          </div>
        </div>

        <div className="space-y-1.5">
          {quotes.map((q, i) => {
            const selected = i === 1;
            return (
              <div
                key={q.name}
                className={`rounded-xl bg-white ring-1 px-2.5 py-2 ${selected ? "ring-[#35AD29]" : "ring-black/5"}`}
                style={{
                  animation: `quoteIn 0.35s ease-out ${q.delay}ms both${selected ? ", quoteSelect 1.4s ease-in-out 2600ms 1" : ""}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <img src={q.photo} alt={q.name} loading="lazy" className="size-9 rounded-full object-cover ring-1 ring-black/10 shrink-0" />
                  <div className="flex-1 text-right leading-tight min-w-0">
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-[10.5px] font-black text-black truncate">{q.name}</div>
                      <div className="flex items-center gap-0.5 text-[8px] font-bold text-black/60 shrink-0">
                        <Star className="size-2.5 fill-[#F5C518] text-[#F5C518]" /> {q.rating} · {q.jobs}
                      </div>
                    </div>
                    <div className="text-[8px] text-black/50 flex items-center justify-end gap-1 mt-0.5">
                      <Truck className="size-2.5" /> {q.vehicle} · הגעה ~{q.eta} דק׳
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-black text-black">₪ {q.price}</div>
                    {selected && (
                      <div className="text-[7.5px] font-black text-[#35AD29] flex items-center justify-end gap-0.5">
                        <Check className="size-2.5" strokeWidth={3} /> נבחר
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className={`mt-1.5 w-full h-7 rounded-full text-[10px] font-black flex items-center justify-center gap-1 ${selected ? "text-white" : "text-black/70 bg-black/[0.05]"}`}
                  style={selected ? {
                    background: BRAND,
                    boxShadow: "0 4px 10px -3px rgba(53,173,41,0.5)",
                    animation: "quoteTap 1s ease-out 2400ms 1 both",
                    transformOrigin: "center",
                  } : undefined}
                >
                  {selected ? <><Check className="size-3" strokeWidth={3} /> נבחר מוביל</> : "בחר מוביל"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl bg-white ring-1 ring-black/5 px-2.5 py-2 text-right" style={{ animation: "fade-in 0.4s ease-out 3200ms both" }}>
          <div className="text-[9px] text-black/50">מוביל נבחר</div>
          <div className="text-[11px] font-black text-black mt-0.5">יוסי ברק · מיני-טנדר</div>
          <div className="text-[8.5px] text-black/60 mt-0.5">₪ 240 · מגיע בעוד ~18 דק׳</div>
        </div>
      </div>
      <style>{`
@keyframes quoteIn { 0% { transform: translateY(12px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes quoteSelect { 0%,100% { box-shadow: 0 0 0 0 rgba(53,173,41,0); } 50% { box-shadow: 0 0 0 6px rgba(53,173,41,0.18); } }
@keyframes quoteTap { 0% { transform: scale(1); filter: brightness(1); } 20% { transform: scale(0.92); filter: brightness(0.85); } 60% { transform: scale(1.02); filter: brightness(1.05); } 100% { transform: scale(1); filter: brightness(1); } }
      `}</style>
    </div>
  );
}


function AddrRow({ color, label, placeholder }: { color: string; label: string; placeholder: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] ring-1 ring-black/10 px-2.5 py-1.5 flex items-center gap-2">
      <MapPin className="size-3.5 text-black/35" />
      <div className="flex-1 text-right leading-tight">
        <div className="text-[8.5px] font-bold" style={{ color }}>{label}</div>
        <div className="text-[9.5px] text-black/45">{placeholder}</div>
      </div>
      <div className="size-2.5 rounded-full" style={{ background: color }} />
    </div>
  );
}

function SizeChip({ label, sub, selected = false }: { label: string; sub: string; selected?: boolean }) {
  return (
    <div
      className={`aspect-[1/1] rounded-xl flex flex-col items-center justify-center gap-0.5 text-center ${selected ? "ring-2" : "ring-1 ring-black/[0.06]"}`}
      style={{
        background: selected ? "#FEF6D6" : "rgba(0,0,0,0.03)",
        ...(selected ? { ["--tw-ring-color" as string]: YELLOW } : {}),
      }}
    >
      <div className="text-[10px] font-black text-black leading-none">{label}</div>
      <div className="text-[7px] text-black/55 leading-none">{sub}</div>
    </div>
  );
}

function Radar14() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" opacity="0.35"/>
      <circle cx="12" cy="12" r="5" opacity="0.55"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <path d="M12 12 L19 7" />
    </svg>
  );
}





function TrackScreen() {

  return (
    <div dir="rtl" className="w-full h-full flex flex-col relative">
      <StatusBar />
      <div className="absolute inset-0 top-8">
        <div
          className="w-full h-full relative"
          style={{
            background: "linear-gradient(135deg, #e6f4ea 0%, #d1ebd7 40%, #f0e9d8 100%)",
          }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 300 600">
            <path d="M 20 100 Q 100 150 180 200 T 280 400" stroke="#fff" strokeWidth="12" fill="none" />
            <path d="M 250 50 Q 200 200 100 350" stroke="#fff" strokeWidth="10" fill="none" />
            <path d="M 30 300 L 260 320" stroke="#fff" strokeWidth="8" fill="none" />
            <path d="M 220 180 L 90 250" stroke={BRAND} strokeWidth="3" fill="none" strokeDasharray="6 4" />
          </svg>
          <div className="absolute top-[30%] right-[25%] size-5 rounded-full ring-4 ring-white shadow-lg animate-pulse" style={{ background: BRAND }} />
          <div className="absolute top-[45%] left-[30%] size-5 rounded-full ring-4 ring-white shadow-lg bg-black" />
        </div>
      </div>

      <div className="mt-auto relative z-10 p-3 space-y-2">
        <div className="rounded-2xl bg-white shadow-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 grid place-items-center text-white font-black">י</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-black">יוסי · אופנוע</div>
              <div className="text-[10.5px] text-black/55 flex items-center gap-1">
                <Star className="size-3 fill-current" style={{ color: YELLOW }} />
                4.9 · 320 משלוחים
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-8 rounded-full grid place-items-center" style={{ background: `${BRAND}18` }}>
                <MessageCircle className="size-3.5" style={{ color: BRAND }} />
              </div>
              <div className="size-8 rounded-full bg-black grid place-items-center text-white">
                <Phone className="size-3.5" />
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-between">
            <div>
              <div className="text-[9.5px] text-black/50">הגעה משוערת</div>
              <div className="text-[15px] font-black" style={{ color: BRAND }}>8 דקות</div>
            </div>
            <div className="text-[10px] font-black px-2.5 py-1.5 rounded-full inline-flex items-center gap-1" style={{ background: `${BRAND}18`, color: BRAND }}>
              <span className="size-1.5 rounded-full animate-pulse" style={{ background: BRAND }} />
              LIVE · בדרך אליך
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ CHAT SCREEN ============ */
function ChatScreen() {
  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-[#f5f6f8]">
      <StatusBar />
      <div className="px-4 py-2.5 flex items-center gap-2.5 border-b border-black/5 bg-white">
        <ArrowLeft className="size-4 rotate-180" />
        <div className="size-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 grid place-items-center text-white font-black text-[10px]">י</div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-black">יוסי · השליח שלכם</div>
          <div className="text-[9.5px]" style={{ color: BRAND }}>● מקוון</div>
        </div>
        <Phone className="size-4 text-black/60" />
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-white p-2.5 shadow-sm ml-auto">
          <div className="text-[11.5px]">שלום, אני יוצא אליכם 🛵</div>
          <div className="text-[8.5px] text-black/40 mt-0.5">10:24</div>
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-tl-md p-2.5 shadow-sm text-white" style={{ background: BRAND }}>
          <div className="text-[11.5px]">תודה! החבילה בכניסה</div>
          <div className="text-[8.5px] text-white/70 mt-0.5 flex items-center gap-0.5">10:25 <Check className="size-2.5" /></div>
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-white p-2.5 shadow-sm ml-auto">
          <div className="text-[11.5px]">מגיע בעוד 8 דקות 👍</div>
          <div className="text-[8.5px] text-black/40 mt-0.5">10:26</div>
        </div>
        <div className="max-w-[65%] rounded-2xl rounded-tl-md p-2.5 shadow-sm bg-white ring-1 ring-black/5 flex items-center gap-2">
          <Camera className="size-3.5 text-black/60" />
          <div className="text-[11px] font-bold">תמונת מסירה</div>
        </div>
      </div>
      <div className="p-2 bg-white border-t border-black/5">
        <div className="flex items-center gap-2 bg-black/[0.04] rounded-full h-9 px-3">
          <div className="flex-1 text-[10.5px] text-black/40">כתבו הודעה...</div>
          <div className="size-7 rounded-full grid place-items-center" style={{ background: BRAND }}>
            <MessageCircle className="size-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ BOTTOM NAV ============ */
function BottomNav({ active = 0 }: { active?: number }) {
  const items = [Home, Activity, Plus, MessageCircle, UserCircle2];
  return (
    <div className="relative mt-auto shrink-0">
      <div className="grid grid-cols-5 h-14 bg-white border-t border-black/5">
        {items.map((Icon, i) => {
          if (i === 2) {
            return (
              <div key={i} className="flex items-end justify-center pb-1 relative">
                <div className="absolute -top-4 size-11 rounded-full grid place-items-center ring-4 ring-white shadow-lg" style={{ background: YELLOW }}>
                  <Icon className="size-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={`flex items-center justify-center ${i === active ? "text-black" : "text-black/40"}`}>
              <Icon className="size-4.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ TRUST BAR ============ */
function TrustBar() {
  const items = [
    { n: "500+",   l: "שליחים ומובילים",  icon: Bike,         k: "NET",  pct: 78 },
    { n: "4.9★",   l: "דירוג לקוחות",      icon: Star,         k: "RTG",  pct: 96 },
    { n: "15'",    l: "זמן איסוף ממוצע",   icon: Clock,        k: "ETA",  pct: 82 },
    { n: "24/7",   l: "זמינות",             icon: Activity,     k: "SYS",  pct: 100 },
    { n: "38K+",   l: "משלוחים בחודש",     icon: PackageCheck, k: "VOL",  pct: 88 },
    { n: "12",     l: "ערים פעילות",        icon: MapPin,       k: "GEO",  pct: 60 },
    { n: "99.4%",  l: "שביעות רצון",       icon: BadgeCheck,   k: "CSAT", pct: 99 },
    { n: "0₪",     l: "התקנה מהחנות",     icon: Download,     k: "PWA",  pct: 100 },
    { n: "3 דק'",  l: "זמן תגובה ממוצע",   icon: Zap,          k: "RSP",  pct: 91 },
    { n: "98%",    l: "משלוחים בזמן",      icon: Timer,        k: "OTD",  pct: 98 },
    { n: "120K+",  l: "לקוחות פעילים",     icon: Users,        k: "USR",  pct: 84 },
    { n: "AES-256",l: "הצפנת תשלומים",     icon: Shield,       k: "SEC",  pct: 100 },
  ];
  // duplicate for seamless marquee
  const loop = [...items, ...items, ...items];
  return (
    <section dir="rtl" className="relative bg-[#0A0B0D] pb-14 lg:pb-20 -mt-px overflow-hidden">
      {/* soft ambient glow instead of hard grid lines */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[280px] pointer-events-none" aria-hidden
        style={{
          background: `radial-gradient(60% 100% at 50% 50%, ${BRAND}12, transparent 70%)`,
        }} />


      {/* Mobile: auto-scrolling marquee */}
      <div className="relative md:hidden" dir="ltr">
        <div className="relative overflow-hidden"
          style={{ maskImage: "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)" }}>
          <div className="flex gap-2.5 w-max" style={{ animation: "trustMarquee 60s linear infinite" }}>
            {loop.map((i, idx) => (
              <TrustCard key={idx} item={i} className="w-[160px] shrink-0" compact />
            ))}
          </div>
        </div>
      </div>



      {/* Desktop: infinite marquee */}
      <div className="relative hidden md:block max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="relative overflow-hidden"
          style={{ maskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)" }}>
          <div className="flex gap-3 w-max" style={{ animation: "trustMarquee 45s linear infinite" }}>
            {loop.map((i, idx) => (
              <TrustCard key={idx} item={i} className="w-[210px] shrink-0" />
            ))}

          </div>
        </div>
      </div>
      <style>{`
@keyframes trustMarquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`}</style>
    </section>
  );
}

function TrustCard({ item, className = "", compact = false }: { item: { n: string; l: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>; k: string; pct: number }; className?: string; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <div className={`group relative rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden hover:border-white/20 hover:bg-white/[0.05] transition ${compact ? "p-3" : "p-4"} ${className}`}>
      <div className="absolute top-0 left-0 w-16 h-16 rounded-br-3xl opacity-40"
        style={{ background: `radial-gradient(closest-side, ${BRAND}22, transparent 70%)` }} />
      <div className={`relative flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <div className={`${compact ? "size-7" : "size-9"} rounded-xl grid place-items-center border border-white/10`}
          style={{ background: `linear-gradient(135deg, ${BRAND}22, transparent)` }}>
          <Icon className={compact ? "size-3.5" : "size-4"} strokeWidth={2.2} style={{ color: BRAND }} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: BRAND }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: BRAND }} />
          </span>
          <span className="font-mono text-[9px] tracking-[0.15em] text-white/40">{item.k}</span>
        </div>
      </div>
      <div className={`relative font-black leading-none text-white tracking-tight ${compact ? "text-[22px]" : "text-[28px] sm:text-[32px]"}`}>
        {item.n}
      </div>
      <div className={`relative text-white/50 ${compact ? "text-[11px] mt-1.5" : "text-[12px] mt-2"}`}>{item.l}</div>
      <div className={`relative w-full rounded-full bg-white/[0.05] overflow-hidden ${compact ? "mt-2 h-[2px]" : "mt-3 h-[3px]"}`}>
        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: `linear-gradient(90deg, ${BRAND}, #6EE7B7)` }} />
      </div>
    </div>
  );
}


/* ============ HOW IT WORKS ============ */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "שולחים בקשה",
      desc: "כתובות, פריט, מחיר קבוע מראש. שלוש נגיעות ואישור.",
      visual: (
        <div className="w-full h-full flex flex-col justify-center gap-1.5 px-3">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/10">
            <span className="size-1.5 rounded-full" style={{ background: BRAND }} />
            <span className="text-[11px] text-white/70">רח׳ דיזנגוף 50</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/10">
            <span className="size-1.5 rounded-full bg-white/50" />
            <span className="text-[11px] text-white/70">רח׳ הרצל 12</span>
          </div>
          <div
            className="mt-1 flex items-center justify-between px-2.5 py-2 rounded-lg border"
            style={{ background: `${BRAND}18`, borderColor: `${BRAND}55` }}
          >
            <span className="text-[10px] text-white/60">מחיר קבוע</span>
            <span className="text-[13px] font-bold" style={{ color: BRAND }}>₪ 32</span>
          </div>
        </div>
      ),
    },
    {
      num: "02",
      title: "הרשת מקבלת ומאשרת",
      desc: "אלפי שליחים ומובילים עצמאיים ברשת. הכי קרוב וזמין מאשר תוך שניות.",
      visual: (
        <div className="relative w-full h-full overflow-hidden">
          {/* radar rings */}
          <div className="absolute inset-0 grid place-items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute rounded-full border"
                style={{
                  borderColor: `${BRAND}44`,
                  width: 24,
                  height: 24,
                  animation: `howBroadcast 2.6s ease-out ${i * 0.85}s infinite`,
                }}
              />
            ))}
          </div>
          {/* center dot (you) */}
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="size-3 rounded-full border-2 border-white z-10"
              style={{ background: BRAND, boxShadow: `0 0 12px ${BRAND}` }}
            />
          </div>
          {/* independent couriers around */}
          {[
            { top: "14%", left: "18%", d: 0, label: "יוסי" },
            { top: "22%", right: "16%", d: 0.4, label: "דנה" },
            { bottom: "18%", left: "14%", d: 0.8, label: "רון" },
            { bottom: "16%", right: "20%", d: 1.2, label: "אבי" },
            { top: "48%", right: "6%", d: 0.6, label: "" },
            { top: "52%", left: "6%", d: 1.0, label: "" },
          ].map((p, i) => {
            const { d, label, ...pos } = p;
            return (
              <div
                key={i}
                className="absolute flex items-center gap-1"
                style={{ ...pos, animation: `howFadeIn 0.5s ease-out ${d}s both` }}
              >
                <div
                  className="size-2 rounded-full"
                  style={{ background: BRAND, boxShadow: `0 0 6px ${BRAND}` }}
                />
                {label && (
                  <span className="text-[9px] font-medium text-white/70 bg-black/60 backdrop-blur px-1 rounded">
                    {label} ✓
                  </span>
                )}
              </div>
            );
          })}
          {/* accepted chip */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur border" style={{ borderColor: `${BRAND}66` }}>
            <span className="size-1 rounded-full animate-pulse" style={{ background: BRAND }} />
            <span className="text-[9px] font-bold tracking-wider" style={{ color: BRAND }}>3 אישרו</span>
          </div>
        </div>
      ),
    },
    {
      num: "03",
      title: "עקבו בזמן אמת",
      desc: "מפה חיה, צ׳אט וקבלה דיגיטלית.",
      visual: (
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-[#0B1512] border border-white/5">
          {/* map grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          {/* dashed route */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
            <path
              d="M 20 95 Q 70 50 130 60 T 185 25"
              fill="none"
              stroke={BRAND}
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.85"
            />
          </svg>
          {/* destination pin */}
          <div className="absolute" style={{ top: "18%", left: "8%" }}>
            <div className="size-2 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
          </div>
          {/* courier */}
          <div className="absolute" style={{ top: "72%", right: "8%" }}>
            <span
              className="absolute inset-0 rounded-full"
              style={{ background: BRAND, opacity: 0.35, animation: "howPing 2s ease-out infinite" }}
            />
            <div
              className="relative size-3 rounded-full border-2 border-white"
              style={{ background: BRAND, boxShadow: `0 0 12px ${BRAND}` }}
            />
          </div>
          {/* live chip */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur border border-white/10">
            <span className="size-1 rounded-full animate-pulse" style={{ background: BRAND }} />
            <span className="text-[9px] font-bold text-white tracking-wider">LIVE</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how" dir="rtl" className="relative overflow-hidden bg-[#0A0B0D] text-white py-14 sm:py-20">
      {/* ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        <div
          className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] rounded-full blur-[120px] opacity-25"
          style={{ background: `${BRAND}88` }}
        />
      </div>

      <div className="relative max-w-[1100px] mx-auto px-4 sm:px-5 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-[560px] mx-auto mb-10 sm:mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{ borderColor: `${BRAND}55`, background: `${BRAND}14`, color: BRAND }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: BRAND }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: BRAND }} />
            </span>
            איך זה עובד
          </div>
          <h2 className="mt-3 text-[24px] sm:text-[32px] lg:text-[38px] font-black leading-[1.1] tracking-tight">
            שלושה שלבים.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(120deg, ${BRAND}, #7DF9C4 60%, #fff)` }}
            >
              הזמנה בדרך.
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* connector line */}
          <div
            className="hidden md:block absolute top-[74px] right-[12%] left-[12%] h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${BRAND}55, transparent)` }}
          />

          <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {steps.map((s) => (
              <div key={s.num} className="relative group">
                <div
                  className="rounded-2xl p-[1px] transition-transform duration-500 group-hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(160deg, ${BRAND}55, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.02))`,
                  }}
                >
                  <div className="relative rounded-[15px] bg-[#0E1013]/95 backdrop-blur-xl p-4 sm:p-5 h-full overflow-hidden">
                    {/* Visual preview */}
                    <div className="relative h-[128px] rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden mb-4">
                      {s.visual}
                    </div>

                    {/* Text row */}
                    <div className="flex items-start gap-3">
                      <span
                        className="text-[22px] leading-none font-black tabular-nums shrink-0"
                        style={{
                          WebkitTextStroke: `1px ${BRAND}99`,
                          color: "transparent",
                        }}
                      >
                        {s.num}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight mb-0.5">
                          {s.title}
                        </h3>
                        <p className="text-[12.5px] text-white/55 leading-[1.55]">{s.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes howPing {
          0% { transform: scale(1); opacity: 0.5; }
          80%,100% { transform: scale(3.2); opacity: 0; }
        }
        @keyframes howPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes howBroadcast {
          0% { width: 24px; height: 24px; opacity: 0.9; }
          100% { width: 240px; height: 240px; opacity: 0; }
        }
        @keyframes howFadeIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </section>
  );
}

/* ============ SHOWCASE SHELL ============ */
function ShowcaseSection({
  id,
  eyebrow,
  eyebrowColor,
  title,
  desc,
  bullets,
  ctaLabel,
  ctaHref,
  primary = false,
  reverse = false,
  children,
  bg,
}: {
  id: string;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  desc: string;
  bullets: { icon: React.ComponentType<{ className?: string }>; label: string }[];
  ctaLabel: string;
  ctaHref: string;
  primary?: boolean;
  reverse?: boolean;
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section id={id} className="py-16 sm:py-24 relative overflow-hidden" style={{ background: bg }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? "lg:[direction:ltr]" : ""}`}>
          <div dir="rtl" className="text-center lg:text-right">
            <div
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white border border-black/[0.06] shadow-sm text-[12.5px] font-black"
              style={{ color: eyebrowColor }}
            >
              <Sparkles size={14} />
              {eyebrow}
            </div>
            <h2 className="mt-4 text-[28px] sm:text-[38px] lg:text-[46px] font-black leading-[1.05] tracking-[-0.02em]">
              {title}
            </h2>
            <p className="mt-4 text-[15.5px] sm:text-[17px] text-black/65 leading-[1.75] max-w-[540px] mx-auto lg:mx-0">
              {desc}
            </p>
            <ul className="mt-6 space-y-2.5 inline-block text-right">
              {bullets.map((b) => (
                <li key={b.label} className="flex items-center gap-3 text-[14.5px] text-black/85">
                  <span
                    className="size-7 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `${eyebrowColor}18`, color: eyebrowColor }}
                  >
                    <b.icon className="size-4" />
                  </span>
                  {b.label}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <a
                href={ctaHref}
                className={`inline-flex items-center justify-center gap-2 h-13 px-6 rounded-full font-bold text-[14.5px] transition ${
                  primary
                    ? "text-white shadow-[0_18px_36px_-12px_rgba(53,173,41,0.55)] hover:opacity-95"
                    : "bg-black text-white hover:opacity-90"
                }`}
                style={primary ? { background: BRAND, height: 52 } : { height: 52 }}
              >
                {ctaLabel}
                <ArrowLeft className="size-4" />
              </a>
            </div>
          </div>
          <div dir="rtl" className="flex justify-center lg:justify-start">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ DELIVERY SHOWCASE ============ */
function DeliveryShowcase() {
  const bullets = [
    { icon: Bike, label: "משלוח מיידי בדו-גלגלי או ברכב" },
    { icon: PackageCheck, label: '"תביאו לי" — שליח קונה ומביא במקומכם' },
    { icon: Clock, label: "תזמון מראש להיום, למחר או לתאריך ספציפי" },
    { icon: ShieldCheck, label: "תשלום מאובטח — אשראי, ביט או Apple/Google Pay" },
  ];
  return (
    <section
      id="delivery"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background:
          "radial-gradient(120% 80% at 85% 10%, #10331A 0%, #061109 45%, #030805 100%)",
        color: "#EAF6E9",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(80% 60% at 50% 40%, black 30%, transparent 85%)",
        }}
      />
      <div
        className="absolute -top-40 -right-32 size-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${BRAND}55, transparent 65%)`, filter: "blur(20px)" }}
      />
      <div
        className="absolute -bottom-40 -left-24 size-[420px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, #7BF06A44, transparent 70%)`, filter: "blur(24px)" }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div dir="rtl" className="text-center lg:text-right">
            <div
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12.5px] font-black"
              style={{
                background: "rgba(53,173,41,0.14)",
                border: "1px solid rgba(123,240,106,0.35)",
                color: "#B6F5AC",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#7BF06A" }} />
                <span className="relative size-2 rounded-full" style={{ background: "#7BF06A" }} />
              </span>
              משלוחים · Goi Express
            </div>
            <h2 className="mt-5 text-[30px] sm:text-[42px] lg:text-[52px] font-black leading-[1.02] tracking-[-0.025em]">
              שלחו כל דבר,
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #7BF06A 0%, #35AD29 60%, #C8FFC0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                לכל מקום — בלחיצה
              </span>
            </h2>
            <p className="mt-5 text-[15.5px] sm:text-[17px] leading-[1.75] max-w-[540px] mx-auto lg:mx-0" style={{ color: "rgba(234,246,233,0.72)" }}>
              חבילה, מסמכים, קניות מהחנות או אפילו מנת אוכל. בוחרים את סוג המשלוח, כתובות, ומקבלים מחיר קבוע מיד. שליח מגיע תוך דקות ואתם עוקבים אחריו על המפה.
            </p>
            <ul className="mt-7 grid sm:grid-cols-2 gap-2.5 text-right">
              {bullets.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-3 text-[14px] rounded-2xl px-3 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(123,240,106,0.14)",
                    color: "rgba(234,246,233,0.92)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <span
                    className="size-8 rounded-xl grid place-items-center shrink-0"
                    style={{ background: "rgba(123,240,106,0.14)", color: "#B6F5AC" }}
                  >
                    <b.icon className="size-4" />
                  </span>
                  <span className="leading-tight">{b.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
              <a
                href="#install"
                className="inline-flex items-center justify-center gap-2 px-6 rounded-full font-bold text-[14.5px] transition hover:opacity-95"
                style={{
                  height: 52,
                  background: "linear-gradient(135deg, #7BF06A 0%, #35AD29 100%)",
                  color: "#04170A",
                  boxShadow: "0 20px 40px -12px rgba(53,173,41,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                פתחו הזמנת משלוח
                <ArrowLeft className="size-4" />
              </a>
              <div
                className="inline-flex items-center gap-2 px-4 rounded-full text-[13px]"
                style={{
                  height: 52,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(234,246,233,0.85)",
                }}
              >
                <Clock className="size-4" style={{ color: "#B6F5AC" }} />
                איסוף ממוצע: 8 דק׳
              </div>
            </div>
          </div>

          <div dir="rtl" className="flex justify-center lg:justify-start">
            <div className="relative w-full flex items-center justify-center py-6 min-h-[600px]">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(55% 55% at 50% 50%, ${BRAND}55, transparent 70%)`, filter: "blur(8px)" }}
              />
              <div
                className="hidden sm:flex absolute top-8 right-2 items-center gap-2 px-3 h-9 rounded-full text-[12px] font-bold z-10"
                style={{
                  background: "rgba(6,17,9,0.7)",
                  border: "1px solid rgba(123,240,106,0.35)",
                  color: "#B6F5AC",
                  backdropFilter: "blur(10px)",
                }}
              >
                <MapPin className="size-3.5" />
                מפה חיה
              </div>
              <div
                className="hidden sm:flex absolute bottom-14 left-2 items-center gap-2 px-3 h-9 rounded-full text-[12px] font-bold z-10"
                style={{
                  background: "rgba(6,17,9,0.7)",
                  border: "1px solid rgba(123,240,106,0.35)",
                  color: "#B6F5AC",
                  backdropFilter: "blur(10px)",
                }}
              >
                <ShieldCheck className="size-3.5" />
                מחיר קבוע מראש
              </div>
              <div className="relative -rotate-[3deg] sm:rotate-[-4deg]">
                <PhoneFrame>
                  <img
                    src={deliveryScreen.url}
                    alt="מסך הזמנת משלוח ב-Goi"
                    className="block w-full h-full object-cover object-top"
                  />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


/* ============ MOVING SHOWCASE ============ */
function MovingShowcase() {
  const bullets = [
    { icon: Truck, label: "טנדר, משאית 3.5, 8 או 12 טון" },
    { icon: Sofa, label: "בחירה מהירה של ריהוט וקרטונים" },
    { icon: RouteIcon, label: "עצירות מרובות ותיאום קומה ומעלית" },
    { icon: ShieldCheck, label: "מובילים מדורגים ומאומתים בלבד" },
  ];
  return (
    <section
      id="moving"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background:
          "radial-gradient(120% 80% at 15% 10%, #101A3A 0%, #070A1C 45%, #03050F 100%)",
        color: "#E8ECFB",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(80% 60% at 50% 40%, black 30%, transparent 85%)",
        }}
      />
      <div
        className="absolute -top-40 -left-32 size-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${MOVE_BLUE}66, transparent 65%)`, filter: "blur(20px)" }}
      />
      <div
        className="absolute -bottom-40 -right-24 size-[420px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, #8FA9FF44, transparent 70%)`, filter: "blur(24px)" }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div dir="rtl" className="flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="relative w-full flex items-center justify-center py-6 min-h-[600px]">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(55% 55% at 50% 50%, ${MOVE_BLUE}55, transparent 70%)`, filter: "blur(8px)" }}
              />
              <div
                className="hidden sm:flex absolute top-8 left-2 items-center gap-2 px-3 h-9 rounded-full text-[12px] font-bold z-10"
                style={{
                  background: "rgba(7,10,28,0.7)",
                  border: "1px solid rgba(143,169,255,0.35)",
                  color: "#BFCCFF",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Truck className="size-3.5" />
                4 סוגי רכב
              </div>
              <div
                className="hidden sm:flex absolute bottom-14 right-2 items-center gap-2 px-3 h-9 rounded-full text-[12px] font-bold z-10"
                style={{
                  background: "rgba(7,10,28,0.7)",
                  border: "1px solid rgba(143,169,255,0.35)",
                  color: "#BFCCFF",
                  backdropFilter: "blur(10px)",
                }}
              >
                <ShieldCheck className="size-3.5" />
                מובילים מאומתים
              </div>
              <div className="relative rotate-[3deg] sm:rotate-[4deg]">
                <PhoneFrame>
                  <MovingBookScreen />
                </PhoneFrame>
              </div>
            </div>
          </div>

          <div dir="rtl" className="text-center lg:text-right order-1 lg:order-2">
            <div
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12.5px] font-black"
              style={{
                background: "rgba(92,124,250,0.16)",
                border: "1px solid rgba(143,169,255,0.35)",
                color: "#BFCCFF",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#8FA9FF" }} />
                <span className="relative size-2 rounded-full" style={{ background: "#8FA9FF" }} />
              </span>
              הובלות · Goi Move
            </div>
            <h2 className="mt-5 text-[30px] sm:text-[42px] lg:text-[52px] font-black leading-[1.02] tracking-[-0.025em]">
              מספה בודדת
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #8FA9FF 0%, #5C7CFA 60%, #C7D3FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                עד דירה שלמה
              </span>
            </h2>
            <p className="mt-5 text-[15.5px] sm:text-[17px] leading-[1.75] max-w-[540px] mx-auto lg:mx-0" style={{ color: "rgba(232,236,251,0.72)" }}>
              בונים רשימת פריטים, מוסיפים כתובות עם קומה ומעלית, ומקבלים בתוך דקות הצעות מחיר מכמה מובילים מאומתים. בוחרים את מי שהכי מתאים — לפי מחיר, דירוג או זמינות.
            </p>
            <ul className="mt-7 grid sm:grid-cols-2 gap-2.5 text-right">
              {bullets.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-3 text-[14px] rounded-2xl px-3 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(143,169,255,0.16)",
                    color: "rgba(232,236,251,0.92)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <span
                    className="size-8 rounded-xl grid place-items-center shrink-0"
                    style={{ background: "rgba(143,169,255,0.16)", color: "#BFCCFF" }}
                  >
                    <b.icon className="size-4" />
                  </span>
                  <span className="leading-tight">{b.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
              <a
                href="#install"
                className="inline-flex items-center justify-center gap-2 px-6 rounded-full font-bold text-[14.5px] transition hover:opacity-95"
                style={{
                  height: 52,
                  background: "linear-gradient(135deg, #8FA9FF 0%, #5C7CFA 100%)",
                  color: "#050B22",
                  boxShadow: "0 20px 40px -12px rgba(92,124,250,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                קבלו הצעות מהמובילים
                <ArrowLeft className="size-4" />
              </a>
              <div
                className="inline-flex items-center gap-2 px-4 rounded-full text-[13px]"
                style={{
                  height: 52,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(232,236,251,0.85)",
                }}
              >
                <Clock className="size-4" style={{ color: "#BFCCFF" }} />
                הצעה ראשונה: 3 דק׳
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ TRACK + CHAT SHOWCASE ============ */
function TrackAndChatShowcase() {
  const TEAL = "#22D3B7";
  const TEAL_SOFT = "#7EE8D6";
  return (
    <section
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background:
          "radial-gradient(120% 80% at 85% 10%, #0A2A2E 0%, #061B22 45%, #030F14 100%)",
        color: "#E6FBF6",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(80% 60% at 50% 40%, black 30%, transparent 85%)",
        }}
      />
      <div
        className="absolute -top-40 -right-32 size-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${TEAL}55, transparent 65%)`, filter: "blur(20px)" }}
      />
      <div
        className="absolute -bottom-40 -left-24 size-[420px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${TEAL_SOFT}44, transparent 70%)`, filter: "blur(24px)" }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 relative">
        <div dir="rtl" className="text-center max-w-[680px] mx-auto mb-14">
          <div
            className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12.5px] font-black"
            style={{
              background: "rgba(34,211,183,0.14)",
              border: `1px solid ${TEAL}55`,
              color: TEAL_SOFT,
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: TEAL }} />
              <span className="relative size-2 rounded-full" style={{ background: TEAL }} />
            </span>
            אחרי ההזמנה · Live
          </div>
          <h2 className="mt-5 text-[30px] sm:text-[42px] lg:text-[52px] font-black leading-[1.02] tracking-[-0.025em]">
            מפה חיה וצ׳אט —
            <br />
            <span
              style={{
                background: `linear-gradient(90deg, ${TEAL_SOFT} 0%, ${TEAL} 60%, #C5FFF3 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              הכל בתוך האפליקציה
            </span>
          </h2>
          <p className="mt-5 text-[15.5px] sm:text-[17px] leading-[1.75]" style={{ color: "rgba(230,251,246,0.72)" }}>
            רואים איפה השליח בכל רגע, שולחים לו הנחיות מיוחדות, ומקבלים תמונת מסירה בסיום.
          </p>
        </div>

        <div dir="rtl" className="grid sm:grid-cols-2 gap-10 sm:gap-8 justify-items-center">
          {[
            { screen: <TrackScreen />, title: "מעקב חי על המפה", desc: "רואים בדיוק איפה השליח, כמה זמן נותר, ומתעדכנים אוטומטית.", rot: "-rotate-[3deg]" },
            { screen: <ChatScreen />, title: "צ׳אט ישיר עם השליח", desc: "מתאמים פרטים, מקום איסוף או הנחיות מיוחדות — בלי לחייג.", rot: "rotate-[3deg]" },
          ].map((c) => (
            <div key={c.title} className="flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(55% 55% at 50% 50%, ${TEAL}44, transparent 70%)`, filter: "blur(8px)" }}
                />
                <div className={`relative ${c.rot}`}>
                  <PhoneFrame>{c.screen}</PhoneFrame>
                </div>
              </div>
              <h3 className="mt-6 text-[19px] font-black" style={{ color: "#E6FBF6" }}>{c.title}</h3>
              <p className="mt-2 max-w-[300px] text-[14px] leading-[1.7]" style={{ color: "rgba(230,251,246,0.7)" }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ PAIR OF PHONES ============ */
function PairPhones({
  front,
  back,
  accent,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative w-full flex items-center justify-center py-6 min-h-[600px]">
      {/* soft glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60% 60% at 50% 50%, ${accent}22, transparent 70%)`,
        }}
      />
      <div className="absolute right-4 sm:right-10 top-8 rotate-[6deg] hidden sm:block opacity-90">
        <PhoneFrame small>{back}</PhoneFrame>
      </div>
      <div className="relative sm:-mr-16 sm:mt-16 -rotate-[3deg] sm:rotate-0">
        <PhoneFrame>{front}</PhoneFrame>
      </div>
    </div>
  );
}

/* ============ FEATURES GRID ============ */
function FeaturesGrid() {
  const features = [
    { icon: Zap, title: "התקנה בשנייה", desc: "בלי חנות אפליקציות. שנייה — ואתם מוכנים." },
    { icon: Bell, title: "התראות בזמן אמת", desc: "יודעים בדיוק מתי השליח יצא, מתקרב ומגיע." },
    { icon: ShieldCheck, title: "תשלום מאובטח", desc: "כרטיס אשראי, ביט או Apple/Google Pay." },
    { icon: MapPin, title: "מפה חיה", desc: "רואים את השליח על המפה מהאיסוף ועד המסירה." },
    { icon: MessageCircle, title: "צ׳אט ישיר", desc: "מתאמים איתו הכל בלי לצאת מהאפליקציה." },
    { icon: Star, title: "מדורגים ומאומתים", desc: "רק שליחים ומובילים עם דירוג לקוחות גבוה." },
  ];
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center max-w-[640px] mx-auto mb-12">
          <div className="text-[13px] font-bold uppercase tracking-wider" style={{ color: BRAND }}>יכולות</div>
          <h2 className="mt-2 text-[28px] sm:text-[38px] lg:text-[44px] font-black leading-[1.1]">
            כל מה שצריך למשלוח או הובלה מושלמים
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-black/[0.06] p-5 hover:border-black/20 transition">
              <div className="size-11 rounded-xl grid place-items-center mb-4" style={{ background: `${BRAND}14` }}>
                <f.icon className="size-5" style={{ color: BRAND }} />
              </div>
              <h3 className="text-[16px] font-bold mb-1.5">{f.title}</h3>
              <p className="text-[13.5px] text-black/60 leading-[1.65]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ INSTALL SECTION ============ */
function InstallSection() {
  return (
    <section id="install" className="py-16 sm:py-24 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div
          className="relative overflow-hidden rounded-[32px] p-8 sm:p-12 lg:p-16"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
        >
          <div className="absolute inset-0 opacity-10" aria-hidden>
            <div className="absolute -top-20 -right-20 size-96 rounded-full bg-white" />
            <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-white" />
          </div>
          <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div className="text-white text-center lg:text-right">
              <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/20 backdrop-blur text-[12px] font-bold mb-4">
                <Sparkles className="size-3.5" />
                מוכנים תוך שנייה
              </div>
              <h2 className="text-[30px] sm:text-[38px] lg:text-[46px] font-black leading-[1.1] tracking-[-0.02em]">
                התקינו עכשיו את Goi
              </h2>
              <p className="mt-4 text-[16px] lg:text-[18px] text-white/90 leading-[1.6] max-w-[520px] mx-auto lg:mx-0">
                לוחצים על ״התקינו את האפליקציה״, ו-Goi יושבת לכם על מסך הבית כמו כל אפליקציה אחרת —
                בלי לעבור דרך חנות האפליקציות.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <InstallAppButton className="h-14 gap-2 rounded-full bg-white px-8 text-[15.5px] font-bold shadow-xl hover:bg-white/95 !text-[color:var(--brand)]" />
                <Link
                  to="/customer-login"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full border-2 border-white/40 text-white font-bold text-[15px] hover:bg-white/10 transition"
                >
                  כניסה לחשבון קיים
                </Link>
              </div>
              <style>{`:root { --brand: ${BRAND}; }`}</style>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="scale-90 lg:scale-100">
                <PhoneFrame>
                  <DashboardScreen />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
function FAQ() {
  const items = [
    { q: "האם אני צריך להוריד את האפליקציה מהחנות?", a: "לא. Goi היא אפליקציית PWA — לחיצה אחת מהדפדפן והיא מותקנת אצלכם במסך הבית, בלי חנות אפליקציות ובלי המתנה." },
    { q: "יש הבדל בין הזמנת משלוח להזמנת הובלה?", a: "כן. משלוח הוא פריט או חבילה שנשלחים במחיר קבוע ומיידי. הובלה היא של רהיטים או תכולת בית — בונים רשימת פריטים ומקבלים הצעות מחיר ממובילים מאומתים." },
    { q: "כמה זמן לוקח למצוא שליח?", a: "ברוב האזורים אנחנו מוצאים שליח בתוך דקות בודדות. תראו את זמן ההגעה המשוער עוד לפני שאתם מאשרים." },
    { q: "איך משלמים?", a: "בכרטיס אשראי, ביט, Apple Pay או Google Pay — הכל דרך האפליקציה, מאובטח וללא צורך במזומן." },
    { q: "האם האפליקציה עובדת גם באייפון?", a: "כן — גם באייפון וגם באנדרואיד. נעדכן אתכם עם הוראות התקנה קצרות שמתאימות למכשיר שלכם." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="max-w-[820px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider" style={{ color: BRAND }}>שאלות ותשובות</div>
          <h2 className="mt-2 text-[28px] sm:text-[38px] font-black leading-[1.1]">כל מה שרציתם לדעת</h2>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between text-right p-4 sm:p-5 hover:bg-black/[0.02]"
              >
                <span className="text-[15px] sm:text-[16px] font-bold">{it.q}</span>
                <ChevronDown className={`size-5 shrink-0 transition ${open === i ? "rotate-180" : ""}`} style={{ color: BRAND }} />
              </button>
              {open === i && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-[14px] sm:text-[15px] text-black/70 leading-[1.75]">
                  {it.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
function FinalCTA() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-[820px] mx-auto px-4 sm:px-5 lg:px-10 text-center">
        <h2 className="text-[30px] sm:text-[42px] font-black leading-[1.1] tracking-[-0.02em]">
          מוכנים להזמין את השליח הראשון?
        </h2>
        <p className="mt-4 text-[16px] sm:text-[18px] text-black/60 leading-[1.6]">
          התקינו את Goi עכשיו ותוך דקות אתם מזמינים משלוח או הובלה.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#install"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full text-white font-bold text-[15.5px] shadow-xl"
            style={{ background: BRAND }}
          >
            <Download className="size-5" />
            התקינו עכשיו
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
const WA_GREEN = "#128C7E";

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
          <Link
            to="/join"
            className="group inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full font-bold text-[13.5px] shadow-[0_12px_28px_-12px_rgba(18,140,126,0.6)] hover:scale-[1.03] active:scale-[0.98] transition shrink-0 w-full sm:w-auto"
            style={{ background: WA_GREEN, color: "white" }}
          >
            <MessageCircle className="w-4 h-4" />
            הצטרף אלינו
          </Link>
        </div>
      </div>

      {/* Guest order link */}
      <GuestOrderLinkStrip />



      {/* Main footer */}
      <div className="relative max-w-[1240px] mx-auto px-5 lg:px-10 py-10 lg:py-16 grid md:grid-cols-12 gap-8 md:gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <GoiLogoBadge size={32} />
            <span
              className="text-[24px] tracking-[-0.02em] text-white font-extrabold"
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
              <MessageCircle size={15} className="text-white" />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="טלפון"
            >
              <Phone size={15} className="text-white" />
            </a>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          <FooterCol
            title="לקוחות פרטיים"
            links={[
              ["אפליקציית הלקוחות", "/"],
              ["איך זה עובד", "#how"],
              ["שירותים", "#services"],
              ["שאלות נפוצות", "#faq"],
            ]}
          />
          <FooterCol
            title="החברה"
            links={[
              ["בלוג", "/blog"],
              ["צור קשר", "#"],
              ["מדיניות פרטיות", "#"],
            ]}
          />
          <FooterCol
            title="שותפים"
            links={[
              ["אזור לקוחות פרטיים", "/customer-login"],
              ["שליח או מוביל?", "/couriers"],
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

function GuestOrderLinkStrip() {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const link = `${origin}/customer/new-order?guest=1`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const waText = encodeURIComponent(
    `היי! אפשר להזמין אצלנו הובלה בלי הרשמה — פשוט נכנסים ללינק וממלאים פרטים:\n${link}`,
  );

  return (
    <div className="relative border-b border-white/10">
      <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-6 lg:py-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 text-right w-full lg:w-auto">
          <div
            className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl shrink-0"
            style={{ background: `${WA_GREEN}20`, border: `1px solid ${WA_GREEN}55` }}
          >
            <LinkIcon size={19} color={WA_GREEN} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14.5px] sm:text-[16px] lg:text-[18px] tracking-tight text-white leading-tight">
              הזמנה כאורח — לינק ישיר ללקוח
            </div>
            <div className="text-[12px] sm:text-[12.5px] lg:text-[13px] text-white/60 mt-0.5 leading-snug">
              שלחו ללקוח לינק להזמנה בלי הרשמה. אותו לינק עובד לכל הזמנה, עכשיו או בעתיד.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <div
            className="flex-1 lg:flex-none min-w-0 lg:max-w-[320px] h-11 px-3.5 rounded-full flex items-center bg-white/5 border border-white/10 text-[12.5px] text-white/70 font-mono truncate"
            dir="ltr"
            title={link}
          >
            <span className="truncate">{link}</span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full font-bold text-[13.5px] shadow-[0_12px_28px_-12px_rgba(18,140,126,0.6)] hover:scale-[1.03] active:scale-[0.98] transition shrink-0"
            style={{ background: copied ? "#0f766e" : WA_GREEN, color: "white" }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "הלינק הועתק" : "העתק לינק"}
          </button>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full font-bold text-[13.5px] bg-white/5 border border-white/15 text-white hover:bg-white/10 transition shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            שלח בוואטסאפ
          </a>
        </div>
      </div>
    </div>
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
