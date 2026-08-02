import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

export const setPlatformSettingFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data) =>
    z.object({
      key: z.string().min(1),
      value: z.any(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch(`/api/platform/settings/${encodeURIComponent(data.key)}`, {
      accessToken: context.accessToken,
      method: "PUT",
      body: { value: data.value },
    });
    return { ok: true };
  });
