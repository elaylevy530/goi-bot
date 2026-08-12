import { createFileRoute, redirect } from "@tanstack/react-router";

// Ratings screen removed from MVP nav — soft-redirect to profile.
export const Route = createFileRoute("/courier/ratings")({
  beforeLoad: () => { throw redirect({ to: "/courier/profile" }); },
});
