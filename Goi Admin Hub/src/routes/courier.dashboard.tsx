import { createFileRoute, redirect } from "@tanstack/react-router";

// Courier dashboard has been retired — everything now lives in the personal area.
export const Route = createFileRoute("/courier/dashboard")({
  beforeLoad: () => { throw redirect({ to: "/courier/profile" }); },
});
