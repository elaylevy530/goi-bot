import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import { AuthService } from "./auth.service";
import type { AuthUserContext } from "./auth.types";
import { Roles } from "./decorators/roles.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CourierPasswordResetConfirmDto } from "./dto/courier-password-reset.dto";
import { CourierPasswordResetRequestDto } from "./dto/courier-password-reset.dto";
import { EnsureCustomerDto } from "./dto/ensure-customer.dto";
import { LoginDto } from "./dto/login.dto";
import { ProvisionCourierDto } from "./dto/provision-courier.dto";
import { RegisterBusinessDto } from "./dto/register-business.dto";
import { RegisterCourierDto } from "./dto/register-courier.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

/**
 * Product auth surface (Nest JWT + Postgres).
 * Nest owns product authentication.
 */
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post("register/customer")
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post("register/business")
  registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @Post("register/courier")
  registerCourier(@Body() dto: RegisterCourierDto) {
    return this.authService.registerCourier(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() auth: AuthUserContext) {
    return this.authService.getMe(auth.userId, auth.email);
  }

  @Get("me/customer")
  @UseGuards(JwtAuthGuard)
  meCustomer(@CurrentUser() auth: AuthUserContext) {
    return this.authService.getMyCustomer(auth.userId);
  }

  @Patch("me/customer")
  @UseGuards(JwtAuthGuard)
  updateMyCustomer(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.authService.updateMyCustomerName(auth.userId, dto.full_name);
  }

  @Get("me/courier")
  @UseGuards(JwtAuthGuard)
  meCourier(@CurrentUser() auth: AuthUserContext) {
    return this.authService.getMyCourier(auth.userId);
  }

  /** Self-service password update — JWT proves identity (matches product settings UX). */
  @Patch("password")
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.setPassword(auth.userId, dto.newPassword);
  }

  /** Stricter change that bcrypt-verifies the current password. */
  @Post("password/change")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      auth.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post("admin/provision-courier")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  provisionCourier(@Body() dto: ProvisionCourierDto) {
    return this.authService.provisionCourierAccount(dto.id);
  }

  /** Internal / WhatsApp worker: idempotent private-customer provisioning. */
  @Post("ensure-customer")
  @UseGuards(CronSecretGuard)
  ensureCustomer(@Body() dto: EnsureCustomerDto) {
    return this.authService.ensureCustomerAccount(dto.phone, dto.full_name);
  }

  @Post("courier/password-reset/request")
  requestCourierPasswordReset(@Body() dto: CourierPasswordResetRequestDto) {
    return this.authService.requestCourierPasswordReset(dto.phone);
  }

  @Post("courier/password-reset/confirm")
  confirmCourierPasswordReset(@Body() dto: CourierPasswordResetConfirmDto) {
    return this.authService.confirmCourierPasswordReset(
      dto.phone,
      dto.code,
      dto.newPassword,
    );
  }

  @Get("admin-ping")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  adminPing(@CurrentUser() auth: AuthUserContext) {
    return { ok: true, userId: auth.userId, roles: auth.roles };
  }
}
