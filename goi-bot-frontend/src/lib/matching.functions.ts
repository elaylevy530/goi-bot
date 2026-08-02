import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

const inputSchema = z.object({
  job_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(15),
});

export type MatchReason = { label: string; points: number };
export type CourierMatch = {
  courier_id: string; full_name: string; whatsapp_phone: string; vehicle_label: string | null;
  base_city: string | null; score: number; acceptance_rate: number | null; on_time_rate: number | null;
  avg_rating: number | null; jobs_completed: number; reasons: MatchReason[];
};

export const findMatchingCouriers = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch(`/api/jobs/${data.job_id}`, { accessToken: context.accessToken });
    throw new Error("TODO Nest: expose the courier-matching endpoint.");
  });
