import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpsertPartnerDto } from "./dto/upsert-partner.dto";
import { PartnersService } from "./partners.service";

@Controller("api/partners")
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  list() {
    return this.partners.list();
  }

  @Get("preview-job")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  previewJob(@Query("partnerId") partnerId?: string) {
    return this.partners.getLastJobForPreview(partnerId || null);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  upsert(@Body() dto: UpsertPartnerDto) {
    return this.partners.upsert(dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.partners.remove(id);
  }
}

/** Unauthenticated partner panel resolution for /p/$slug. */
@Controller("api/public/partners")
export class PublicPartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get(":slug")
  @Header("Cache-Control", "no-store")
  getBySlug(@Param("slug") slug: string) {
    return this.partners.getPublicBySlug(slug);
  }
}
