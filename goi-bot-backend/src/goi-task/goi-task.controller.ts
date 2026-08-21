import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CreateGoiTaskDto } from "./dto/create-goi-task.dto";
import { UpdateGoiTaskDto } from "./dto/update-goi-task.dto";
import { GoiTaskAccessGuard } from "./guards/goi-task-access.guard";
import { GoiTaskService } from "./goi-task.service";

/** Isolated task board API — separate tables, shared team access token. */
@Controller("api/goi-task/tasks")
@UseGuards(GoiTaskAccessGuard)
export class GoiTaskController {
  constructor(private readonly service: GoiTaskService) {}

  @Get()
  list(@Query("q") q?: string) {
    return this.service.list(q);
  }

  @Post()
  create(@Body() dto: CreateGoiTaskDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoiTaskDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { ok: true };
  }
}
