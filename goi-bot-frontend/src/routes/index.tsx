import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

const SITE_URL = "https://goi.co.il";
const OG_IMAGE = SITE_URL + "/og-join.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GOI אפליקציה עם רשת שליחים לעסקים" },
      {
        name: "description",
        content:
          "אפליקציית GOI מחברת מסעדות, חנויות ועסקים לרשת של חברות משלוחים ושליחים עצמאיים, בלי מינימום ולפי הצורך.",
      },
      { property: "og:title", content: "GOI אפליקציה עם רשת שליחים לעסקים" },
      {
        property: "og:description",
        content:
          "אפליקציית GOI מחברת מסעדות, חנויות ועסקים לרשת של חברות משלוחים ושליחים עצמאיים, בלי מינימום ולפי הצורך.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "theme-color", content: "#07100a" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "canonical", href: SITE_URL + "/" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  component: LandingPage,
});
