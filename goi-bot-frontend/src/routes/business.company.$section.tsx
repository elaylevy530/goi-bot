import { createFileRoute } from "@tanstack/react-router";
import { BusinessShell } from "@/components/BusinessShell";
import { BusinessCompany } from "@/components/business/goi/BusinessCompany";

export const Route = createFileRoute("/business/company/$section")({
  head: () => ({ meta: [{ title: "העסק שלי — Goi" }] }),
  ssr: false,
  component: CompanySectionPage,
});

function CompanySectionPage() {
  const { section } = Route.useParams();
  return (
    <BusinessShell>
      <BusinessCompany section={section} />
    </BusinessShell>
  );
}
