import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business-login")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
