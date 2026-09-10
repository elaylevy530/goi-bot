import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/business/track/$id")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/business/active", search: { job: params.id } });
  },
  component: () => null,
});
