import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateMunchOrderDto } from "./dto/create-munch-order.dto";
import { MunchService } from "./munch.service";

@Controller("api/munch")
export class MunchController {
  constructor(private readonly munch: MunchService) {}

  @Get("kiosks")
  listKiosks() {
    return this.munch.listKiosks();
  }

  @Get("kiosks/:id/menu")
  getMenu(@Param("id", ParseUUIDPipe) id: string) {
    return this.munch.getMenu(id);
  }

  @Post("orders")
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() auth: AuthUserContext, @Body() dto: CreateMunchOrderDto) {
    return this.munch.createOrder(auth.userId, dto);
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  getOrder(@CurrentUser() auth: AuthUserContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.munch.getOrder(id, auth.userId, auth.roles);
  }

  @Post("orders/:id/cancel")
  @UseGuards(JwtAuthGuard)
  cancel(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.munch.cancelOwn(id, auth.userId, auth.roles);
  }

  @Post("orders/:id/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  confirm(@Param("id", ParseUUIDPipe) id: string) {
    return this.munch.confirm(id);
  }

  @Post("orders/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string | null },
  ) {
    return this.munch.reject(id, body.reason);
  }

  @Post("orders/:id/mark-ready")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  markReady(@Param("id", ParseUUIDPipe) id: string) {
    return this.munch.markReady(id);
  }
}
