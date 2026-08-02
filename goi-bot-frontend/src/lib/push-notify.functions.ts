import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";

export const pushNotifyCouriers = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((input: { courierIds: string[]; title?: string; body?: string; url?: string; tag?: string }) => input)
  .handler(async (): Promise<{ sent: number; expired: number }> => {
    throw new Error("TODO Nest: expose a courier push notification endpoint.");
  });
