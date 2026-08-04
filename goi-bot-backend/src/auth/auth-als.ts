import { AsyncLocalStorage } from "async_hooks";
import type { AuthUserContext, JwtPreviewClaim } from "./auth.types";

type AuthStore = { auth: AuthUserContext };

export const authAls = new AsyncLocalStorage<AuthStore>();

export function getRequestAuth(): AuthUserContext | undefined {
  return authAls.getStore()?.auth;
}

export function getPreviewClaim(): JwtPreviewClaim | undefined {
  return getRequestAuth()?.preview;
}

export function previewCourierId(): string | undefined {
  return getPreviewClaim()?.courierId;
}

export function previewCustomerId(): string | undefined {
  return getPreviewClaim()?.customerId;
}
