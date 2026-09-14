import { createFileRoute, redirect } from "@tanstack/react-router";
import { BusinessShell } from "@/components/BusinessShell";
import { BusinessCompany } from "@/components/business/goi/BusinessCompany";

export const Route = createFileRoute("/business/company/$section")({
  head: () => ({ meta: [{ title: "העסק שלי — Goi" }] }),
  ssr: false,
  beforeLoad: ({ params }) => {
    if (!["profile", "pricing", "items", "delivery", "team"].includes(params.section)) {
      throw redirect({ to: "/business/account", replace: true });
    }
  },
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
