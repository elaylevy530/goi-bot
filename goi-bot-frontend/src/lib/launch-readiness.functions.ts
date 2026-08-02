import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export type CheckStatus = "READY" | "WARNING" | "BLOCKED";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  link?: string;
  lastChecked: string;
};

export const runLaunchReadiness = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    return nestServerFetch("/api/admin/launch-readiness", {
      accessToken: context.accessToken,
    });
  });
