import { createFileRoute } from "@tanstack/react-router";
import { useCourierTerms } from "@/lib/courier-kind";
import { CourierShell } from "@/components/CourierShell";
import { ActiveJobs } from "@/routes/courier.history";

export const Route = createFileRoute("/courier/active")({
  head: () => ({ meta: [{ title: "משלוחים פעילים — Goi" }] }),
  component: ActivePage,
});

function ActivePage() {
  const t = useCourierTerms();
  return (
    <CourierShell title={t.activeJobs} subtitle={t.activeJobsSub}>
      <ActiveJobs />
    </CourierShell>
  );
}
