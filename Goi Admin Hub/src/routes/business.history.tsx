import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business/history")({
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/business/orders" }); },
  component: () => null,
});
