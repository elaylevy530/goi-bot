import { createMiddleware } from "@tanstack/react-start";
import { getNestAccessToken } from "@/lib/nest-auth";

/** Attach Nest JWT to TanStack server function RPCs. */
export const attachNestAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getNestAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
