import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AdminWhatsappService } from "./admin-whatsapp.service";

class SendWhatsappDto {
  @IsString() phone!: string;
  @IsString() message!: string;
  @IsOptional() @IsUUID() courier_id?: string;
  @IsOptional() @IsUUID() job_id?: string;
  @IsOptional() @IsBoolean() log_only?: boolean;
}

class BroadcastDto {
  @IsOptional() @IsString() message?: string;
}

@Controller("api/whatsapp")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "manager")
export class AdminWhatsappController {
  constructor(private readonly adminWa: AdminWhatsappService) {}

  @Post("send")
  send(@CurrentUser() auth: AuthUserContext, @Body() body: SendWhatsappDto) {
    return this.adminWa.sendMessage({
      phone: body.phone,
      message: body.message,
      courier_id: body.courier_id,
      job_id: body.job_id,
      sent_by: auth.userId,
      log_only: body.log_only,
    });
  }

  @Post("broadcast/approval-pending")
  broadcast(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: BroadcastDto,
  ) {
    return this.adminWa.broadcastApprovalPending(auth.userId, body.message);
  }
}
