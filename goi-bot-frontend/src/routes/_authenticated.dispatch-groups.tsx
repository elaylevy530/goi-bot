import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { DispatchGroupsCard } from "@/components/DispatchGroupsCard";

export const Route = createFileRoute("/_authenticated/dispatch-groups")({
  head: () => ({ meta: [{ title: "קבוצות שידור משלוחים — Goi" }] }),
  component: DispatchGroupsPage,
});

function DispatchGroupsPage() {
  return (
    <AdminLayout
      title="קבוצות שידור משלוחים"
      subtitle="בחר את קבוצות הוואטסאפ שאליהן יישלחו התראות על משלוחים והובלות חדשים."
    >
      <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
        <DispatchGroupsCard />
      </div>
    </AdminLayout>
  );
}
