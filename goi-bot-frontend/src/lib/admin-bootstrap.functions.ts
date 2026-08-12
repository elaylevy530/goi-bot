import { createServerFn } from "@tanstack/react-start";

/**
 * Nest owns role assignment. One-time bootstrap is intentionally unavailable
 * from the shell — provision admins via Nest/ops tooling.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async () => {
    throw new Error("Bootstrap admin is not available from the shell. Use Nest ops provisioning.");
  });
