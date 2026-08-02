import { createFileRoute, redirect } from "@tanstack/react-router";

// Short link: /j/<jobId> -> /courier/new-jobs?jobId=<jobId>
// If courier is not logged in, /courier layout redirects to /courier-login.
export const Route = createFileRoute("/j/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/courier/new-jobs",
      search: { jobId: params.id },
    });
  },
  component: () => null,
});
