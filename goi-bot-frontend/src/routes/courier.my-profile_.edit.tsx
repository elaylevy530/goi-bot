import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/my-profile_/edit")({
  beforeLoad: () => {
    throw redirect({ to: "/courier/my-profile" });
  },
});
