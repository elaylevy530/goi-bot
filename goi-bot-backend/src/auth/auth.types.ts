/** Roles used by Nest guards. `customer` is resolved via customers.user_id. */
export type AppRole = "admin" | "manager" | "courier" | "business" | "customer";

export type JwtPayload = {
  sub: string;
  email: string;
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
};

export type AuthUserContext = {
  userId: string;
  email: string | null;
  accessToken: string;
  roles: AppRole[];
};

declare module "express" {
  interface Request {
    auth?: AuthUserContext;
  }
}
