import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "פאנל הזמנות הובלה" },
      { name: "description", content: "שדרו הזמנת הובלה למאגר המובילים תוך פחות מדקה." },
      { property: "og:title", content: "פאנל הזמנות הובלה" },
      { property: "og:description", content: "שדרו הזמנת הובלה למאגר המובילים תוך פחות מדקה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerPanel,
});

function PartnerPanel() {
  const { slug } = Route.useParams();
  // No interstitial — go straight into the guest order form for this partner.
  return (
    <Navigate to="/customer/new-order" search={{ guest: "1", p: slug }} replace />
  );
}
