import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PilotCity } from "./entities/pilot-city.entity";
import { PilotCitiesController } from "./pilot-cities.controller";
import { PilotCitiesService } from "./pilot-cities.service";

@Module({
  imports: [TypeOrmModule.forFeature([PilotCity])],
  controllers: [PilotCitiesController],
  providers: [PilotCitiesService],
})
export class PilotCitiesModule {}
