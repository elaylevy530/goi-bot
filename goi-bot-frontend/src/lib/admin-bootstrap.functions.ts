import { createServerFn } from "@tanstack/react-start";

/**
 * Nest owns role assignment. Bootstrap is intentionally disabled until Nest
 * exposes a one-time, transaction-safe initial-admin endpoint.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async () => {
    throw new Error("TODO Nest: expose a one-time initial-admin bootstrap endpoint.");
  });
