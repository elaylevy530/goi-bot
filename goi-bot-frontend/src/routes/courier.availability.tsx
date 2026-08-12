import { createFileRoute, redirect } from "@tanstack/react-router";

// Bot preference UX retired in favor of live GPS matching — soft-redirect.
export const Route = createFileRoute("/courier/availability")({
  beforeLoad: () => { throw redirect({ to: "/courier/profile" }); },
});
