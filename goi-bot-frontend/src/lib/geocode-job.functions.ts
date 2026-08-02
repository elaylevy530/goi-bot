import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const geocodeJob = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((input: { jobId: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; patched?: Record<string, number> }> => {
    await nestServerFetch(`/api/jobs/${data.jobId}`, { accessToken: context.accessToken });
    throw new Error("TODO Nest: expose a job geocoding endpoint.");
  });
