import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { ChatCenter } from "@/components/ChatCenter";

type Search = { inbox?: "couriers" };

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "מרכז תמיכה · Goi" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    inbox: s.inbox === "couriers" ? "couriers" : undefined,
  }),
  component: AdminMessagesPage,
});

function AdminMessagesPage() {
  const { inbox } = Route.useSearch();
  const courierInbox = inbox === "couriers";
  return (
    <AdminLayout
      title={courierInbox ? "צ׳אט תמיכת שליחים" : "מרכז תמיכה"}
      subtitle={
        courierInbox
          ? "פניות שליחים, מענה בוט והמשך טיפול אנושי"
          : "שיחות עם שליחים ועסקים"
      }
    >
      <ChatCenter viewerRole="admin" inbox={courierInbox ? "couriers" : "all"} />
    </AdminLayout>
  );
}
