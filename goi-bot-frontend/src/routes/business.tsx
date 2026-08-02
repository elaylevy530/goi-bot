import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchNestSession } from "@/lib/nest-auth";

export const Route = createFileRoute("/business")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await fetchNestSession();
    if (!session) throw redirect({ to: "/auth" });

    if (!session.roles.includes("business") || !session.profile?.customerId) {
      throw redirect({ to: "/signup-business" });
    }

    const niche = session.profile.businessNiche ?? "manual_dispatch";
    if (niche === "restaurant") throw redirect({ to: "/restaurant" });
    if (niche === "online_store") throw redirect({ to: "/store" });
    if (niche === "pharmacy_clinic") throw redirect({ to: "/clinic" });

    if (location.pathname === "/business" || location.pathname === "/business/") {
      throw redirect({ to: "/business/dashboard" });
    }

    return {
      user: session,
      businessId: session.profile.customerId,
    };
  },
  component: () => <Outlet />,
});
