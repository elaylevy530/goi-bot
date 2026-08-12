import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchNestSession, nestLogout } from "@/lib/nest-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await fetchNestSession();
    if (!session) throw redirect({ to: "/auth" });

    if (session.roles.includes("admin") || session.roles.includes("manager")) {
      return { user: session };
    }

    if (session.roles.includes("business")) {
      throw redirect({ to: "/business" });
    }
    if (session.roles.includes("courier")) {
      throw redirect({ to: "/courier/new-jobs" });
    }
    if (session.roles.includes("customer")) {
      throw redirect({ to: "/customer/dashboard" });
    }

    nestLogout();
    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
