import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { BusinessCompany } from "@/components/business/goi/BusinessCompany";

export const Route = createFileRoute("/business/account")({
  head: () => ({ meta: [{ title: "העסק שלי — Goi" }] }),
  ssr: false,
  component: AccountPage,
});

function AccountPage() {
  const { data: me } = useMyBusiness();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    const { nestLogout } = await import("@/lib/nest-auth");
    nestLogout();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <BusinessShell>
      <BusinessCompany />
      <div className="page-content account-logout" style={{ paddingTop: 0 }}>
        <button type="button" className="btn outline full red-text" onClick={handleSignOut}>
          <LogOut size={16} /> יציאה מהחשבון
        </button>
        <p className="hint" style={{ textAlign: "center", marginTop: 12 }}>
          {(me as { business_name?: string } | null)?.business_name || me?.name || "Goi"} · פאנל עסקים
        </p>
      </div>
    </BusinessShell>
  );
}
