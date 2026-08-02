import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SetDispatchGroupsDto } from "./dto/set-dispatch-groups.dto";
import { WhatsappDispatchService } from "./whatsapp-dispatch.service";

@Controller("api/whatsapp/dispatch-groups")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "manager")
export class WhatsappDispatchController {
  constructor(private readonly dispatch: WhatsappDispatchService) {}

  @Get()
  get() {
    return this.dispatch.get();
  }

  @Put()
  set(@CurrentUser() auth: AuthUserContext, @Body() dto: SetDispatchGroupsDto) {
    return this.dispatch.set(dto, auth.userId);
  }
}
