import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/profile/bank")({
  beforeLoad: () => {
    throw redirect({ to: "/courier/wallet" });
  },
});
