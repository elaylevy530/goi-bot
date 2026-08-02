import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const dispatchJobToCouriers = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    return nestServerFetch<{
      ok: boolean;
      dispatched: boolean;
      sent: number;
      matching_couriers_count?: number;
    }>(`/api/jobs/${data.jobId}/dispatch`, {
      method: "POST",
      accessToken: context.accessToken,
    });
  });
