import { createFileRoute } from "@tanstack/react-router";
import { CourierShell } from "@/components/CourierShell";
import { ChatCenter } from "@/components/ChatCenter";

type Search = { c?: string };

export const Route = createFileRoute("/courier/support")({
  head: () => ({ meta: [{ title: "צ׳אט עם התמיכה — Goi" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  component: CourierSupportPage,
});

function CourierSupportPage() {
  const { c } = Route.useSearch();
  return (
    <CourierShell>
      <ChatCenter viewerRole="courier" inbox="support" initialConversationId={c} />
    </CourierShell>
  );
}
