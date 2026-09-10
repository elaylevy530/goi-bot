import { createFileRoute } from "@tanstack/react-router";
import { BusinessShell } from "@/components/BusinessShell";
import { BusinessCompany } from "@/components/business/goi/BusinessCompany";

export const Route = createFileRoute("/business/profile")({
  head: () => ({ meta: [{ title: "פרטי העסק — Goi" }] }),
  ssr: false,
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <BusinessShell>
      <BusinessCompany section="profile" />
    </BusinessShell>
  );
}
