import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, Tag, ArrowRight } from "lucide-react";
import { POSTS, getPost, type BlogPost } from "@/lib/blog-posts";

const GREEN = "#128C7E";
const SITE_URL = "https://goi-bot.lovable.app";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "מאמר לא נמצא | Goi" }] };
    const url = `${SITE_URL}/blog/${p.slug}`;
    const imageUrl = `${SITE_URL}${p.image}`;
    return {
      meta: [
        { title: p.metaTitle },
        { name: "description", content: p.metaDescription },
        { name: "keywords", content: p.keywords.join(", ") },
        { name: "author", content: p.author },
        { property: "og:title", content: p.metaTitle },
        { property: "og:description", content: p.metaDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: imageUrl },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "article:published_time", content: p.date },
        { property: "article:author", content: p.author },
        { property: "article:section", content: p.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: p.metaTitle },
        { name: "twitter:description", content: p.metaDescription },
        { name: "twitter:image", content: imageUrl },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: p.metaDescription,
            image: [imageUrl],
            author: { "@type": "Organization", name: p.author },
            publisher: {
              "@type": "Organization",
              name: "Goi",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/pwa-512.png` },
            },
            datePublished: p.date,
            dateModified: p.date,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            inLanguage: "he-IL",
            keywords: p.keywords.join(", "),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "בית", item: SITE_URL + "/" },
              { "@type": "ListItem", position: 2, name: "בלוג", item: SITE_URL + "/blog" },
              { "@type": "ListItem", position: 3, name: p.title, item: url },
            ],
          }),
        },
        ...(p.faq && p.faq.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: p.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },

  component: BlogArticlePage,
});

function BlogArticlePage() {
  const { post } = Route.useLoaderData() as { post: BlogPost };
  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white text-[#0d0d0d]"
      style={{ fontFamily: "'Heebo', system-ui, sans-serif" }}
    >
      <Header />

      <article className="mx-auto max-w-3xl px-5 lg:px-8 py-10 lg:py-16">
        {/* Breadcrumbs */}
        <nav className="text-sm text-black/50 mb-6 flex items-center gap-2" aria-label="ניווט">
          <Link to="/" className="hover:text-black">בית</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-black">בלוג</Link>
          <span>/</span>
          <span className="text-black/80">{post.category}</span>
        </nav>

        {/* Category badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-5">
          <Tag className="w-3 h-3" /> {post.category}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight mb-5">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-black/50 mb-8 pb-8 border-b border-black/10">
          <span>מאת {post.author}</span>
          <span className="w-1 h-1 rounded-full bg-black/30" />
          <time dateTime={post.date}>{post.dateHebrew}</time>
          <span className="w-1 h-1 rounded-full bg-black/30" />
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readTime}
          </span>
        </div>

        {/* Cover */}
        <div className="aspect-[16/9] rounded-3xl mb-10 relative overflow-hidden bg-black/5">
          <img
            src={post.image}
            alt={post.title}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, hsl(${post.cover.hue} 60% 25% / 0.55), hsl(${post.cover.hue} 70% 40% / 0.35))`,
            }}
          />
          <div className="absolute bottom-4 left-4 text-white/80 text-xs font-bold tracking-wider uppercase">
            {post.category}
          </div>
        </div>


        {/* Body */}
        <div className="prose-hebrew">
          {post.sections.map((s, i) => (
            <section key={i} className="mb-8">
              {s.heading && (
                <h2 className="text-2xl md:text-3xl font-black mt-10 mb-4 leading-tight">
                  {s.heading}
                </h2>
              )}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="text-[17px] leading-[1.85] text-black/80 mb-4">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="space-y-2.5 my-5">
                  {s.list.map((item, j) => (
                    <li key={j} className="text-[17px] leading-relaxed text-black/80 flex gap-3">
                      <span
                        className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: GREEN }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.quote && (
                <blockquote
                  className="border-r-4 pr-5 my-6 text-xl italic text-black/70"
                  style={{ borderColor: GREEN }}
                >
                  {s.quote}
                </blockquote>
              )}
            </section>
          ))}
        </div>

        {/* FAQ */}
        {post.faq && post.faq.length > 0 && (
          <section className="mt-14 pt-10 border-t border-black/10">
            <h2 className="text-3xl font-black mb-6">שאלות נפוצות</h2>
            <div className="space-y-4">
              {post.faq.map((f, i) => (
                <details
                  key={i}
                  className="bg-[#F9FAF8] rounded-2xl p-5 border border-black/5"
                >
                  <summary className="font-bold cursor-pointer text-lg">{f.q}</summary>
                  <p className="mt-3 text-black/70 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Keywords */}
        <section className="mt-14 pt-8 border-t border-black/10">
          <h3 className="text-sm font-bold text-black/50 mb-3">תגיות</h3>
          <div className="flex flex-wrap gap-2">
            {post.keywords.map((k) => (
              <span
                key={k}
                className="px-3 py-1.5 rounded-full text-sm bg-[#F9FAF8] border border-black/10 text-black/70"
              >
                {k}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="mt-14 rounded-3xl p-8 md:p-10 text-center"
          style={{
            background: `linear-gradient(135deg, ${GREEN}, hsl(155 55% 30%))`,
          }}
        >
          <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
            צריכים משלוח או הובלה עכשיו?
          </h3>
          <p className="text-white/85 mb-6">
            פותחים שיחה עם הבוט של Goi בוואטסאפ ומקבלים תוך דקות מספר הצעות משליחים ומובילים מאומתים.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-white text-emerald-700 font-bold shadow-xl hover:scale-[1.03] transition"
          >
            התחילו שיחה בוואטסאפ <ArrowLeft className="w-4 h-4" />
          </Link>
        </section>
      </article>

      {/* Related */}
      <section className="border-t border-black/10 py-16 bg-[#F9FAF8]">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <h2 className="text-3xl font-black mb-8">מאמרים נוספים</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/blog/$slug"
                params={{ slug: r.slug }}
                className="group bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="aspect-[16/9] relative overflow-hidden bg-black/5">
                  <img
                    src={r.image}
                    alt={r.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, hsl(${r.cover.hue} 60% 25% / 0.45), hsl(${r.cover.hue} 70% 40% / 0.25))`,
                    }}
                  />
                </div>

                <div className="p-5">
                  <div className="text-xs text-emerald-700 font-bold mb-2">{r.category}</div>
                  <h3 className="font-bold text-base leading-snug mb-2 line-clamp-2">
                    {r.title}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-bold"
                    style={{ color: GREEN }}
                  >
                    קראו עוד <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full border-2 border-black/10 font-bold hover:border-emerald-500 transition"
            >
              <ArrowRight className="w-4 h-4" /> כל המאמרים
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-black/5">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black" style={{ fontFamily: "var(--font-wordmark)" }}>
          Go<span style={{ color: GREEN }}>i</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-black/70 font-medium">
          <Link to="/">בית</Link>
          <Link to="/blog">בלוג</Link>
          <Link to="/couriers">לשליחים</Link>
          <Link to="/for-business">לעסקים</Link>
        </nav>
        <Link
          to="/"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-white font-bold text-sm shadow-lg"
          style={{ background: GREEN }}
        >
          התחילו הזמנה
        </Link>
      </div>
    </header>
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
          <Link to="/blog">בלוג</Link>
        </div>
        <div>© {new Date().getFullYear()} Goi</div>
      </div>
    </footer>
  );
}
