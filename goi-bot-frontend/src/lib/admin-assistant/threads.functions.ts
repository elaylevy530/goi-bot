import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    return nestServerFetch("/api/admin-assistant/threads", {
      accessToken: context.accessToken,
    });
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    return nestServerFetch("/api/admin-assistant/threads", {
      accessToken: context.accessToken,
      method: "POST",
    });
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch(`/api/admin-assistant/threads/${data.id}`, {
      accessToken: context.accessToken,
      method: "DELETE",
    });
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    return nestServerFetch(`/api/admin-assistant/threads/${data.threadId}/messages`, {
      accessToken: context.accessToken,
    });
  });
