import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchNestSession } from "@/lib/nest-auth";

export const Route = createFileRoute("/courier")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await fetchNestSession();
    if (!session) throw redirect({ to: "/courier-login" });

    if (!session.roles.includes("courier") || !session.profile?.courierId) {
      throw redirect({ to: "/join" });
    }

    // Courier home is the new-jobs map / available jobs screen.
    if (location.pathname === "/courier" || location.pathname === "/courier/") {
      throw redirect({ to: "/courier/new-jobs" });
    }

    return {
      user: session,
      courierId: session.profile.courierId,
    };
  },
  component: () => <Outlet />,
});
