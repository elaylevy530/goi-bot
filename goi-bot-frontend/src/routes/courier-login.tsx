import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier-login")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
