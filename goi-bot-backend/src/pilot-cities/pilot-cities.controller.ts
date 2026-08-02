import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpsertPilotCityDto } from "./dto/upsert-pilot-city.dto";
import { PilotCitiesService } from "./pilot-cities.service";

@Controller("api/pilot-cities")
export class PilotCitiesController {
  constructor(private readonly pilotCities: PilotCitiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.pilotCities.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  upsert(@Body() dto: UpsertPilotCityDto) {
    return this.pilotCities.upsert(dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.pilotCities.remove(id);
  }
}
