import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

function normalize(phone: string): string {
  let value = phone.replace(/[^\d+]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  if (value.startsWith("0")) value = `972${value.slice(1)}`;
  if (!value.startsWith("972") && value.length === 9) value = `972${value}`;
  return value;
}

export const getWaMaintenance = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    return nestServerFetch("/api/whatsapp/maintenance", {
      accessToken: context.accessToken,
    });
  });

export const updateWaMaintenance = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((input: { enabled: boolean; allowlist: string[] }) =>
    z.object({ enabled: z.boolean(), allowlist: z.array(z.string()).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    return nestServerFetch("/api/whatsapp/maintenance", {
      accessToken: context.accessToken,
      method: "PUT",
      body: { enabled: data.enabled, allowlist: [...new Set(data.allowlist.map(normalize).filter((p) => p.length >= 10))] },
    });
  });
