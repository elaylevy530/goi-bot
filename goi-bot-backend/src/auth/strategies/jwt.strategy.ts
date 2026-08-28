import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import type {
  AppRole,
  AuthUserContext,
  JwtPayload,
  JwtPreviewClaim,
} from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.secret"),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthUserContext> {
    if (!payload?.sub) {
      throw new UnauthorizedException("Unauthorized: Invalid token");
    }

    if (!payload.preview) {
      await this.authService.assertTokenNotRevoked(payload.sub, payload.iat);
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? "";
    const realRoles = await this.authService.loadRoles(payload.sub);

    if (payload.preview) {
      const auth = await this.buildPreviewAuth(
        payload.sub,
        payload.email ?? null,
        token,
        realRoles,
        payload.preview,
      );
      req.auth = auth;
      return auth;
    }

    const auth: AuthUserContext = {
      userId: payload.sub,
      realUserId: payload.sub,
      email: payload.email ?? null,
      accessToken: token,
      roles: realRoles,
      realRoles,
    };
    req.auth = auth;
    return auth;
  }

  private async buildPreviewAuth(
    adminUserId: string,
    email: string | null,
    token: string,
    realRoles: AppRole[],
    preview: JwtPreviewClaim,
  ): Promise<AuthUserContext> {
    if (!realRoles.includes("admin") && !realRoles.includes("manager")) {
      throw new UnauthorizedException("Preview requires admin or manager");
    }
    if (!preview.readOnly) {
      throw new UnauthorizedException("Invalid preview claim");
    }

    const resolved = await this.authService.resolvePreviewTarget(preview);
    const panelRole: AppRole =
      preview.panel === "courier"
        ? "courier"
        : preview.panel === "business"
          ? "business"
          : "customer";

    const auth: AuthUserContext = {
      userId: resolved.subjectUserId ?? adminUserId,
      realUserId: adminUserId,
      email,
      accessToken: token,
      roles: [panelRole],
      realRoles,
      preview: {
        panel: preview.panel,
        courierId: resolved.courierId,
        customerId: resolved.customerId,
        sessionId: preview.sessionId,
        readOnly: true,
      },
    };
    return auth;
  }
}
