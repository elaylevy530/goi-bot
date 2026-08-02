import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";

export const getWhatsAppProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    const { providerStatus } = await import("@/lib/whatsapp/provider.server");
    return providerStatus();
  });

export const sendWhatsAppProviderTest = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: { phone: string; message: string }) => {
    if (!data?.phone || !data?.message) throw new Error("phone + message required");
    return data;
  })
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    const { sendText, getActiveProvider } = await import("@/lib/whatsapp/provider.server");
    const res = await sendText(data.phone, data.message);
    return { provider: getActiveProvider(), result: res };
  });
