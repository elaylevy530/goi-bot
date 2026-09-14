import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/business/new-delivery", replace: true });
  },
  component: () => null,
});
