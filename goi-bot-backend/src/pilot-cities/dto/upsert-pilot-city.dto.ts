import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpsertPilotCityDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(1)
  city_name!: string;

  @IsBoolean()
  is_active!: boolean;

  @IsOptional()
  @IsNumber()
  max_radius_km?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
