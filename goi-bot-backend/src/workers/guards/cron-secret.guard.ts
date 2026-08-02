import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Matches TanStack worker auth:
 * Authorization: Bearer <CRON_SECRET>  OR  X-Cron-Secret: <CRON_SECRET>
 * Fail closed when CRON_SECRET is unset.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("cron.secret");
    if (!secret) {
      throw new UnauthorizedException("Unauthorized");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization ?? "";
    const xcsHeader = req.headers["x-cron-secret"];
    const xcs = Array.isArray(xcsHeader) ? xcsHeader[0] : xcsHeader ?? "";
    const bearer = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";

    if (bearer === secret || xcs === secret) {
      return true;
    }
    throw new UnauthorizedException("Unauthorized");
  }
}
