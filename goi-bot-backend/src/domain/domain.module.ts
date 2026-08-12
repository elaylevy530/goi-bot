import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { BusinessBranch } from "../accounts/entities/business-branch.entity";
import { BusinessIntegration } from "../accounts/entities/business-integration.entity";
import { BusinessFavoriteCourier } from "../accounts/entities/business-favorite-courier.entity";
import { IntegrationRequestLog } from "../accounts/entities/integration-request-log.entity";
import { RecurringOrder } from "../accounts/entities/recurring-order.entity";
import { SavedContact } from "../accounts/entities/saved-contact.entity";
import { TeamMember } from "../accounts/entities/team-member.entity";
import { BillingRecord } from "../payments/entities/billing-record.entity";
import { Job } from "../jobs/entities/job.entity";
import { OfferEvent } from "../jobs/entities/offer-event.entity";
import { CourierAdminNotification } from "../accounts/entities/courier-admin-notification.entity";
import { CourierBonus } from "../accounts/entities/courier-bonus.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { WithdrawalRequest } from "../accounts/entities/withdrawal-request.entity";
import { Message } from "../chat/entities/message.entity";
import { ExpressPricingRule } from "../jobs/entities/express-pricing-rule.entity";
import { JobOutcome } from "../jobs/entities/job-outcome.entity";
import { StatusLog } from "../jobs/entities/status-log.entity";
import { Area } from "../platform/entities/area.entity";
import { ClassificationRule } from "../platform/entities/classification-rule.entity";
import { CourierTag } from "../platform/entities/courier-tag.entity";
import { Tag } from "../platform/entities/tag.entity";
import { Conversation } from "../push/entities/conversation.entity";
import { SupportTicket } from "../support/entities/support-ticket.entity";
import { WaMaintenance } from "../whatsapp/entities/wa-maintenance.entity";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import {
  AccountDomainController,
  AreaController,
  ChatController,
  ExpressPricingController,
  JobDomainController,
  SupportController,
  WhatsappDomainController,
  WhatsappMaintenanceInternalController,
} from "./domain.controller";
import { DomainService } from "./domain.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobOutcome,
      StatusLog,
      Conversation,
      Message,
      Courier,
      Customer,
      CourierAdminNotification,
      WithdrawalRequest,
      CourierBonus,
      WaMaintenance,
      SupportTicket,
      ExpressPricingRule,
      Area,
      Tag,
      CourierTag,
      ClassificationRule,
      SavedContact,
      TeamMember,
      RecurringOrder,
      CourierStats,
      BusinessBranch,
      BusinessIntegration,
      BusinessFavoriteCourier,
      IntegrationRequestLog,
      BillingRecord,
      Job,
      OfferEvent,
    ]),
  ],
  controllers: [
    JobDomainController,
    ChatController,
    AccountDomainController,
    WhatsappDomainController,
    WhatsappMaintenanceInternalController,
    SupportController,
    ExpressPricingController,
    AreaController,
  ],
  providers: [DomainService, CronSecretGuard],
})
export class DomainModule {}
