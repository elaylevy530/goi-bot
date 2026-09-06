import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/courier/mission/$jobId")({
  head: () => ({ meta: [{ title: "משלוח פעיל — Goi" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/courier/active" });
  },
  component: () => null,
});
