import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "status_logs" })
export class StatusLog {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) entity_id!: string;
  @Index() @Column({ type: "varchar", length: 64 }) entity_type!: string;
  @Column({ type: "varchar", length: 128, nullable: true }) old_status!: string | null;
  @Column({ type: "varchar", length: 128 }) new_status!: string;
  @Column({ type: "uuid", nullable: true }) changed_by!: string | null;
  @Column({ type: "text", nullable: true }) note!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
