import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { 
  ArrowLeft, Zap, ShieldCheck, Check, Phone, 
  MapPin, Building, Smartphone, Map, Truck, Users, Package, ChevronDown
} from "lucide-react";
import corpHeroMovers from "@/assets/corp-hero-movers.jpg";
import corpCourier from "@/assets/corp-courier.jpg";
import corpBusiness from "@/assets/corp-business.jpg";
import corpFleet from "@/assets/corp-fleet.jpg";

export const Route = createFileRoute("/")({
  component: GoiCorporateLanding,
});

const BRAND = "#55D92B";
const BRAND_DARK = "#173F14";
const INK = "#050505";
const CANVAS = "#F7F7F7";

function GoiLogo({ color = "white" }: { color?: "white" | "black" }) {
  return (
    <div className="flex items-center gap-[2px]">
      <span className={`text-[28px] font-black tracking-tight ${color === "white" ? "text-white" : "text-black"}`}>GO</span>
      <div className="relative">
        <span className={`text-[28px] font-black tracking-tight ${color === "white" ? "text-white" : "text-black"}`}>i</span>
        <div className="absolute -top-1 -right-1.5 size-2.5 rounded-full" style={{ background: BRAND }} />
      </div>
    </div>
  );
}

export function GoiCorporateLanding() {
  return (
    <div className="min-h-screen w-full" style={{ fontFamily: "'Heebo', sans-serif", background: CANVAS, color: INK }}>
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <GoiLogo color="black" />
          <nav className="hidden lg:flex items-center gap-8 font-bold text-[15px]">
            {["מי אנחנו", "הפתרון שלנו", "למי זה מתאים?", "איך זה עובד?", "טכנולוגיה", "משאבים"].map(i => (
              <a key={i} href={`#${i}`} className="hover:text-[var(--brand)] transition">{i}</a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-[15px] font-bold">להצטרפות כשותף</button>
            <button className="h-12 px-6 rounded-full text-white font-bold" style={{ background: INK }}>בחירת הקהל שלכם</button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-6" style={{ background: INK, color: "white" }}>
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10">
              <span className="text-[12px] uppercase tracking-widest text-[var(--brand)]">LOGISTICS OS</span>
            </motion.div>
            <h1 className="text-[64px] font-black leading-[1.1] tracking-tight">
              GOI מחברת את עולם המשלוחים, ההובלות והלוגיסטיקה <span style={{ color: BRAND }}>בפלטפורמה אחת חכמה</span>
            </h1>
            <p className="text-[20px] text-white/70 leading-relaxed max-w-[500px]">
              טכנולוגיה שמחברת בזמן אמת בין לקוחות פרטיים, עסקים, שליחים ומובילים, ומנהלת את כל התהליך בצורה פשוטה ושקופה.
            </p>
            <div className="flex items-center gap-4">
              <button className="h-14 px-8 rounded-full bg-[var(--brand)] text-black font-bold text-[18px]">בחרו את הקהל שלכם</button>
              <button className="h-14 px-8 rounded-full border border-white/20 font-bold text-[18px]">הכירו את הפלטפורמה</button>
            </div>
          </div>
          <div className="relative">
             <img src={corpHeroMovers} className="rounded-3xl shadow-2xl" alt="Movers" />
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <div className="max-w-[1200px] mx-auto -mt-16 px-6 relative z-20">
         <div className="grid md:grid-cols-4 gap-6 p-8 rounded-3xl bg-white shadow-xl shadow-black/5 border border-black/5">
            {[ {icon: Zap, t: "מערכת אחת לכל התהליך"}, {icon: Smartphone, t: "התאמה חכמה בזמן אמת"}, {icon: Check, t: "חוויית שימוש פשוטה"}, {icon: ShieldCheck, t: "אמינות, שקיפות ובקרה"} ].map(i => (
              <div key={i.t} className="flex flex-col gap-2 items-center text-center">
                <i.icon className="text-[var(--brand)]" size={32} />
                <div className="font-bold">{i.t}</div>
              </div>
            ))}
         </div>
      </div>

      <section className="py-24 px-6 max-w-[1200px] mx-auto text-center space-y-6">
        <h2 className="text-[48px] font-black">מי אנחנו ומה GOI עושה?</h2>
        <p className="max-w-[700px] mx-auto text-[18px] text-gray-600">
          GOI היא פלטפורמה טכנולוגית שמחברת בין ביקוש לשירותי משלוחים והובלות לבין אלפי ספקים עצמאיים, ומספקת לכל צד כלים חכמים לניהול, התאמה, תמחור, ביצוע ומעקב.
        </p>
      </section>

      <section className="py-12 px-6 max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { title: "לקוחות פרטיים", desc: "משלוחים, איסופים והובלות בדרך פשוטה" },
            { title: "עסקים", desc: "ניהול לוגיסטיקה עסקית במקום אחד" },
            { title: "שליחים", desc: "עבודות באזור שלכם בזמן שלכם" },
            { title: "מובילים", desc: "ניהול משימות והצעות עבודה חכמות" }
          ].map(i => (
            <div key={i.title} className="p-8 rounded-3xl border border-black/5 bg-white hover:shadow-lg transition">
              <h3 className="text-[28px] font-bold">{i.title}</h3>
              <p className="text-[17px] text-gray-600 mt-2">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <TechSection />
      <SolutionsSection />
      <WhyGoi />
      <StatsSection />
      <HowItWorks />
      <EcoSystem />
      <CentralCTA />
      <ContactForm />
      <footer className="py-12 bg-black text-white/50 text-center text-[14px]">© GOI כל הזכויות שמורות</footer>
    </div>
  );
}

function TechSection() { return <section className="py-24 bg-gray-100 text-center"><h2 className="text-[48px] font-black">הטכנולוגיה שמאחורי כל משימה</h2></section>; }
function SolutionsSection() { return <section className="py-24 text-center"><h2 className="text-[48px] font-black">מה כל קהל מקבל עם GOI?</h2></section>; }
function WhyGoi() { return <section className="py-24 bg-black text-white text-center"><h2 className="text-[48px] font-black">למה GOI?</h2></section>; }
function StatsSection() { return <section className="py-24 text-center"><h2 className="text-[48px] font-black">נתונים ומספרים</h2></section>; }
function HowItWorks() { return <section className="py-24 text-center"><h2 className="text-[48px] font-black">איך זה עובד?</h2></section>; }
function EcoSystem() { return <section className="py-24 text-center"><h2 className="text-[48px] font-black">אקו-סיסטם אחד</h2></section>; }
function CentralCTA() { return <section className="py-24 bg-black text-white text-center"><h2 className="text-[48px] font-black">העתיד של המשלוחים</h2></section>; }
function ContactForm() { return <section className="py-24 bg-gray-50 text-center"><h2 className="text-[48px] font-black">צור קשר</h2></section>; }

