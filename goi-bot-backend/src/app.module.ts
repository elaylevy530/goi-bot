import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module";
import { AdminAssistantModule } from "./admin-assistant/admin-assistant.module";
import { AuthModule } from "./auth/auth.module";
import configuration from "./common/config/configuration";
import { validateEnv } from "./common/config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { DomainModule } from "./domain/domain.module";
import { FilesModule } from "./files/files.module";
import { GoiTaskModule } from "./goi-task/goi-task.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { MunchModule } from "./munch/munch.module";
import { PaymentsModule } from "./payments/payments.module";
import { PartnersModule } from "./partners/partners.module";
import { PilotCitiesModule } from "./pilot-cities/pilot-cities.module";
import { PlatformModule } from "./platform/platform.module";
import { PricingModule } from "./pricing/pricing.module";
import { PushModule } from "./push/push.module";
import { TrackingModule } from "./tracking/tracking.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { WorkersModule } from "./workers/workers.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    FilesModule,
    DomainModule,
    AccountsModule,
    JobsModule,
    PricingModule,
    PlatformModule,
    PilotCitiesModule,
    PartnersModule,
    AdminAssistantModule,
    WhatsappModule,
    TrackingModule,
    MunchModule,
    PaymentsModule,
    PushModule,
    HealthModule,
    WorkersModule,
    GoiTaskModule,
  ],
})
export class AppModule {}

