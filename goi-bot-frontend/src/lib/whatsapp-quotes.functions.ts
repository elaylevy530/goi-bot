import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

const input = (data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data);

/** Quote-request fan-out uses Nest dispatch (WhatsApp group + offer push). */
export const notifyCouriersOfQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) =>
    nestServerFetch(`/api/jobs/${data.jobId}/dispatch`, {
      method: "POST",
      accessToken: context.accessToken,
    }),
  );
