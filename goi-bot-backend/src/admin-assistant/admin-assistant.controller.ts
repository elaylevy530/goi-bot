import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { AdminAssistantService, UiMessage } from "./admin-assistant.service";

/**
 * Same path as TanStack: `/api/admin-chat`. Auth is Nest JWT + admin role
 * (RolesGuard).
 */
@Controller("api/admin-chat")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminAssistantController {
  constructor(private readonly service: AdminAssistantService) {}

  @Post()
  reply(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: { messages?: UiMessage[]; threadId?: string },
  ) {
    return this.service.reply(auth.userId, body);
  }
}
