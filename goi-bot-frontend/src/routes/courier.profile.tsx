import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/profile")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/courier/profile" || location.pathname === "/courier/profile/") {
      throw redirect({ to: "/courier/my-profile" });
    }
  },
  component: () => <Outlet />,
});
