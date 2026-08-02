import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export type NestAuthContext = {
  userId: string;
  email: string | null;
  roles: string[];
  profile?: Record<string, unknown>;
  accessToken: string;
};

function nestApiBase(): string {
  const fromEnv =
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    "http://localhost:3001";
  return fromEnv.replace(/\/$/, "");
}

/**
 * Validate Nest JWT via GET /api/auth/me.
 * Applies Nest JWT auth to TanStack server functions.
 */
export const requireNestAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No Nest bearer token");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const res = await fetch(`${nestApiBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Unauthorized: Invalid Nest token");
    }

    const me = (await res.json()) as {
      userId: string;
      email: string | null;
      roles: string[];
      profile?: Record<string, unknown>;
    };

    if (!me?.userId) {
      throw new Error("Unauthorized: No user ID found");
    }

    return next({
      context: {
        userId: me.userId,
        email: me.email ?? null,
        roles: me.roles ?? [],
        profile: me.profile,
        accessToken: token,
      } satisfies NestAuthContext,
    });
  },
);

export function assertNestAdmin(context: { roles: string[] }) {
  if (!context.roles.includes("admin") && !context.roles.includes("manager")) {
    throw new Error("רק מנהל יכול לבצע פעולה זו");
  }
}
