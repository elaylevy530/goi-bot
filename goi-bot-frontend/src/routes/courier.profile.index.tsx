import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/profile/")({
  beforeLoad: () => {
    throw redirect({ to: "/courier/my-profile" });
  },
});
