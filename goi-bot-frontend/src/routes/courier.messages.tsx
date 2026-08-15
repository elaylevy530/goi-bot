import { createFileRoute } from "@tanstack/react-router";
import { CourierShell } from "@/components/CourierShell";
import { ChatCenter } from "@/components/ChatCenter";

type Search = { c?: string };

export const Route = createFileRoute("/courier/messages")({
  head: () => ({ meta: [{ title: "הודעות · Goi" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  component: CourierMessagesPage,
});

function CourierMessagesPage() {
  const { c } = Route.useSearch();
  return (
    <CourierShell title="הודעות">
      <ChatCenter viewerRole="courier" initialConversationId={c} />
    </CourierShell>
  );
}
