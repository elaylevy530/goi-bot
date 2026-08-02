import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { LaunchReadinessController } from "./launch-readiness.controller";

@Module({
  controllers: [HealthController, LaunchReadinessController],
})
export class HealthModule {}
