import { createFileRoute, redirect } from "@tanstack/react-router";

// Notification inbox is not ready — soft-redirect bookmarks to profile.
export const Route = createFileRoute("/courier/notifications")({
  beforeLoad: () => { throw redirect({ to: "/courier/profile" }); },
});
