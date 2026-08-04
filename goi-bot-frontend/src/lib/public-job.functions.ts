import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

export type PublicJob = {
  id: string;
  job_number: string | number | null;
  short_code?: string | null;
  service_category: string | null;
  package_type: string | null;
  package_size: string | null;
  number_of_packages: number | null;
  description: string | null;
  pickup_area: string | null;
  pickup_address: string | null;
  dropoff_area: string | null;
  dropoff_address: string | null;
  job_date: string | null;
  job_time: string | null;
  estimated_distance_km: number | null;
  price: number | null;
  status: string | null;
  partner_name: string | null;
  partner_slug: string | null;
  taken: boolean;
};

export const getPublicJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(4).max(60) }).parse(d),
  )
  .handler(async ({ data }): Promise<PublicJob | null> => {
    try {
      return await nestServerFetch<PublicJob>(
        `/api/public/mover-jobs/${encodeURIComponent(data.id)}`,
      );
    } catch {
      return null;
    }
  });

export const submitJobLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.string().trim().min(4).max(60),
        kind: z.enum(["take", "quote"]),
        fullName: z.string().trim().min(2).max(60),
        phone: z.string().trim().min(9).max(20),
        price: z.number().positive().max(100000).nullable().optional(),
        note: z.string().trim().max(400).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return nestServerFetch<{ ok: true }>(
      `/api/public/mover-jobs/${encodeURIComponent(data.jobId)}/leads`,
      {
        method: "POST",
        body: {
          kind: data.kind,
          full_name: data.fullName,
          phone: data.phone,
          price: data.price ?? null,
          note: data.note ?? null,
        },
      },
    );
  });
