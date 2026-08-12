import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { AdminPushController } from "./admin-push.controller";
import { AdminPushService } from "./admin-push.service";
import { ChatPushController } from "./chat-push.controller";
import { ChatPushGuard } from "./chat-push.guard";
import { ChatPushService } from "./chat-push.service";
import { BusinessPushSubscription } from "./entities/business-push-subscription.entity";
import { Conversation } from "./entities/conversation.entity";
import { CourierPushSubscription } from "./entities/courier-push-subscription.entity";
import { CustomerPushSubscription } from "./entities/customer-push-subscription.entity";
import { OfferPushService } from "./offer-push.service";
import { PushSubscriptionsController } from "./push-subscriptions.controller";
import { PushSubscriptionsService } from "./push-subscriptions.service";
import { WebPushService } from "./web-push.service";

/** Push: JWT subscription CRUD + public `/api/public/hooks/chat-push`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      CourierPushSubscription,
      BusinessPushSubscription,
      CustomerPushSubscription,
      Courier,
      Customer,
    ]),
  ],
  controllers: [ChatPushController, PushSubscriptionsController, AdminPushController],
  providers: [
    ChatPushService,
    ChatPushGuard,
    WebPushService,
    OfferPushService,
    PushSubscriptionsService,
    AdminPushService,
  ],
  exports: [WebPushService, OfferPushService],
})
export class PushModule {}
