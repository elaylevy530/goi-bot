import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GoiTaskCounter } from "./entities/goi-task-counter.entity";
import { GoiTask } from "./entities/goi-task.entity";
import { GoiTaskController } from "./goi-task.controller";
import { GoiTaskService } from "./goi-task.service";

@Module({
  imports: [TypeOrmModule.forFeature([GoiTask, GoiTaskCounter])],
  controllers: [GoiTaskController],
  providers: [GoiTaskService],
})
export class GoiTaskModule {}
