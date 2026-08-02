import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business/")({
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/business/dashboard" }); },
  component: () => null,
});
