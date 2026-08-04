import { createFileRoute } from "@tanstack/react-router";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { ChatCenter } from "@/components/ChatCenter";
import { PushEnableRowGeneric } from "@/components/PushEnableRow";
import { pushSupported } from "@/lib/push/subscribe";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Search = { courierId?: string; jobId?: string; conv?: string };

export const Route = createFileRoute("/business/messages")({
  head: () => ({ meta: [{ title: "הודעות · Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    courierId: typeof s.courierId === "string" ? s.courierId : undefined,
    jobId: typeof s.jobId === "string" ? s.jobId : undefined,
    conv: typeof s.conv === "string" ? s.conv : undefined,
  }),
  component: BusinessMessagesPage,
});

function BusinessMessagesPage() {
  const { courierId, jobId, conv } = Route.useSearch();
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const initialConvIdRef = useRef<string | undefined>(conv);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (!me?.id || !courierId || !jobId) return;
    triggeredRef.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("open_conversation", {
        _kind: "courier_business",
        _courier_id: courierId,
        _business_id: me.id,
        _job_id: jobId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (typeof data === "string") {
        initialConvIdRef.current = data;
        await qc.invalidateQueries({ queryKey: ["chat-conversations", "business"] });
        toast.success("השיחה עם השליח נפתחה");
      }
    })();
  }, [me?.id, courierId, jobId, qc]);

  return (
    <BusinessShell title="הודעות" subtitle="צ׳אט עם השליחים שביצעו עבורך משלוחים ועם תמיכת המערכת">
      {me?.id && pushSupported() && (
        <div className="mb-3">
          <PushEnableRowGeneric
            role="business"
            ownerId={me.id}
            copy={{
              title: "הפעל התראות להודעות משליחים",
              subtitle: "תדע מיד כשהשליח כותב לך בצ׳אט",
              grantedTitle: "התראות פעילות",
              grantedSubtitle: "תקבל התראה מיידית על כל הודעה חדשה מהשליח",
            }}
          />
        </div>
      )}
      <ChatCenter viewerRole="business" initialConversationId={initialConvIdRef.current} />
    </BusinessShell>
  );
}
