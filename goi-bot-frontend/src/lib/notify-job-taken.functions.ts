import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const notifyJobTakenFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await nestServerFetch(`/api/jobs/${data.jobId}`, { accessToken: context.accessToken });
    throw new Error("TODO Nest: expose a job-taken WhatsApp group notification endpoint.");
  });
