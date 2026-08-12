import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { GuestJobRefDto } from "./guest-job-ref.dto";

export class GuestChatOpenDto extends GuestJobRefDto {}

export class GuestChatListDto extends GuestJobRefDto {}

export class GuestChatMarkReadDto extends GuestJobRefDto {}

export class GuestChatPostMessageDto extends GuestJobRefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsUUID()
  conversation_id?: string;
}
