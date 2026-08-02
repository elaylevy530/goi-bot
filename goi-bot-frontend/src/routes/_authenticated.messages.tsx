import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { ChatCenter } from "@/components/ChatCenter";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "מרכז תמיכה · Goi" }] }),
  component: AdminMessagesPage,
});

function AdminMessagesPage() {
  return (
    <AdminLayout title="מרכז תמיכה" subtitle="שיחות עם שליחים ועסקים">
      <ChatCenter viewerRole="admin" />
    </AdminLayout>
  );
}
