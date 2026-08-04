import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";
import type { JobMessageInput } from "@/lib/whatsapp/job-message-template";

export type PartnerPublic = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
};

export type PartnerRow = PartnerPublic & {
  whatsapp_group_id: string | null;
  dispatch_note: string | null;
  is_active: boolean;
  message_sections: Record<string, boolean> | null;
  message_cta: string | null;
};

export const listPartnersFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }): Promise<PartnerRow[]> => {
    assertNestAdmin(context);
    return nestServerFetch<PartnerRow[]>("/api/partners", {
      accessToken: context.accessToken,
    });
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "רק אותיות אנגליות קטנות, ספרות ומקף"),
  name: z.string().trim().min(2).max(80),
  logo_url: z.string().trim().max(500).optional().nullable(),
  contact_phone: z.string().trim().max(20).optional().nullable(),
  whatsapp_group_id: z.string().trim().max(120).optional().nullable(),
  dispatch_note: z.string().trim().max(300).optional().nullable(),
  is_active: z.boolean(),
  message_sections: z.record(z.string(), z.boolean()).optional().nullable(),
  message_cta: z.string().trim().max(200).optional().nullable(),
});

export const upsertPartnerFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    return nestServerFetch<{ ok: true; id: string }>("/api/partners", {
      accessToken: context.accessToken,
      method: "POST",
      body: data,
    });
  });

export const deletePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    return nestServerFetch<{ ok: true }>(`/api/partners/${data.id}`, {
      accessToken: context.accessToken,
      method: "DELETE",
    });
  });

export const getPartnerBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data }): Promise<PartnerPublic | null> => {
    try {
      return await nestServerFetch<PartnerPublic>(
        `/api/public/partners/${encodeURIComponent(data.slug)}`,
      );
    } catch {
      return null;
    }
  });

export const getPartnerLastJobFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) =>
    z.object({ partnerId: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<JobMessageInput | null> => {
    assertNestAdmin(context);
    const q = data.partnerId
      ? `?partnerId=${encodeURIComponent(data.partnerId)}`
      : "";
    return nestServerFetch<JobMessageInput | null>(`/api/partners/preview-job${q}`, {
      accessToken: context.accessToken,
    });
  });
