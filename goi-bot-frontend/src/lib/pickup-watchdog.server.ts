/** Moved to Nest. TanStack webhook/watchdog routes deleted. */
export async function runPickupWatchdog(..._args: unknown[]) {
  console.warn("runPickupWatchdog: use Nest /api/public/hooks/pickup-watchdog");
  return { ok: false as const, skipped: "owned_by_nest" };
}

export async function redispatchJob(..._args: unknown[]) {
  console.warn("redispatchJob: use Nest jobs worker");
  return { ok: false as const, skipped: "owned_by_nest" };
}

export async function runFavoritesFallback(..._args: unknown[]) {
  console.warn("runFavoritesFallback: use Nest jobs worker");
  return { ok: false as const, skipped: "owned_by_nest" };
}
