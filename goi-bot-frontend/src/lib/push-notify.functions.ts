import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const pushNotifyCouriers = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((input: { courierIds: string[]; title?: string; body?: string; url?: string; tag?: string }) => input)
  .handler(async ({ data, context }): Promise<{ sent: number; expired: number }> => {
    assertNestAdmin(context);
    return nestServerFetch<{ sent: number; expired: number }>("/api/push/notify-couriers", {
      method: "POST",
      accessToken: context.accessToken,
      body: data,
    });
  });
