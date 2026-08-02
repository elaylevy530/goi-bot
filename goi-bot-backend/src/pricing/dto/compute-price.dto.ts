import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class ComputePriceDto {
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
