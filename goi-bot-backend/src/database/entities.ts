import { AdminChatMessage } from "../admin-assistant/entities/admin-chat-message.entity";
import { AdminChatThread } from "../admin-assistant/entities/admin-chat-thread.entity";
import { BusinessNotification } from "../accounts/entities/business-notification.entity";
import { BusinessBranch } from "../accounts/entities/business-branch.entity";
import { BusinessFavoriteCourier } from "../accounts/entities/business-favorite-courier.entity";
import { BusinessIntegration } from "../accounts/entities/business-integration.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { CourierAdminNotification } from "../accounts/entities/courier-admin-notification.entity";
import { CourierBonus } from "../accounts/entities/courier-bonus.entity";
import { CourierPasswordReset } from "../accounts/entities/courier-password-reset.entity";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { IntegrationRequestLog } from "../accounts/entities/integration-request-log.entity";
import { User } from "../accounts/entities/user.entity";
import { UserRole } from "../accounts/entities/user-role.entity";
import { WithdrawalRequest } from "../accounts/entities/withdrawal-request.entity";
import { AdminPreviewSession } from "../auth/entities/admin-preview-session.entity";
import { Message } from "../chat/entities/message.entity";
import { ExpressPricingRule } from "../jobs/entities/express-pricing-rule.entity";
import { Job } from "../jobs/entities/job.entity";
import { JobOutcome } from "../jobs/entities/job-outcome.entity";
import { JobQuote } from "../jobs/entities/job-quote.entity";
import { JobStop } from "../jobs/entities/job-stop.entity";
import { CourierJobDecline } from "../jobs/entities/courier-job-decline.entity";
import { OfferEvent } from "../jobs/entities/offer-event.entity";
import { StatusLog } from "../jobs/entities/status-log.entity";
import { BillingRecord } from "../payments/entities/billing-record.entity";
import { PaypalPayout } from "../payments/entities/paypal-payout.entity";
import { PaypalWebhookEvent } from "../payments/entities/paypal-webhook-event.entity";
import { Kiosk } from "../munch/entities/kiosk.entity";
import { KioskCategory } from "../munch/entities/kiosk-category.entity";
import { KioskProduct } from "../munch/entities/kiosk-product.entity";
import { MunchOrder } from "../munch/entities/munch-order.entity";
import { PilotCity } from "../pilot-cities/entities/pilot-city.entity";
import { PricingRule } from "../pricing/entities/pricing-rule.entity";
import { BusinessPushSubscription } from "../push/entities/business-push-subscription.entity";
import { Conversation } from "../push/entities/conversation.entity";
import { CourierPushSubscription } from "../push/entities/courier-push-subscription.entity";
import { CustomerPushSubscription } from "../push/entities/customer-push-subscription.entity";
import { NotificationQueueItem } from "../workers/entities/notification-queue-item.entity";
import { Area } from "../platform/entities/area.entity";
import { PlatformSetting } from "../platform/entities/platform-setting.entity";
import { SupportTicket } from "../support/entities/support-ticket.entity";
import { GreenApiWebhookEvent } from "../whatsapp/entities/green-webhook-event.entity";
import { WaBotState } from "../whatsapp/entities/wa-bot-state.entity";
import { WaMaintenance } from "../whatsapp/entities/wa-maintenance.entity";
import { WhatsappDispatchSettings } from "../whatsapp/entities/whatsapp-dispatch-settings.entity";
import { WhatsappMessage } from "../whatsapp/entities/whatsapp-message.entity";

/** All TypeORM entities registered for synchronize. No migrations. */
export const TYPEORM_ENTITIES = [
  User,
  UserRole,
  AdminPreviewSession,
  Customer,
  BusinessNotification,
  BusinessFavoriteCourier,
  Courier,
  CourierAdminNotification,
  CourierBonus,
  CourierPasswordReset,
  CourierStats,
  WithdrawalRequest,
  Job,
  JobOutcome,
  JobStop,
  JobQuote,
  StatusLog,
  ExpressPricingRule,
  OfferEvent,
  CourierJobDecline,
  PricingRule,
  NotificationQueueItem,
  CourierPushSubscription,
  BusinessPushSubscription,
  CustomerPushSubscription,
  WaBotState,
  WhatsappMessage,
  GreenApiWebhookEvent,
  BillingRecord,
  PaypalWebhookEvent,
  PaypalPayout,
  BusinessIntegration,
  BusinessBranch,
  IntegrationRequestLog,
  Conversation,
  Message,
  AdminChatThread,
  AdminChatMessage,
  PlatformSetting,
  Area,
  SupportTicket,
  PilotCity,
  Kiosk,
  KioskCategory,
  KioskProduct,
  MunchOrder,
  WhatsappDispatchSettings,
  WaMaintenance,
] as const;
