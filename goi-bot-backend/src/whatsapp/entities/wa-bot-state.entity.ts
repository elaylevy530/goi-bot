import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "wa_bot_state" })
export class WaBotState {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  phone!: string;

  @Column({ type: "varchar", length: 64 })
  state!: string;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  customer_id!: string | null;

  @Column({ type: "jsonb", nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
