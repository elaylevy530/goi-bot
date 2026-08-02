import { nestServerFetch } from "@/lib/nest-server";

export async function loadOrderDetails(jobId: string, accessToken: string) {
  const job = await nestServerFetch<Record<string, any>>(`/api/jobs/${jobId}`, {
    accessToken,
  });
  const total = Number(job.customer_price ?? 0);
  return {
    job,
    courier: null,
    payment: {
      total,
      payment_mode: "cash_only",
      deposit_percent: 0,
      prepaid: 0,
      remaining: total,
    },
  };
}
