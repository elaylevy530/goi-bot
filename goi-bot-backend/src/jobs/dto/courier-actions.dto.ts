import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class RespondOfferDto {
  @IsUUID()
  offer_id!: string;

  @IsIn(["accepted", "declined"])
  response!: "accepted" | "declined";
}

export class ClaimJobDto {
  @IsUUID()
  job_id!: string;

  @IsOptional()
  @IsString()
  source?: string;
}
