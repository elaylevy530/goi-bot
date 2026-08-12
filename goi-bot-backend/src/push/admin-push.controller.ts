import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminPushService } from "./admin-push.service";

class NotifyCouriersDto {
  @IsArray()
  @IsUUID("4", { each: true })
  courierIds!: string[];

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() tag?: string;
}

@Controller("api/push")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "manager")
export class AdminPushController {
  constructor(private readonly adminPush: AdminPushService) {}

  @Post("notify-couriers")
  notify(@Body() body: NotifyCouriersDto) {
    return this.adminPush.notifyCouriers(body);
  }
}
