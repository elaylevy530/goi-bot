import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../accounts/entities/customer.entity";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { PaypalPayout } from "./entities/paypal-payout.entity";
import { PaypalWebhookEvent } from "./entities/paypal-webhook-event.entity";
import { WalletTransaction } from "./entities/wallet-transaction.entity";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaypalClientService } from "./paypal-client.service";
import { PaypalWebhookController } from "./paypal-webhook.controller";
import { PaypalWebhookService } from "./paypal-webhook.service";

/**
 * Admin payments surface (`/api/payments/*`) plus the public PayPal webhook
 * (`/api/public/paypal-webhook`).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingRecord,
      Job,
      PaypalWebhookEvent,
      PaypalPayout,
      Customer,
      WalletTransaction,
    ]),
  ],
  controllers: [PaymentsController, PaypalWebhookController],
  providers: [PaymentsService, PaypalWebhookService, PaypalClientService],
  exports: [PaypalClientService],
})
export class PaymentsModule {}
