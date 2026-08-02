import { createServerFn } from "@tanstack/react-start";

/**
 * Fires a push notification to the job's owning business for a courier
 * status change (assigned / heading_to_pickup / picked_up / delivered).
 * Safe to call from the courier app after a client-side RPC succeeds.
 */
export const notifyBusinessJobStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string; status: string }) => input)
  .handler(async ({ data }) => {
    if (!data?.jobId || !data?.status) return { sent: 0, expired: 0 };
    const { notifyBusinessJobStatus } = await import(
      "./push/business-status-push.server"
    );
    try {
      return await notifyBusinessJobStatus(data.jobId, data.status);
    } catch (e) {
      console.error("[notify-business-status] failed", e);
      return { sent: 0, expired: 0 };
    }
  });
