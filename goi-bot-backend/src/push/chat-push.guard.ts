import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Matches TanStack chat-push auth: Bearer token must equal CHAT_PUSH_TOKEN.
 * Returns 503 when unconfigured (matches original "Not configured" response).
 */
@Injectable()
export class ChatPushGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>("chatPush.token");
    if (!token) {
      throw new ServiceUnavailableException("Not configured");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization ?? "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (bearer !== token) {
      throw new UnauthorizedException("Unauthorized");
    }
    return true;
  }
}
