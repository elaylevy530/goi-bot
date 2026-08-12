import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { externalApps } from "@/lib/external-apps";

/** Individual blog posts live on `goi-landing`. */
export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "הפניה — בלוג Goi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlogSlugMovedPage,
});

function BlogSlugMovedPage() {
  const { slug } = Route.useParams();
  const target = `${externalApps.landing}/blog/${slug}`;
  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div
      dir="rtl"
      className="min-h-screen grid place-items-center px-4 text-center"
      style={{ background: "#F7F6F2", fontFamily: "'Heebo', system-ui, sans-serif" }}
    >
      <div>
        <p className="text-lg font-bold">המאמר עבר לאתר השיווק</p>
        <a
          href={target}
          className="mt-6 inline-flex h-11 items-center rounded-full px-5 text-white font-semibold"
          style={{ background: "#35AD29" }}
        >
          המשך למאמר
        </a>
      </div>
    </div>
  );
}
