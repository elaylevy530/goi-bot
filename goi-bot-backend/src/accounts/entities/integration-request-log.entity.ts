import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "integration_request_logs" })
export class IntegrationRequestLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "varchar", length: 32, default: "api" })
  source!: string;

  @Column({ type: "jsonb", nullable: true })
  payload!: unknown | null;

  @Column({ type: "varchar", length: 32, default: "ok" })
  status!: string;

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
