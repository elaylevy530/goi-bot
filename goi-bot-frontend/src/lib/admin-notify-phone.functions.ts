import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

const KEY = "admin_notify_phone";

export const getAdminNotifyPhoneFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }): Promise<{ phone: string | null }> => {
    assertNestAdmin(context);
    const row = await nestServerFetch<{ key: string; value: unknown } | null>(
      `/api/platform/settings/${encodeURIComponent(KEY)}`,
      { accessToken: context.accessToken },
    );
    const value = row?.value;
    return {
      phone: typeof value === "string" ? value : value != null ? String(value) : null,
    };
  });

export const setAdminNotifyPhoneFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) =>
    z.object({ phone: z.string().trim().max(32) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch(`/api/platform/settings/${encodeURIComponent(KEY)}`, {
      accessToken: context.accessToken,
      method: "PUT",
      body: { value: data.phone || null },
    });
    return { ok: true as const };
  });
