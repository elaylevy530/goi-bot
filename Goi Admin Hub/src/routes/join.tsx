import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "@/components/JoinPage";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "הרשמה לשליחים — Goi" },
      { name: "description", content: "הרשמה לבוט עבודות לשליחים — קבל משלוחים ישירות בוואטסאפ" },
      { property: "og:title", content: "הרשמה לשליחים — Goi" },
      { property: "og:description", content: "הרשמה לבוט עבודות לשליחים — קבל משלוחים ישירות בוואטסאפ" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://goi-bot.lovable.app/join" },
      { property: "og:image", content: "https://goi-bot.lovable.app/og-join.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "הרשמה לשליחים — Goi" },
      { name: "twitter:description", content: "הרשמה לבוט עבודות לשליחים — קבל משלוחים ישירות בוואטסאפ" },
      { name: "twitter:image", content: "https://goi-bot.lovable.app/og-join.jpg" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
    links: [
      { rel: "canonical", href: "https://goi-bot.lovable.app/join" },
    ],
  }),
  component: JoinPage,
});
