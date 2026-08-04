import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchNestSession, isPreviewSession } from "@/lib/nest-auth";

export const Route = createFileRoute("/courier")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await fetchNestSession();
    if (!session) throw redirect({ to: "/courier-login" });

    const previewCourier = isPreviewSession(session, "courier");
    const courierId =
      session.profile?.courierId ?? session.preview?.courierId ?? null;

    if (
      (!session.roles.includes("courier") || !courierId) &&
      !previewCourier
    ) {
      throw redirect({ to: "/join" });
    }

    // Courier home is the new-jobs map / available jobs screen.
    if (location.pathname === "/courier" || location.pathname === "/courier/") {
      throw redirect({ to: "/courier/new-jobs" });
    }

    return {
      user: session,
      courierId: courierId!,
      preview: session.preview ?? null,
    };
  },
  component: () => <Outlet />,
});
