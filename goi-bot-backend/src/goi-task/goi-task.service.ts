import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, Repository } from "typeorm";
import { CreateGoiTaskDto } from "./dto/create-goi-task.dto";
import { UpdateGoiTaskDto } from "./dto/update-goi-task.dto";
import { GoiTaskCounter } from "./entities/goi-task-counter.entity";
import { GoiTask } from "./entities/goi-task.entity";

export type GoiTaskDto = {
  id: string;
  number: number;
  key: string;
  title: string;
  description: string;
  status: GoiTask["status"];
  priority: GoiTask["priority"];
  dueDate: string | null;
  assignee: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

const TASK_KEY_PREFIX = "GOI";
const COUNTER_ID = 1;

@Injectable()
export class GoiTaskService {
  constructor(
    @InjectRepository(GoiTask) private readonly tasks: Repository<GoiTask>,
    @InjectRepository(GoiTaskCounter)
    private readonly counters: Repository<GoiTaskCounter>,
    private readonly dataSource: DataSource,
  ) {}

  async list(query?: string): Promise<GoiTaskDto[]> {
    const q = query?.trim();
    const qb = this.tasks.createQueryBuilder("task").orderBy("task.updated_at", "DESC");

    if (q) {
      const like = `%${q}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("task.key ILIKE :like", { like })
            .orWhere("task.title ILIKE :like", { like })
            .orWhere("task.description ILIKE :like", { like })
            .orWhere("task.assignee ILIKE :like", { like });
        }),
      );
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.toDto(row));
  }

  async create(dto: CreateGoiTaskDto, createdBy?: string): Promise<GoiTaskDto> {
    const number = await this.allocateNumber();
    const row = this.tasks.create({
      number,
      key: `${TASK_KEY_PREFIX}-${number}`,
      title: dto.title.trim(),
      description: (dto.description ?? "").trim(),
      status: dto.status ?? "todo",
      priority: dto.priority ?? "medium",
      due_date: dto.dueDate ?? null,
      assignee: (dto.assignee ?? "").trim(),
      tags: (dto.tags ?? []).filter(Boolean),
      created_by: createdBy ?? null,
    });
    const saved = await this.tasks.save(row);
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateGoiTaskDto): Promise<GoiTaskDto> {
    const row = await this.tasks.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Task not found");

    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) row.description = dto.description.trim();
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.dueDate !== undefined) row.due_date = dto.dueDate;
    if (dto.assignee !== undefined) row.assignee = dto.assignee.trim();
    if (dto.tags !== undefined) row.tags = dto.tags.filter(Boolean);

    const saved = await this.tasks.save(row);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tasks.delete({ id });
    if (!result.affected) throw new NotFoundException("Task not found");
  }

  private async allocateNumber(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const counterRepo = manager.getRepository(GoiTaskCounter);
      let counter = await counterRepo.findOne({
        where: { id: COUNTER_ID },
        lock: { mode: "pessimistic_write" },
      });

      if (!counter) {
        const taskRepo = manager.getRepository(GoiTask);
        const max = await taskRepo
          .createQueryBuilder("task")
          .select("MAX(task.number)", "max")
          .getRawOne<{ max: string | null }>();
        const start = max?.max ? Number(max.max) + 1 : 1;
        counter = counterRepo.create({ id: COUNTER_ID, next_number: start });
        await counterRepo.save(counter);
      }

      const number = counter.next_number;
      counter.next_number += 1;
      await counterRepo.save(counter);
      return number;
    });
  }

  private toDto(row: GoiTask): GoiTaskDto {
    return {
      id: row.id,
      number: row.number,
      key: row.key,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      assignee: row.assignee,
      tags: row.tags ?? [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
