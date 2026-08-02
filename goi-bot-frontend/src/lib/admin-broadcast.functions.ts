import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const sendApprovalPendingBroadcast = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    const couriers = await nestServerFetch<unknown[]>("/api/accounts/couriers", {
      accessToken: context.accessToken,
    });
    const pending = couriers.filter(
      (courier: any) => courier.courier_status === "פעיל" && courier.admin_jobs_blocked,
    );
    if (pending.length) {
      throw new Error("TODO Nest: expose an admin WhatsApp broadcast endpoint before sending approval-pending messages.");
    }
    return { ok: true, total: 0, sent: 0, failed: 0 };
  });
