import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import type { GoiTaskPriority, GoiTaskStatus } from "../entities/goi-task.entity";

const STATUSES: GoiTaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
];

const PRIORITIES: GoiTaskPriority[] = ["low", "medium", "high", "urgent"];

export class UpdateGoiTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: GoiTaskStatus;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: GoiTaskPriority;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignee?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
