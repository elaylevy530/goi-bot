/** Roles used by Nest guards. `customer` is resolved via customers.user_id. */
export type AppRole = "admin" | "manager" | "courier" | "business" | "customer";

export type PreviewPanel = "courier" | "business" | "customer";

/** Embedded in short-lived admin preview JWTs. */
export type JwtPreviewClaim = {
  panel: PreviewPanel;
  courierId?: string;
  customerId?: string;
  /** Audit row id for this preview session. */
  sessionId?: string;
  readOnly: true;
};

export type JwtPayload = {
  sub: string;
  email: string;
  /** Seconds since epoch — set by `@nestjs/jwt` on sign. */
  iat?: number;
  preview?: JwtPreviewClaim;
};

export type AuthProfile = {
  customerId?: string;
  courierId?: string;
  name?: string | null;
  phone?: string | null;
  businessName?: string | null;
  businessNiche?: string | null;
  customerType?: string | null;
  logoUrl?: string | null;
  courierStatus?: string | null;
};

export type NestAuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  roles: AppRole[];
  profile: AuthProfile;
  preview?: {
    panel: PreviewPanel;
    courierId?: string;
    customerId?: string;
    readOnly: true;
    sessionId?: string;
    expiresAt?: string;
  };
};

export type AuthUserContext = {
  userId: string;
  /** Always the authenticated admin/user from JWT `sub` (never swapped). */
  realUserId: string;
  email: string | null;
  accessToken: string;
  /** Effective roles for the request (panel roles while previewing). */
  roles: AppRole[];
  /** Roles loaded for JWT `sub` (admin/manager during preview). */
  realRoles: AppRole[];
  preview?: JwtPreviewClaim;
};

declare module "express" {
  interface Request {
    auth?: AuthUserContext;
  }
}
