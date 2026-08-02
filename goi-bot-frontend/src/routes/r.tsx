import { createFileRoute } from "@tanstack/react-router";
import { JoinPage } from "@/components/JoinPage";

// Short, mobile-friendly link to share with couriers.
// Renders the exact same registration page as /join.
export const Route = createFileRoute("/r")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "הרשמה לשליחים — Goi" },
      { name: "description", content: "הצטרף לבוט עבודות לשליחים של Goi וקבל משלוחים ישירות בוואטסאפ" },
      { property: "og:title", content: "הרשמה לשליחים — Goi" },
      { property: "og:description", content: "מלא את הטופס ב-2 דקות והתחל לקבל משלוחים בוואטסאפ" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://goi-bot.lovable.app/r" },
      { property: "og:image", content: "https://goi-bot.lovable.app/og-join.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "הרשמה לשליחים — Goi" },
      { name: "twitter:description", content: "מלא את הטופס ב-2 דקות והתחל לקבל משלוחים בוואטסאפ" },
      { name: "twitter:image", content: "https://goi-bot.lovable.app/og-join.jpg" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
    links: [
      { rel: "canonical", href: "https://goi-bot.lovable.app/r" },
    ],
  }),
  component: JoinPage,
});
