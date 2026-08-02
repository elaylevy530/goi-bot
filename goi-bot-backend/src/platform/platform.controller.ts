import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PlatformService } from "./platform.service";

@Controller("api/platform")
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get("settings/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  get(@Param("key") key: string) {
    return this.platform.get(key);
  }

  @Put("settings/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  upsert(
    @CurrentUser() auth: AuthUserContext,
    @Param("key") key: string,
    @Body() body: { value: unknown },
  ) {
    return this.platform.upsert(key, body.value, auth.userId);
  }

  /** Public tile flags for customer new-order (no auth). */
  @Get("settings/public/:keys")
  publicSettings(@Param("keys") keys: string) {
    return this.platform.getMany(keys.split(",").map((k) => k.trim()).filter(Boolean));
  }
}
