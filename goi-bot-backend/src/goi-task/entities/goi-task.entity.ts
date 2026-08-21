import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type GoiTaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done";

export type GoiTaskPriority = "low" | "medium" | "high" | "urgent";

@Entity({ name: "goi_tasks" })
export class GoiTask {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "int" })
  number!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  key!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Index()
  @Column({ type: "varchar", length: 32, default: "todo" })
  status!: GoiTaskStatus;

  @Column({ type: "varchar", length: 16, default: "medium" })
  priority!: GoiTaskPriority;

  @Column({ type: "date", nullable: true })
  due_date!: string | null;

  @Column({ type: "varchar", length: 128, default: "" })
  assignee!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  tags!: string[];

  @Column({ type: "uuid", nullable: true })
  created_by!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
