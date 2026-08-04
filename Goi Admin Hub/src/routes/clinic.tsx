import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clinic")({
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/business/dashboard" }); },
  component: () => null,
});
