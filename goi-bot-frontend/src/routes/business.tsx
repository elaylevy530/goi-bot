import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchNestSession, isPreviewSession } from "@/lib/nest-auth";

export const Route = createFileRoute("/business")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await fetchNestSession();
    if (!session) throw redirect({ to: "/auth" });

    const previewBusiness = isPreviewSession(session, "business");
    const businessId =
      session.profile?.customerId ?? session.preview?.customerId ?? null;

    if (
      (!session.roles.includes("business") || !businessId) &&
      !previewBusiness
    ) {
      throw redirect({ to: "/signup-business" });
    }

    // Niche shortcuts skip the shared business shell; keep admin preview on /business/*.
    if (!previewBusiness) {
      const niche = session.profile?.businessNiche ?? "manual_dispatch";
      if (niche === "restaurant") throw redirect({ to: "/restaurant" });
      if (niche === "online_store") throw redirect({ to: "/store" });
      if (niche === "pharmacy_clinic") throw redirect({ to: "/clinic" });
    }

    if (location.pathname === "/business" || location.pathname === "/business/") {
      throw redirect({ to: "/business/dashboard" });
    }

    return {
      user: session,
      businessId: businessId!,
      preview: session.preview ?? null,
    };
  },
  component: () => <Outlet />,
});
