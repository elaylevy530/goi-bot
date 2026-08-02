import { createServerFn } from "@tanstack/react-start";

/**
 * Fires a push notification to the job's private customer for a courier
 * status change (assigned / heading_to_pickup / picked_up / delivered).
 * Safe to call from the courier app after a client-side RPC succeeds.
 * If the job belongs to a business (no customers.user_id resolves), returns 0.
 */
export const notifyCustomerJobStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string; status: string }) => input)
  .handler(async ({ data }) => {
    if (!data?.jobId || !data?.status) return { sent: 0, expired: 0 };
    const { notifyCustomerJobStatus } = await import(
      "./push/customer-status-push.server"
    );
    try {
      return await notifyCustomerJobStatus(data.jobId, data.status);
    } catch (e) {
      console.error("[notify-customer-status] failed", e);
      return { sent: 0, expired: 0 };
    }
  });
