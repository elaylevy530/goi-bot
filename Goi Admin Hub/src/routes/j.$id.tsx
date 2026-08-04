import { createFileRoute } from "@tanstack/react-router";
import { PublicJobView } from "@/components/PublicJobView";

export const Route = createFileRoute("/j/$id")({
  head: () => ({
    meta: [
      { title: "הובלה חדשה — פרטים והגשת הצעה" },
      { name: "description", content: "צפה בפרטי ההובלה, קח אותה במחיר שנקבע או שלח הצעת מחיר." },
      { property: "og:title", content: "הובלה חדשה — פרטים והגשת הצעה" },
      { property: "og:description", content: "צפה בפרטי ההובלה, קח אותה או שלח הצעת מחיר." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PublicJobView refId={Route.useParams().id} />,
});
