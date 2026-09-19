import { createFileRoute } from "@tanstack/react-router";
import { CourierSupportFlow } from "@/components/courier/CourierSupportFlow";

type Search = { c?: string; chat?: boolean };

export const Route = createFileRoute("/courier/support")({
  head: () => ({ meta: [{ title: "תמיכה לשליחים — Goi" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
    chat: s.chat === true || s.chat === "1" || s.chat === "true",
  }),
  component: CourierSupportPage,
});

function CourierSupportPage() {
  const search = Route.useSearch();
  return <CourierSupportFlow search={search} />;
}
