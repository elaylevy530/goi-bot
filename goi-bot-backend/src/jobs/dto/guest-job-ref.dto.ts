import { IsString, IsUUID, MinLength } from "class-validator";

export class GuestJobRefDto {
  @IsUUID()
  job_id!: string;

  @IsString()
  @MinLength(16)
  tracking_token!: string;
}

export class GuestSelectQuoteDto extends GuestJobRefDto {
  @IsUUID()
  quote_id!: string;
}

export class GuestCancelJobDto extends GuestJobRefDto {
  @IsString()
  status!: string;
}
