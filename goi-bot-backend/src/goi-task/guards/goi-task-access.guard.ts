import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class GoiTaskAccessGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("goiTask.accessToken");
    const nodeEnv = this.config.get<string>("nodeEnv") ?? "development";

    if (!expected) {
      if (nodeEnv !== "production") return true;
      throw new ForbiddenException("GOI task access is not configured");
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers["x-goi-task-token"];
    const token = Array.isArray(provided) ? provided[0] : provided;

    if (token && token === expected) return true;

    throw new ForbiddenException("Invalid or missing goi-task access token");
  }
}
