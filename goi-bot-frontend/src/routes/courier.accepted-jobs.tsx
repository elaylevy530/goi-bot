import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/accepted-jobs")({
  beforeLoad: () => { throw redirect({ to: "/courier/performance" }); },
});
