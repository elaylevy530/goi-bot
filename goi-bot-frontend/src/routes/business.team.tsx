import { createFileRoute } from "@tanstack/react-router";
import { BusinessShell } from "@/components/BusinessShell";
import { BusinessCompany } from "@/components/business/goi/BusinessCompany";

export const Route = createFileRoute("/business/team")({
  head: () => ({ meta: [{ title: "צוות והרשאות — Goi" }] }),
  ssr: false,
  component: TeamPage,
});

function TeamPage() {
  return (
    <BusinessShell>
      <BusinessCompany section="team" />
    </BusinessShell>
  );
}
