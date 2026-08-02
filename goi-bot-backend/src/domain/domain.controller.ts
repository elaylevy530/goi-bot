import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import {
  BonusDto,
  CreateMessageDto,
  JobOutcomeDto,
  MaintenanceDto,
  NotificationDto,
  OpenConversationDto,
  SupportTicketDto,
  WithdrawalDto,
} from "./domain.dto";
import { DomainService } from "./domain.service";

type BodyData = Record<string, unknown>;
const data = (value: object) => value as BodyData;

@Controller("api/jobs")
@UseGuards(JwtAuthGuard)
export class JobDomainController {
  constructor(private readonly domain: DomainService) {}

  @Get(":id/outcome")
  outcome(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.getOutcome(id);
  }

  @Put(":id/outcome")
  putOutcome(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: JobOutcomeDto,
  ) {
    return this.domain.putOutcome(id, data(body));
  }

  @Get(":id/status-logs")
  statusLogs(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.statusLogs(id);
  }
}

@Controller("api/chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly domain: DomainService) {}

  @Get("conversations")
  list(@CurrentUser() auth: AuthUserContext) {
    return this.domain.listConversations(auth.userId, auth.roles);
  }

  @Post("conversations")
  open(@CurrentUser() auth: AuthUserContext, @Body() body: OpenConversationDto) {
    return this.domain.openConversation(auth.userId, auth.roles, data(body));
  }

  @Get("conversations/:id/messages")
  messages(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.listMessages(id, auth.userId, auth.roles);
  }

  @Post("conversations/:id/messages")
  postMessage(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CreateMessageDto,
  ) {
    return this.domain.postMessage(id, auth.userId, auth.roles, data(body));
  }

  @Post("conversations/:id/mark-read")
  markRead(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.markRead(id, auth.userId, auth.roles);
  }
}

@Controller("api/accounts")
@UseGuards(JwtAuthGuard)
export class AccountDomainController {
  constructor(private readonly domain: DomainService) {}

  @Get("courier-admin-notifications")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  notifications() {
    return this.domain.listNotifications();
  }

  @Post("courier-admin-notifications")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  createNotification(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: NotificationDto,
  ) {
    return this.domain.createNotification(auth.userId, data(body));
  }

  @Patch("courier-admin-notifications/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  updateNotification(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: NotificationDto,
  ) {
    return this.domain.updateNotification(id, data(body));
  }

  @Delete("courier-admin-notifications/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  deleteNotification(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.deleteNotification(id);
  }

  @Get("withdrawals")
  withdrawals(@CurrentUser() auth: AuthUserContext) {
    return this.domain.listWithdrawals(auth.userId, auth.roles);
  }

  @Post("withdrawals")
  createWithdrawal(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: WithdrawalDto,
  ) {
    return this.domain.createWithdrawal(auth.userId, data(body));
  }

  @Get("bonuses")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  bonuses() {
    return this.domain.listBonuses();
  }

  @Get("bonuses/active")
  activeBonuses() {
    return this.domain.listActiveBonuses();
  }

  @Post("bonuses")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  createBonus(@CurrentUser() auth: AuthUserContext, @Body() body: BonusDto) {
    return this.domain.createBonus(auth.userId, data(body));
  }

  @Patch("bonuses/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  updateBonus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: BonusDto,
  ) {
    return this.domain.updateBonus(id, data(body));
  }

  @Delete("bonuses/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  deleteBonus(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.deleteBonus(id);
  }

  @Get("couriers/me/stats")
  myCourierStats(@CurrentUser() auth: AuthUserContext) {
    return this.domain.myCourierStats(auth.userId);
  }

  @Get("couriers/me/outcomes")
  myCourierOutcomes(@CurrentUser() auth: AuthUserContext) {
    return this.domain.myCourierOutcomes(auth.userId);
  }

  @Get("couriers/me/declined-offers")
  myDeclinedOffers(@CurrentUser() auth: AuthUserContext) {
    return this.domain.myDeclinedOffers(auth.userId);
  }

  @Get("couriers/me/notification-unread")
  myNotificationUnread(@CurrentUser() auth: AuthUserContext) {
    return this.domain.myNotificationUnread(auth.userId);
  }

  @Get("couriers/:id/stats")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  courierStats(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.getCourierStats(id);
  }

  @Get("customers/me/branches")
  myBranches(@CurrentUser() auth: AuthUserContext) {
    return this.domain.branchesForUser(auth.userId);
  }

  @Post("customers/me/branches")
  createBranch(@CurrentUser() auth: AuthUserContext, @Body() body: BodyData) {
    return this.domain.createBranchForUser(auth.userId, body);
  }

  @Patch("customers/me/branches/:id")
  updateBranch(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: BodyData,
  ) {
    return this.domain.updateBranchForUser(auth.userId, id, body);
  }

  @Delete("customers/me/branches/:id")
  deleteBranch(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.deleteBranchForUser(auth.userId, id);
  }

  @Post("customers/me/branches/:id/default")
  defaultBranch(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.setDefaultBranchForUser(auth.userId, id);
  }

  @Get("customers/me/integration")
  myIntegration(@CurrentUser() auth: AuthUserContext) {
    return this.domain.integrationForUser(auth.userId);
  }

  @Patch("customers/me/integration")
  patchIntegration(@CurrentUser() auth: AuthUserContext, @Body() body: BodyData) {
    return this.domain.patchIntegrationForUser(auth.userId, body);
  }

  @Get("customers/me/integration/logs")
  integrationLogs(@CurrentUser() auth: AuthUserContext) {
    return this.domain.integrationLogsForUser(auth.userId);
  }

  @Get("customers/me/billing-records")
  myBilling(@CurrentUser() auth: AuthUserContext) {
    return this.domain.billingForUser(auth.userId);
  }

  @Get("customers/me/support-tickets")
  myTickets(@CurrentUser() auth: AuthUserContext) {
    return this.domain.ticketsForUser(auth.userId);
  }

  @Get("customers/me/favorites/:courierId")
  getFavorite(
    @CurrentUser() auth: AuthUserContext,
    @Param("courierId", ParseUUIDPipe) courierId: string,
  ) {
    return this.domain.favoriteForUser(auth.userId, courierId);
  }

  @Put("customers/me/favorites/:courierId")
  putFavorite(
    @CurrentUser() auth: AuthUserContext,
    @Param("courierId", ParseUUIDPipe) courierId: string,
    @Body() body: { status?: string | null },
  ) {
    return this.domain.setFavoriteForUser(auth.userId, courierId, body.status ?? null);
  }

  @Get("customers/:id/jobs")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  customerJobs(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.listCustomerJobs(id);
  }
}

@Controller("api/whatsapp")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "manager")
export class WhatsappDomainController {
  constructor(private readonly domain: DomainService) {}

  @Get("maintenance")
  maintenance() {
    return this.domain.getMaintenance();
  }

  @Put("maintenance")
  update(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: MaintenanceDto,
  ) {
    return this.domain.putMaintenance(auth.userId, data(body));
  }
}

/**
 * Server-only maintenance read for WhatsApp send gating (CronSecret).
 * Admin JWT UI continues to use GET/PUT /api/whatsapp/maintenance.
 */
@Controller("api/public/whatsapp-maintenance")
@UseGuards(CronSecretGuard)
export class WhatsappMaintenanceInternalController {
  constructor(private readonly domain: DomainService) {}

  @Get()
  maintenance() {
    return this.domain.getMaintenance();
  }
}

@Controller("api/support")
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly domain: DomainService) {}

  @Post("tickets")
  create(@CurrentUser() auth: AuthUserContext, @Body() body: SupportTicketDto) {
    return this.domain.createTicket(auth.userId, data(body));
  }

  @Get("tickets")
  list(@CurrentUser() auth: AuthUserContext) {
    return this.domain.ticketsForUser(auth.userId);
  }
}

/** Public read of express/guest service pricing rules (no auth — used by new-order). */
@Controller("api/pricing")
export class ExpressPricingController {
  constructor(private readonly domain: DomainService) {}

  @Get("express-active")
  active() {
    return this.domain.activeExpressPricing();
  }
}

@Controller("api/platform")
@UseGuards(JwtAuthGuard)
export class AreaController {
  constructor(private readonly domain: DomainService) {}

  @Get("areas")
  list() {
    return this.domain.listAreas();
  }
}
