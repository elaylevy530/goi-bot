import { createFileRoute, redirect } from "@tanstack/react-router";

// Settings essentials live under profile — soft-redirect.
export const Route = createFileRoute("/courier/settings")({
  beforeLoad: () => { throw redirect({ to: "/courier/profile" }); },
});
