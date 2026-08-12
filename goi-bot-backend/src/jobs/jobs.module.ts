import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessNotification } from "../accounts/entities/business-notification.entity";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { Message } from "../chat/entities/message.entity";
import { PartnersModule } from "../partners/partners.module";
import { PaymentsModule } from "../payments/payments.module";
import { PlatformModule } from "../platform/platform.module";
import { Conversation } from "../push/entities/conversation.entity";
import { PushModule } from "../push/push.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { JobOutcome } from "./entities/job-outcome.entity";
import { JobStop } from "./entities/job-stop.entity";
import { StatusLog } from "./entities/status-log.entity";
import { CourierJobDecline } from "./entities/courier-job-decline.entity";
import { ExpressPricingRule } from "./entities/express-pricing-rule.entity";
import { Job } from "./entities/job.entity";
import { JobLead } from "./entities/job-lead.entity";
import { JobQuote } from "./entities/job-quote.entity";
import { OfferEvent } from "./entities/offer-event.entity";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { PublicJobsController } from "./public-jobs.controller";
import { PublicJobsService } from "./public-jobs.service";
import { PublicMoverJobsController } from "./public-mover-jobs.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      JobLead,
      JobQuote,
      OfferEvent,
      CourierJobDecline,
      Customer,
      Courier,
      CourierStats,
      BusinessNotification,
      ExpressPricingRule,
      JobOutcome,
      JobStop,
      StatusLog,
      Conversation,
      Message,
    ]),
    PartnersModule,
    PaymentsModule,
    WhatsappModule,
    PushModule,
    PlatformModule,
  ],
  controllers: [JobsController, PublicJobsController, PublicMoverJobsController],
  providers: [JobsService, PublicJobsService],
  exports: [JobsService],
})
export class JobsModule {}
