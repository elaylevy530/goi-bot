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
  AddCourierTagDto,
  BonusDto,
  CreateAreaDto,
  CreateMessageDto,
  CreateTagDto,
  JobOutcomeDto,
  MaintenanceDto,
  NotificationDto,
  OpenConversationDto,
  SupportTicketDto,
  UpdateClassificationRuleDto,
  UpdateExpressPricingDto,
  UpdateWithdrawalDto,
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
    return this.domain.createWithdrawal(auth.userId, data(body), auth.roles);
  }

  @Patch("withdrawals/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager", "courier")
  updateWithdrawal(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateWithdrawalDto,
  ) {
    return this.domain.updateWithdrawal(id, auth.userId, data(body), auth.roles);
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

  @Get("couriers/me/notifications")
  async myCourierNotifications(@CurrentUser() auth: AuthUserContext) {
    const courierId = await this.domain["requireCourierId"](auth.userId);
    return this.domain.listCourierNotifications(courierId);
  }

  @Patch("couriers/me/notifications/:id/read")
  async markMyNotificationRead(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const courierId = await this.domain["requireCourierId"](auth.userId);
    return this.domain.markCourierNotificationRead(courierId, id);
  }

  @Get("couriers/:id/stats")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  courierStats(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.getCourierStats(id);
  }

  @Get("couriers/:id/tags")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  listCourierTags(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.listCourierTags(id);
  }

  @Post("couriers/:id/tags")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  addCourierTag(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AddCourierTagDto,
  ) {
    return this.domain.addCourierTag(id, body.tag_id, body.assigned_automatically);
  }

  @Delete("couriers/:id/tags/:tagId")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  removeCourierTag(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("tagId", ParseUUIDPipe) tagId: string,
  ) {
    return this.domain.removeCourierTag(id, tagId);
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

  @Get("customers/me/favorites")
  listFavorites(@CurrentUser() auth: AuthUserContext) {
    return this.domain.favoritesForUser(auth.userId);
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

  @Get("customers/me/contacts")
  listContacts(@CurrentUser() auth: AuthUserContext) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.listSavedContacts(businessId),
    );
  }

  @Post("customers/me/contacts")
  upsertContact(@CurrentUser() auth: AuthUserContext, @Body() body: BodyData) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.upsertSavedContact(businessId, body),
    );
  }

  @Delete("customers/me/contacts/:id")
  deleteContact(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.deleteSavedContact(businessId, id),
    );
  }

  @Get("customers/me/team-members")
  listTeam(@CurrentUser() auth: AuthUserContext) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.listTeamMembers(businessId),
    );
  }

  @Post("customers/me/team-members")
  inviteTeam(@CurrentUser() auth: AuthUserContext, @Body() body: BodyData) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.inviteTeamMember(businessId, body),
    );
  }

  @Patch("customers/me/team-members/:id")
  updateTeam(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { role?: string },
  ) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.updateTeamMemberRole(businessId, id, String(body.role || "viewer")),
    );
  }

  @Delete("customers/me/team-members/:id")
  deleteTeam(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.deleteTeamMember(businessId, id),
    );
  }

  @Get("customers/me/recurring-orders")
  listRecurring(@CurrentUser() auth: AuthUserContext) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.listRecurringOrders(businessId),
    );
  }

  @Post("customers/me/recurring-orders")
  createRecurring(@CurrentUser() auth: AuthUserContext, @Body() body: BodyData) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.saveRecurringOrder(businessId, body),
    );
  }

  @Patch("customers/me/recurring-orders/:id")
  updateRecurring(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: BodyData,
  ) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) => {
      if (typeof body.active === "boolean" && Object.keys(body).length === 1) {
        return this.domain.toggleRecurringOrder(businessId, id, body.active);
      }
      return this.domain.saveRecurringOrder(businessId, body, id);
    });
  }

  @Delete("customers/me/recurring-orders/:id")
  deleteRecurring(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.domain.requireBusinessUser(auth.userId).then((businessId) =>
      this.domain.deleteRecurringOrder(businessId, id),
    );
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

  @Patch("express/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  updateExpress(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateExpressPricingDto,
  ) {
    return this.domain.updateExpressPricingRule(id, data(body));
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

  @Post("areas")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  createArea(@Body() body: CreateAreaDto) {
    return this.domain.createArea(body.name);
  }

  @Delete("areas/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  deleteArea(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.deleteArea(id);
  }

  @Get("tags")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  listTags() {
    return this.domain.listTags();
  }

  @Post("tags")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  createTag(@Body() body: CreateTagDto) {
    return this.domain.createTag(body.name, body.color);
  }

  @Delete("tags/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  deleteTag(@Param("id", ParseUUIDPipe) id: string) {
    return this.domain.deleteTag(id);
  }

  @Get("classification-rules")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  listRules() {
    return this.domain.listClassificationRules();
  }

  @Patch("classification-rules/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "manager")
  updateRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateClassificationRuleDto,
  ) {
    return this.domain.updateClassificationRule(id, data(body));
  }
}
