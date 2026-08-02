import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class JobOutcomeDto {
  @IsOptional() @IsUUID() courier_id?: string;
  @IsOptional() @IsDateString() picked_up_at?: string;
  @IsOptional() @IsDateString() delivered_at?: string;
  @IsOptional() @IsDateString() expected_delivery_at?: string;
  @IsOptional() @IsInt() late_minutes?: number;
  @IsOptional() @IsBoolean() was_late?: boolean;
  @IsOptional() @IsBoolean() was_cancelled?: boolean;
  @IsOptional() @IsString() cancellation_reason?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) customer_rating?: number;
  @IsOptional() @IsString() customer_comment?: string;
  @IsOptional() @IsNumber() @Min(0) tip_amount?: number;
  @IsOptional() @IsString() internal_notes?: string;
}

export class OpenConversationDto {
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsUUID() courier_id?: string;
  @IsOptional() @IsUUID() business_id?: string;
  @IsOptional() @IsUUID() job_id?: string;
  @IsOptional() @IsString() subject?: string;
}

export class CreateMessageDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() attachment_url?: string;
  @IsOptional() @IsString() attachment_kind?: string;
  @IsOptional() @IsString() attachment_name?: string;
  @IsOptional() @IsString() attachment_mime?: string;
  @IsOptional() @IsInt() @Min(0) attachment_size?: number;
  @IsOptional() @IsInt() @Min(0) duration_ms?: number;
}

export class NotificationDto {
  @IsOptional() @IsUUID() courier_id?: string;
  @IsOptional() @IsString() audience?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() link_url?: string;
  @IsOptional() @IsDateString() read_at?: string;
}

export class WithdrawalDto {
  @IsOptional() @IsUUID() courier_id?: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() payment_method?: string;
  @IsOptional() @IsString() bank_name?: string;
  @IsOptional() @IsString() bank_branch?: string;
  @IsOptional() @IsString() bank_account?: string;
  @IsOptional() @IsString() account_owner?: string;
  @IsOptional() @IsString() bit_phone?: string;
  @IsOptional() @IsString() note?: string;
}

export class BonusDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() sort_order?: number;
  @IsOptional() @IsDateString() starts_at?: string;
  @IsOptional() @IsDateString() ends_at?: string;
}

export class MaintenanceDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) allowlist?: string[];
}

export class SupportTicketDto {
  @IsOptional() @IsUUID() business_id?: string;
  @IsOptional() @IsUUID() job_id?: string;
  @IsString() issue_type!: string;
  @IsString() message!: string;
}
