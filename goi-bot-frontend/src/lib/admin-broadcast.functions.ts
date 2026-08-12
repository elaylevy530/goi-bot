import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const sendApprovalPendingBroadcast = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    return nestServerFetch<{ ok: boolean; total: number; sent: number; failed: number }>(
      "/api/whatsapp/broadcast/approval-pending",
      {
        method: "POST",
        accessToken: context.accessToken,
        body: {},
      },
    );
  });
