/** Moved to Nest. TanStack webhook/watchdog routes deleted. */
export async function runPickupWatchdog(..._args: unknown[]): Promise<never> {
  throw new Error("TODO Nest: pickup watchdog — use Nest /api/public/hooks/pickup-watchdog");
}

export async function redispatchJob(..._args: unknown[]): Promise<never> {
  throw new Error("TODO Nest: redispatch job from the Nest jobs worker");
}

export async function runFavoritesFallback(..._args: unknown[]): Promise<never> {
  throw new Error("TODO Nest: favorites fallback from the Nest jobs worker");
}
