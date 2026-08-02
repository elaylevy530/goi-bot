import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike, Car, Truck, Wallet, Clock, MapPin, ShieldCheck,
  MessageCircle, Zap, TrendingUp, Check, ArrowLeft, Star,
} from "lucide-react";

const SITE_URL = "https://goi-bot.lovable.app";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "שליחים ומובילים — הצטרפו ל־Goi" },
      { name: "description", content: "עבודה גמישה לשליחים ומובילים פרטיים. בלי מנהל, בלי משמרות קבועות — עבודות מגיעות ישר לוואטסאפ, אתה בוחר, אתה מרוויח." },
      { property: "og:title", content: "שליחים ומובילים — הצטרפו ל־Goi" },
      { property: "og:description", content: "עבודות מגיעות ישר לוואטסאפ. בלי מנהל. אתה בוחר, אתה מרוויח." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/drivers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/drivers" }],
  }),
  component: DriversPage,
});


const INK = "#1a1a1a";
const CANVAS = "#F7F6F2";
const WA_GREEN = "#25D366";

function DriversPage() {
  return (
    <div style={{ background: CANVAS, color: INK }} className="min-h-screen">
      <Nav />
      <Hero />
      <Perks />
      <HowItWorks />
      <WhoFits />
      <Earnings />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ============ NAV ============ */
function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[rgba(247,246,242,0.75)] border-b border-black/[0.06]">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between px-5 lg:px-10 h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: INK }}>
            <span className="text-white font-black text-[13px]">G</span>
          </div>
          <span className="font-black text-[20px] tracking-tight">Goi</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px] text-black/65">
          <Link to="/" className="hover:text-black transition">ללקוחות</Link>
          <a href="#how" className="hover:text-black transition">איך זה עובד</a>
          <a href="#earnings" className="hover:text-black transition">כמה מרוויחים</a>
          <a href="#faq" className="hover:text-black transition">שאלות</a>
        </nav>
        <Link
          to="/join"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-white font-semibold text-[13.5px] transition hover:opacity-90"
          style={{ background: WA_GREEN }}
        >
          הרשמה מהירה
          <ArrowLeft size={15} />
        </Link>
      </div>
    </header>
  );
}

/* ============ HERO ============ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 85% 0%, rgba(37,211,102,0.12), transparent 55%), radial-gradient(90% 70% at 10% 30%, rgba(15,157,88,0.08), transparent 60%)" }} />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 pt-10 sm:pt-14 lg:pt-20 pb-16 sm:pb-20 lg:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 pl-1 pr-3 h-9 rounded-full bg-white border border-black/[0.08] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)] text-[12.5px] text-black/75">
            <span className="h-7 w-7 rounded-full grid place-items-center" style={{ background: `${WA_GREEN}18` }}>
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: WA_GREEN, opacity: 0.7 }} />
                <span className="relative w-2 h-2 rounded-full" style={{ background: WA_GREEN }} />
              </span>
            </span>
            <span className="font-semibold">847 שליחים ומובילים כבר איתנו</span>
          </div>

          <h1 className="mt-6 sm:mt-7 text-[40px] leading-[0.98] sm:text-[60px] lg:text-[78px] font-black tracking-[-0.035em]">
            יש לך רכב?<br />
            <span className="relative inline-block">
              יש לך עבודה.
              <svg className="absolute -bottom-2 right-0 w-full" height="14" viewBox="0 0 300 14" preserveAspectRatio="none" fill="none" aria-hidden>
                <path d="M2 9 C 80 2, 220 2, 298 8" stroke={WA_GREEN} strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mt-6 sm:mt-7 text-[15.5px] sm:text-[17px] lg:text-[19px] text-black/60 max-w-[540px] leading-[1.65]">
            עבודות מגיעות ישר לוואטסאפ שלך. בלי מנהל, בלי משמרות, בלי אפליקציה.
            אתה בוחר מה מתאים, כותב "בא לי" — וזה שלך. פשוט ככה.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link
              to="/join"
              className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full text-white font-bold text-[15.5px] shadow-[0_10px_30px_-6px_rgba(37,211,102,0.5)] hover:opacity-90 transition"
              style={{ background: WA_GREEN }}
            >
              <MessageCircle size={18} />
              הרשמה — 2 דקות
              <ArrowLeft size={16} />
            </Link>
            <a href="#how" className="inline-flex items-center justify-center gap-1 h-14 px-5 rounded-full font-semibold text-[14px] text-black/70 hover:text-black transition">
              איך זה עובד?
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-black/60">
            <span className="flex items-center gap-1.5"><Check size={13} color={WA_GREEN} strokeWidth={3.5}/> תשלום בסוף היום</span>
            <span className="flex items-center gap-1.5"><Check size={13} color={WA_GREEN} strokeWidth={3.5}/> בלי דמי מנוי</span>
            <span className="flex items-center gap-1.5"><Check size={13} color={WA_GREEN} strokeWidth={3.5}/> אתה קובע מתי</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10" style={{ background: "radial-gradient(60% 55% at 50% 45%, rgba(37,211,102,0.18), transparent 70%)" }} />
          <VehicleShowcase />
        </div>
      </div>
    </section>
  );
}

function VehicleShowcase() {
  const items = [
    { icon: Bike, label: "קטנוע / אופניים חשמליים", earn: "עד ₪180 לשעה", tag: "משלוחים בעיר" },
    { icon: Car, label: "רכב פרטי", earn: "עד ₪250 לשעה", tag: "חבילות + הובלות קטנות" },
    { icon: Truck, label: "טנדר / משאית", earn: "עד ₪450 לשעה", tag: "הובלות דירה + עסקים" },
  ];
  return (
    <div className="grid gap-3 sm:gap-4">
      {items.map((it, i) => (
        <div key={i} className="group bg-white rounded-2xl border border-black/[0.08] p-4 sm:p-5 flex items-center gap-4 hover:border-black/[0.15] transition shadow-[0_10px_30px_-15px_rgba(0,0,0,0.15)]">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl grid place-items-center shrink-0" style={{ background: `${WA_GREEN}18` }}>
            <it.icon size={26} color={WA_GREEN} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-black/50">{it.tag}</div>
            <div className="font-black text-[15px] sm:text-[17px] truncate">{it.label}</div>
            <div className="text-[13px] text-black/60 mt-0.5">{it.earn}</div>
          </div>
          <ArrowLeft size={18} className="text-black/30 group-hover:text-black/60 transition shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ============ PERKS ============ */
function Perks() {
  const perks = [
    { icon: MessageCircle, title: "הכל בוואטסאפ", desc: "עבודות, מחירים, ניווט, תשלום — הכל בצ׳אט אחד. בלי אפליקציה נוספת בטלפון." },
    { icon: Clock, title: "אתה קובע מתי", desc: "עובד רק כשמתאים לך. שעה ביום, יום בשבוע — אין מינימום, אין התחייבות." },
    { icon: Wallet, title: "כסף בסוף היום", desc: "מקבל תשלום ישירות לחשבון. בלי לחכות לסוף חודש, בלי בירוקרטיה." },
    { icon: MapPin, title: "עבודות באזור שלך", desc: "בוחר איפה אתה עובד. לא נשלח לצד השני של הארץ." },
    { icon: ShieldCheck, title: "לקוחות מאומתים", desc: "כל הזמנה עוברת אישור ותשלום מראש. אתה מגיע, מוסר, מקבל." },
    { icon: TrendingUp, title: "טיפים ישר אליך", desc: "לקוח מרוצה? הוא נותן טיפ בצ׳אט — הכסף הולך 100% אליך." },
  ];
  return (
    <section className="py-20 lg:py-28 bg-white border-y border-black/[0.06]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="max-w-[720px]">
          <div className="inline-flex h-8 items-center px-3 rounded-full bg-black/5 text-[12px] font-semibold text-black/70">למה שליחים אוהבים את Goi</div>
          <h2 className="mt-4 text-[32px] sm:text-[44px] lg:text-[56px] font-black tracking-[-0.03em] leading-[1.02]">
            כמו לעבוד לבד — רק בלי הכאב ראש של למצוא לקוחות.
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {perks.map((p, i) => (
            <div key={i} className="p-6 rounded-2xl border border-black/[0.08] bg-white hover:border-black/[0.15] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)] transition">
              <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: `${WA_GREEN}18` }}>
                <p.icon size={20} color={WA_GREEN} />
              </div>
              <div className="mt-4 font-black text-[17px]">{p.title}</div>
              <div className="mt-1.5 text-[14px] text-black/60 leading-[1.6]">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ HOW IT WORKS ============ */
function HowItWorks() {
  const steps = [
    { n: 1, title: "נרשמים ב־2 דקות", desc: "טופס קצר: שם, טלפון, רכב, אזור. שולחים ומחכים לאישור." },
    { n: 2, title: "מקבלים אישור", desc: "בודקים אותך, מוודאים שהכל תקין, ומחברים אותך לבוט." },
    { n: 3, title: "עבודות בוואטסאפ", desc: "מגיעה עבודה שמתאימה לך — אזור, סוג, מחיר. אתה מחליט." },
    { n: 4, title: "עושים, מרוויחים", desc: "לוקח, נוסע, מוסר. הכסף נכנס. עובר לעבודה הבאה." },
  ];
  return (
    <section id="how" className="py-20 lg:py-28">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="max-w-[720px]">
          <div className="inline-flex h-8 items-center px-3 rounded-full bg-black/5 text-[12px] font-semibold text-black/70">איך מתחילים</div>
          <h2 className="mt-4 text-[32px] sm:text-[44px] lg:text-[56px] font-black tracking-[-0.03em] leading-[1.02]">
            מהרישום לעבודה הראשונה — פחות מ־24 שעות.
          </h2>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((s) => (
            <div key={s.n} className="relative p-6 rounded-2xl bg-white border border-black/[0.08]">
              <div className="absolute -top-4 right-6 w-10 h-10 rounded-full grid place-items-center text-white font-black text-[15px] shadow-lg" style={{ background: INK }}>
                {s.n}
              </div>
              <div className="mt-3 font-black text-[17px]">{s.title}</div>
              <div className="mt-2 text-[14px] text-black/60 leading-[1.6]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ WHO FITS ============ */
function WhoFits() {
  const fits = [
    "יש לך רכב, אופנוע, קטנוע או אופניים חשמליים",
    "אתה זמין לפחות כמה שעות בשבוע",
    "יודע להשתמש בוואטסאפ ובוויז",
    "רוצה לעבוד בלי מנהל שנושם לך בעורף",
  ];
  const movers = [
    "יש לך טנדר / משאית קטנה / רכב עם עגלה",
    "עשית הובלות בעבר (או שאתה בכושר)",
    "מוכן לעבוד עם עוזר או לבד",
    "רוצה עבודות באזור שלך בלי לרדוף אחרי לקוחות",
  ];
  return (
    <section className="py-20 lg:py-28 bg-white border-y border-black/[0.06]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 grid lg:grid-cols-2 gap-6 lg:gap-10">
        <div className="p-7 sm:p-9 rounded-3xl border border-black/[0.08] bg-gradient-to-br from-white to-black/[0.02]">
          <div className="w-14 h-14 rounded-2xl grid place-items-center" style={{ background: `${WA_GREEN}18` }}>
            <Bike size={26} color={WA_GREEN} />
          </div>
          <h3 className="mt-5 text-[26px] sm:text-[32px] font-black tracking-[-0.02em]">שליחים</h3>
          <p className="mt-2 text-[14.5px] text-black/60">משלוחים, חבילות, אוכל, מסמכים — כל מה שנכנס לתא של אופנוע או רכב.</p>
          <ul className="mt-6 space-y-3">
            {fits.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px]">
                <Check size={18} color={WA_GREEN} strokeWidth={3} className="mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-7 sm:p-9 rounded-3xl border border-black/[0.08] bg-gradient-to-br from-white to-black/[0.02]">
          <div className="w-14 h-14 rounded-2xl grid place-items-center" style={{ background: `${WA_GREEN}18` }}>
            <Truck size={26} color={WA_GREEN} />
          </div>
          <h3 className="mt-5 text-[26px] sm:text-[32px] font-black tracking-[-0.02em]">מובילים</h3>
          <p className="mt-2 text-[14.5px] text-black/60">הובלות דירות, פריטים גדולים, פינויים, משרדים — הכל בטווח המחירים שלך.</p>
          <ul className="mt-6 space-y-3">
            {movers.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px]">
                <Check size={18} color={WA_GREEN} strokeWidth={3} className="mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ============ EARNINGS ============ */
function Earnings() {
  const tiers = [
    { vehicle: "קטנוע / חשמלי", hours: "שעה ממוצעת", low: "₪90", high: "₪180", note: "משלוחים בעיר, אוכל, חבילות קטנות" },
    { vehicle: "רכב פרטי", hours: "שעה ממוצעת", low: "₪120", high: "₪250", note: "מסמכים, חבילות בינוניות, הובלות זריזות" },
    { vehicle: "טנדר / משאית", hours: "עבודה ממוצעת", low: "₪350", high: "₪1,200", note: "הובלות דירה, ריהוט, פינויים" },
  ];
  return (
    <section id="earnings" className="py-20 lg:py-28">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="max-w-[720px]">
          <div className="inline-flex h-8 items-center px-3 rounded-full bg-black/5 text-[12px] font-semibold text-black/70">כמה מרוויחים</div>
          <h2 className="mt-4 text-[32px] sm:text-[44px] lg:text-[56px] font-black tracking-[-0.03em] leading-[1.02]">
            אין תקרה. יש רק כמה שאתה עובד.
          </h2>
          <p className="mt-4 text-[15px] sm:text-[17px] text-black/60 leading-[1.6]">
            הנתונים למטה הם ממוצעים אמיתיים של שליחים ומובילים ברשת שלנו, לפי סוג רכב וסוג עבודה.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-4 sm:gap-5">
          {tiers.map((t, i) => (
            <div key={i} className="p-6 sm:p-7 rounded-2xl bg-white border border-black/[0.08]">
              <div className="text-[12px] font-semibold text-black/50">{t.hours}</div>
              <div className="mt-1 font-black text-[19px]">{t.vehicle}</div>
              <div className="mt-5 flex items-end gap-1.5">
                <div className="text-[13px] text-black/50 pb-2">₪</div>
                <div className="text-[42px] sm:text-[52px] font-black leading-none tracking-[-0.03em]">{t.low.replace("₪","")}</div>
                <div className="text-[15px] text-black/40 pb-2">–</div>
                <div className="text-[42px] sm:text-[52px] font-black leading-none tracking-[-0.03em]" style={{ color: WA_GREEN }}>{t.high.replace("₪","")}</div>
              </div>
              <div className="mt-4 text-[13.5px] text-black/60 leading-[1.55]">{t.note}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3 p-5 rounded-2xl bg-black/[0.03] border border-black/[0.05] text-[13.5px] text-black/65">
          <Zap size={18} color={WA_GREEN} className="shrink-0" />
          <span><b>שווה לדעת:</b> Goi גובה עמלה קטנה על כל עבודה. אין דמי מנוי, אין דמי הרשמה, ולא לוקחים מהטיפים שלך.</span>
        </div>
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
function FAQ() {
  const qas = [
    { q: "צריך להתחייב לשעות?", a: "לא. עובד כשמתאים לך. אין מינימום שעות, אין מקסימום." },
    { q: "מתי מקבלים תשלום?", a: "העברה בנקאית ישירה בסוף כל יום עבודה. הכסף אצלך תוך 24 שעות." },
    { q: "יש דמי מנוי או הרשמה?", a: "לא ולא. הרישום חינם, השימוש חינם. משלמים רק עמלה על עבודות שביצעת." },
    { q: "מה עם ביטוח?", a: "אתה עובד עצמאי. אנחנו ממליצים לעשות ביטוח נהג/רכב מתאים — נשמח להפנות אותך למבטח שיודע לעבוד עם שליחים." },
    { q: "צריך רישיון עסק?", a: "לעבודה מזדמנת — לא. אם אתה עובר את התקרה של \"עוסק פטור\", כדאי לפתוח תיק. אנחנו עוזרים בהכוונה." },
    { q: "אני יכול לעבוד גם בפלטפורמות אחרות?", a: "בטח. אנחנו לא בלעדיים. עובד עם מי שאתה רוצה." },
  ];
  return (
    <section id="faq" className="py-20 lg:py-28 bg-white border-y border-black/[0.06]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="max-w-[600px]">
          <div className="inline-flex h-8 items-center px-3 rounded-full bg-black/5 text-[12px] font-semibold text-black/70">שאלות ותשובות</div>
          <h2 className="mt-4 text-[32px] sm:text-[44px] font-black tracking-[-0.03em] leading-[1.02]">
            רגע, עוד שאלה קטנה.
          </h2>
        </div>
        <div className="mt-10 divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {qas.map((qa, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-bold text-[15.5px] sm:text-[17px] pr-4">{qa.q}</span>
                <span className="w-8 h-8 rounded-full grid place-items-center bg-black/5 group-open:bg-black group-open:text-white transition text-[18px] font-black shrink-0">+</span>
              </summary>
              <div className="mt-3 text-[14.5px] text-black/60 leading-[1.7]">{qa.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
function FinalCTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-5 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16 text-center" style={{ background: INK, color: "white" }}>
          <div className="absolute inset-0 opacity-40" aria-hidden style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(37,211,102,0.35), transparent 60%)" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1 mb-5">
              {[0,1,2,3,4].map(i => <Star key={i} size={16} fill="#FFD24C" stroke="none" />)}
            </div>
            <h2 className="text-[32px] sm:text-[46px] lg:text-[58px] font-black tracking-[-0.03em] leading-[1.02]">
              יאללה. בוא נתחיל להרוויח.
            </h2>
            <p className="mt-4 text-[15px] sm:text-[17px] text-white/70 max-w-[520px] mx-auto">
              רישום של 2 דקות. עבודה ראשונה תוך יום. אין התחייבות, אין הפתעות.
            </p>
            <Link
              to="/join"
              className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full font-bold text-[16px] transition hover:opacity-90"
              style={{ background: WA_GREEN, color: "white" }}
            >
              <MessageCircle size={19} />
              להתחיל עכשיו
              <ArrowLeft size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
function Footer() {
  return (
    <footer className="py-10 border-t border-black/[0.06]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-black/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md grid place-items-center" style={{ background: INK }}>
            <span className="text-white font-black text-[10px]">G</span>
          </div>
          <span>© Goi {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/" className="hover:text-black transition">חזרה לדף הראשי</Link>
          <Link to="/join" className="hover:text-black transition">הרשמה</Link>
        </div>
      </div>
    </footer>
  );
}
