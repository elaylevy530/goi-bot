import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import { POSTS } from "@/lib/blog-posts";

const GREEN = "#128C7E";
const SITE_URL = "https://goi-bot.lovable.app";

const CATEGORIES = ["הכל", "הובלות", "משלוחים", "עסקים", "מחירים", "טיפים"];

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "בלוג Goi — טיפים ומדריכים למשלוחים והובלות בישראל 2026" },
      {
        name: "description",
        content:
          "מדריכים מקצועיים, טיפים והשוואות מחירים למשלוחים, הובלות דירה, שליחויות דחופות ועסקים בישראל. כל מה שצריך לדעת לפני שמזמינים.",
      },
      { property: "og:title", content: "בלוג Goi — כל מה שצריך לדעת על משלוחים והובלות" },
      { property: "og:description", content: "מדריכים, טיפים והשוואות מחירים בעולם המשלוחים וההובלות בישראל." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/blog` },
      { property: "og:image", content: `${SITE_URL}${POSTS[0].image}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE_URL}${POSTS[0].image}` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "בלוג Goi",
          description: "מדריכים מקצועיים למשלוחים והובלות בישראל",
          url: `${SITE_URL}/blog`,
          publisher: { "@type": "Organization", name: "Goi", url: SITE_URL },
          inLanguage: "he-IL",
          blogPost: POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.metaDescription,
            url: `${SITE_URL}/blog/${p.slug}`,
            datePublished: p.date,
            author: { "@type": "Organization", name: p.author },
          })),
        }),
      },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-[#0d0d0d]" style={{ fontFamily: "'Heebo', system-ui, sans-serif" }}>
      <Header />
      <Hero />
      <Categories />
      <PostGrid />
      <Newsletter />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/5">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black" style={{ fontFamily: "var(--font-wordmark)" }}>
          Go<span style={{ color: GREEN }}>i</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-black/70 font-medium">
          <Link to="/">בית</Link>
          <Link to="/couriers">לשליחים</Link>
          <Link to="/for-business">לעסקים</Link>
        </nav>
        <Link to="/" className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-white font-bold text-sm shadow-lg" style={{ background: GREEN }}>
          התחילו הזמנה
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(70% 60% at 50% 0%, rgba(37,211,102,0.10), transparent 60%)" }} />
      <div className="mx-auto max-w-4xl px-5 lg:px-10 py-16 lg:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-6">
          <Tag className="w-3.5 h-3.5" /> בלוג Goi
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-[0.98] tracking-tight">
          מדריכים, טיפים, ו<span style={{ color: GREEN }}>שקיפות מלאה</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-black/70 max-w-2xl mx-auto">
          כל מה שצריך לדעת על משלוחים, הובלות ושליחויות בישראל. מחקרים, השוואות מחירים, וטיפים ממובילים ותיקים.
        </p>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <div className="border-y border-black/5 bg-[#F9FAF8]">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 py-4 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c, i) => (
          <button
            key={c}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              i === 0
                ? "text-white shadow-md"
                : "bg-white border border-black/10 hover:border-emerald-500 text-black/70"
            }`}
            style={i === 0 ? { background: GREEN } : {}}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function PostGrid() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((p, i) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className={`group bg-white rounded-3xl border border-black/5 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all ${
                i === 0 ? "md:col-span-2 lg:col-span-2 lg:row-span-2" : ""
              }`}
            >
              <div
                className={`${i === 0 ? "aspect-[16/10]" : "aspect-[16/9]"} relative overflow-hidden bg-black/5`}
              >
                <img
                  src={p.image}
                  alt={p.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, hsl(${p.cover.hue} 60% 25% / 0.45), hsl(${p.cover.hue} 70% 40% / 0.15))`,
                  }}
                />
                <div className="absolute top-4 right-4">
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white text-black/80">
                    {p.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-black/50 mb-3">
                  <time dateTime={p.date}>{p.dateHebrew}</time>
                  <span className="w-1 h-1 rounded-full bg-black/30" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {p.readTime}
                  </span>
                </div>
                <h2 className={`font-black leading-tight mb-3 ${i === 0 ? "text-3xl" : "text-xl"}`}>
                  {p.title}
                </h2>
                <p className="text-sm text-black/60 leading-relaxed line-clamp-3">{p.excerpt}</p>
                <div
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all"
                  style={{ color: GREEN }}
                >
                  קראו עוד <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="py-16 bg-[#0d0d0d] text-white">
      <div className="mx-auto max-w-3xl px-5 lg:px-10 text-center">
        <h2 className="text-3xl md:text-4xl font-black">מדריכים חדשים ישר למייל</h2>
        <p className="mt-3 text-white/60">פעם בשבוע — טיפ קצר, השוואת מחירים, או מדריך מקצועי. בלי ספאם.</p>
        <form className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="האימייל שלך"
            className="flex-1 h-12 px-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-emerald-400"
          />
          <button type="submit" className="h-12 px-6 rounded-full text-white font-bold shadow-lg" style={{ background: GREEN }}>
            הרשמו
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5 py-8">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-black/50">
        <span className="text-2xl font-black" style={{ fontFamily: "var(--font-wordmark)" }}>
          Go<span style={{ color: GREEN }}>i</span>
        </span>
        <div className="flex flex-wrap gap-6">
          <Link to="/">בית</Link>
          <Link to="/couriers">לשליחים</Link>
          <Link to="/for-business">לעסקים</Link>
        </div>
        <div>© {new Date().getFullYear()} Goi</div>
      </div>
    </footer>
  );
}
