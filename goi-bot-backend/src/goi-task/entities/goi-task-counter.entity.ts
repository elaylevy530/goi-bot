import { Column, Entity, PrimaryColumn } from "typeorm";

/** Single-row counter for GOI-XXX task numbers. Isolated from jobs numbering. */
@Entity({ name: "goi_task_counters" })
export class GoiTaskCounter {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "int", default: 1 })
  next_number!: number;
}
