import { createFileRoute, redirect } from "@tanstack/react-router";

// Quotes list removed from nav for both kinds — soft-redirect to history.
export const Route = createFileRoute("/courier/my-quotes")({
  beforeLoad: () => { throw redirect({ to: "/courier/history" }); },
});
