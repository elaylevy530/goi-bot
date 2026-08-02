import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/admin-assistant/threads.functions";
import { AdminLayout } from "@/components/AdminLayout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-assistant/")({
  head: () => ({ meta: [{ title: "עוזר AI — Goi" }] }),
  component: AdminAssistantIndex,
});

const startedRef = { current: false };
function AdminAssistantIndex() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const t = await create();
        navigate({ to: "/admin-assistant/$threadId", params: { threadId: t.id }, replace: true });
      } catch (e) {
        console.error(e);
        startedRef.current = false;
      }
    })();
  }, [create, navigate]);

  return (
    <AdminLayout title="עוזר AI" subtitle="העוזר האישי שלך לניהול המערכת">
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> פותח שיחה חדשה...
      </div>
    </AdminLayout>
  );
}
