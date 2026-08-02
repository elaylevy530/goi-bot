import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PricingService } from "./pricing.service";

class ComputePriceDto {
  @IsNumber()
  @Min(0)
  distanceKm!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraStops?: number;

  @IsOptional()
  @IsBoolean()
  isHeavy?: boolean;
}

class UpdatePricingDto {
  @IsNumber() @Min(0) base_price!: number;
  @IsNumber() @Min(0) price_per_km!: number;
  @IsNumber() @Min(0) minimum_price!: number;
  @IsNumber() @Min(0) @Max(100) platform_fee_percent!: number;
  @IsOptional() @IsNumber() @Min(0) platform_fee_fixed?: number;
  @IsOptional() @IsNumber() @Min(0) waiting_fee_per_minute?: number;
  @IsOptional() @IsNumber() @Min(0) extra_stop_fee?: number;
  @IsOptional() @IsNumber() @Min(0) heavy_package_surcharge?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) night_surcharge_percent?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) weekend_surcharge_percent?: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller("api/pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get("active")
  @UseGuards(JwtAuthGuard)
  active() {
    return this.pricing.getActive();
  }

  @Post("compute")
  @UseGuards(JwtAuthGuard)
  compute(@Body() dto: ComputePriceDto) {
    return this.pricing.compute(
      dto.distanceKm,
      dto.extraStops ?? 0,
      dto.isHeavy ?? false,
    );
  }

  @Post("active")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  replace(@Body() dto: UpdatePricingDto) {
    return this.pricing.replaceActive(dto as never);
  }
}
