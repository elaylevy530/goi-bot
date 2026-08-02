import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export const createMultiStopJob = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ stops: z.array(z.unknown()).min(2) }).passthrough().parse(data),
  )
  .handler(async ({ data, context }) =>
    nestServerFetch("/api/jobs", {
      method: "POST",
      body: data,
      accessToken: context.accessToken,
    }),
  );

export const updateStopStatus = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        stopId: z.string().uuid(),
        status: z.enum(["arrived", "done"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    nestServerFetch(`/api/jobs/${data.jobId}/stops/${data.stopId}`, {
      method: "PATCH",
      body: { status: data.status },
      accessToken: context.accessToken,
    }),
  );
