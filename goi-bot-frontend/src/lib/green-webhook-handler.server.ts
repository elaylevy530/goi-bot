/** Moved to Nest. TanStack webhook routes deleted. */
export async function handleGreenWebhook(..._args: unknown[]) {
  console.warn("handleGreenWebhook: use Nest /api/public/green-webhook");
  return { ok: false as const, skipped: "owned_by_nest" };
}
