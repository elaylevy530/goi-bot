import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AdminAssistantService } from "./admin-assistant.service";

/**
 * Thread CRUD for the admin assistant UI.
 * AI replies stay on POST /api/admin-chat.
 */
@Controller("api/admin-assistant/threads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminAssistantThreadsController {
  constructor(private readonly service: AdminAssistantService) {}

  @Get()
  list(@CurrentUser() auth: AuthUserContext) {
    return this.service.listThreads(auth.userId);
  }

  @Post()
  create(@CurrentUser() auth: AuthUserContext) {
    return this.service.createThread(auth.userId);
  }

  @Delete(":id")
  remove(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteThread(auth.userId, id);
  }

  @Get(":id/messages")
  messages(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.listMessages(auth.userId, id);
  }
}
