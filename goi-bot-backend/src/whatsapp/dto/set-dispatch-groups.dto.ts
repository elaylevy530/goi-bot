import { IsOptional, IsString } from "class-validator";

export class SetDispatchGroupsDto {
  @IsOptional()
  @IsString()
  couriers_group_id!: string | null;

  @IsOptional()
  @IsString()
  couriers_group_name!: string | null;

  @IsOptional()
  @IsString()
  movers_group_id!: string | null;

  @IsOptional()
  @IsString()
  movers_group_name!: string | null;
}
