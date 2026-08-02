import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import type { AuthUserContext, JwtPayload } from "../auth.types";

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

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? "";
    const roles = await this.authService.loadRoles(payload.sub);

    const auth: AuthUserContext = {
      userId: payload.sub,
      email: payload.email ?? null,
      accessToken: token,
      roles,
    };
    req.auth = auth;
    return auth;
  }
}
