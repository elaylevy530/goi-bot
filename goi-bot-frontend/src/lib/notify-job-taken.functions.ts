import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

/**
 * @deprecated Nest `claimJob` / `respondToOffer` now cancel sibling offers and
 * fan-out business + WhatsApp "taken" notices. FE callers may keep this for
 * back-compat; it only verifies the job exists.
 */
export const notifyJobTakenFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await nestServerFetch(`/api/jobs/${data.jobId}`, { accessToken: context.accessToken });
    return { ok: true as const, skipped: "nest_owned" as const };
  });
