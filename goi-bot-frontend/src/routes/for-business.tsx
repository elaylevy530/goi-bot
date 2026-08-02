import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, UtensilsCrossed, Store, Flower2, Package, Sparkles, ArrowLeft, Mail } from "lucide-react";

const GREEN = "#128C7E";
const WA_GREEN = "#25D366";

const SITE_URL = "https://goi-bot.lovable.app";

export const Route = createFileRoute("/for-business")({
  head: () => ({
    meta: [
      { title: "Goi לעסקים — בקרוב | פתרון משלוחים לעסקים" },
      {
        name: "description",
        content:
          "שירות Goi לעסקים בבנייה — פתרון משלוחים חכם למסעדות, חנויות ועסקים קטנים. השאירו פרטים ונעדכן כשהשירות יושק.",
      },
      { property: "og:title", content: "Goi לעסקים — בקרוב" },
      { property: "og:description", content: "אנחנו בונים את השירות המושלם לעסקים. הצטרפו לרשימת ההמתנה." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/for-business" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/for-business" }],
  }),
  component: ForBusinessPage,
});


function ForBusinessPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white text-[#0d0d0d] flex flex-col"
      style={{ fontFamily: "'Heebo', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black" style={{ fontFamily: "var(--font-wordmark)" }}>
            Go<span style={{ color: GREEN }}>i</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/70 hover:text-black transition-colors"
          >
            חזרה לדף הבית
            <ArrowLeft size={16} />
          </Link>
        </div>
      </header>

      {/* Hero coming soon */}
      <main className="flex-1 flex items-center justify-center px-5 py-16 lg:py-24">
        <div className="max-w-2xl w-full text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold mb-8 border"
            style={{ background: `${WA_GREEN}12`, borderColor: `${WA_GREEN}40`, color: GREEN }}
          >
            <Sparkles size={14} />
            בקרוב
          </div>

          {/* Icon cluster */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <IconTile icon={<UtensilsCrossed size={22} />} />
            <IconTile icon={<Store size={22} />} highlight />
            <IconTile icon={<Building2 size={26} />} big />
            <IconTile icon={<Flower2 size={22} />} highlight />
            <IconTile icon={<Package size={22} />} />
          </div>

          <h1 className="text-[32px] lg:text-[44px] font-black leading-[1.15] tracking-tight mb-5">
            אנחנו משיקים בקרוב את{" "}
            <span style={{ color: GREEN }}>Goi לעסקים</span>
          </h1>

          <p className="text-[17px] lg:text-[19px] text-black/65 leading-relaxed mb-3">
            פתרון משלוחים חכם למסעדות, חנויות, פרחים, מזון ועסקים קטנים —
            הזמנה בלחיצה, מעקב חי, וחשבונית חודשית מרוכזת.
          </p>
          <p className="text-[15px] text-black/50 mb-10">
            המערכות עדיין בבנייה. אנחנו עובדים על זה במרץ 💪
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:business@goi.co.il?subject=מעוניין%20לשמוע%20על%20Goi%20לעסקים"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-white text-[15px] font-semibold shadow-lg transition-transform hover:scale-[1.02] w-full sm:w-auto"
              style={{ background: WA_GREEN, boxShadow: `0 8px 24px ${WA_GREEN}55` }}
            >
              <Mail size={17} />
              עדכנו אותי כשהשירות מוכן
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center h-12 px-6 rounded-full text-[15px] font-semibold border border-black/10 hover:bg-black/[0.03] transition-colors w-full sm:w-auto"
            >
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-6 text-center text-[13px] text-black/45 flex flex-col items-center gap-3">
        <div className="flex items-center gap-5 flex-wrap justify-center">
          <Link to="/business-login" className="inline-flex items-center gap-1.5 font-semibold text-black/70 hover:text-black transition-colors">
            כניסת עסקים
            <ArrowLeft size={14} />
          </Link>
          <Link to="/customer-login" className="inline-flex items-center gap-1.5 font-semibold text-black/70 hover:text-black transition-colors">
            כניסה לפרטיים
            <ArrowLeft size={14} />
          </Link>
        </div>
        <div>© {new Date().getFullYear()} Goi · כל הזכויות שמורות</div>
      </footer>
    </div>
  );
}

function IconTile({
  icon,
  big,
  highlight,
}: {
  icon: React.ReactNode;
  big?: boolean;
  highlight?: boolean;
}) {
  const size = big ? "w-16 h-16" : "w-12 h-12";
  return (
    <div
      className={`${size} rounded-2xl flex items-center justify-center border transition-transform`}
      style={{
        background: highlight ? `${WA_GREEN}10` : "#fff",
        borderColor: highlight ? `${WA_GREEN}35` : "rgba(0,0,0,0.08)",
        color: highlight ? GREEN : "#0d0d0d",
        boxShadow: big ? `0 10px 30px ${WA_GREEN}25` : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {icon}
    </div>
  );
}
