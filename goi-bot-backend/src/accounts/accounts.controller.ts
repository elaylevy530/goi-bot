import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import { AccountsService } from "./accounts.service";
import { ApproveCourierDto } from "./dto/approve-courier.dto";
import { ClassifyPhoneDto } from "./dto/classify-phone.dto";
import { CreateCourierAdminDto } from "./dto/create-courier-admin.dto";
import { ListCouriersQueryDto } from "./dto/list-couriers-query.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";
import { UpdateCourierAdminDto } from "./dto/update-courier-admin.dto";
import { UpdateCourierSelfDto } from "./dto/update-courier-self.dto";
import { UpdateCustomerAdminDto } from "./dto/update-customer-admin.dto";
import { UpdateCustomerSelfDto } from "./dto/update-customer-self.dto";

@Controller("api/accounts")
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post("classify-phone")
  @UseGuards(CronSecretGuard)
  classifyPhone(@Body() dto: ClassifyPhoneDto) {
    return this.accounts.classifyPhone(dto.phone);
  }

  @Get("couriers/me")
  @UseGuards(JwtAuthGuard)
  myCourier(@CurrentUser() auth: AuthUserContext) {
    return this.accounts.getMyCourier(auth.userId);
  }

  @Patch("couriers/me")
  @UseGuards(JwtAuthGuard)
  updateMyCourier(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: UpdateCourierSelfDto,
  ) {
    return this.accounts.updateMyCourier(auth.userId, dto);
  }

  @Get("customers/me")
  @UseGuards(JwtAuthGuard)
  myCustomer(@CurrentUser() auth: AuthUserContext) {
    return this.accounts.getMyCustomer(auth.userId);
  }

  @Patch("customers/me")
  @UseGuards(JwtAuthGuard)
  updateMyCustomer(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: UpdateCustomerSelfDto,
  ) {
    return this.accounts.updateMyCustomer(auth.userId, dto);
  }

  @Get("customers/me/notifications")
  @UseGuards(JwtAuthGuard)
  myNotifications(
    @CurrentUser() auth: AuthUserContext,
    @Query("limit") limit?: string,
  ) {
    return this.accounts.listMyNotifications(
      auth.userId,
      limit ? Number(limit) : 8,
    );
  }

  @Get("customers/me/notifications/unread-count")
  @UseGuards(JwtAuthGuard)
  myUnreadNotificationCount(@CurrentUser() auth: AuthUserContext) {
    return this.accounts.countUnreadNotifications(auth.userId);
  }

  @Patch("customers/me/notifications/read-all")
  @UseGuards(JwtAuthGuard)
  markMyNotificationsRead(@CurrentUser() auth: AuthUserContext) {
    return this.accounts.markAllNotificationsRead(auth.userId);
  }

  @Patch("customers/me/notifications/:id/read")
  @UseGuards(JwtAuthGuard)
  markMyNotificationRead(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.accounts.markNotificationRead(auth.userId, id);
  }

  @Get("admin/dashboard-stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  adminDashboardStats() {
    return this.accounts.getAdminDashboardStats();
  }

  @Get("couriers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  listCouriers(@Query() query: ListCouriersQueryDto) {
    return this.accounts.listCouriers(query.status, query.limit);
  }

  @Post("couriers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  createCourier(@Body() dto: CreateCourierAdminDto) {
    return this.accounts.createCourier(dto);
  }

  @Get("couriers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  getCourier(@Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.getCourier(id);
  }

  @Patch("couriers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  updateCourier(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourierAdminDto,
  ) {
    return this.accounts.updateCourier(id, dto);
  }

  @Post("couriers/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  approveCourier(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveCourierDto,
  ) {
    return this.accounts.approveCourier(id, dto);
  }

  @Delete("couriers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  deleteCourier(@Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.deleteCourier(id);
  }

  @Get("customers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.accounts.listCustomers(query.status, query.limit);
  }

  @Post("customers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  createCustomer(@Body() dto: UpdateCustomerAdminDto & { name: string; phone: string }) {
    return this.accounts.createCustomer(dto);
  }

  @Get("customers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  getCustomer(@Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.getCustomer(id);
  }

  @Patch("customers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  updateCustomer(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerAdminDto,
  ) {
    return this.accounts.updateCustomer(id, dto);
  }
}
