import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "notification_queue" })
export class NotificationQueueItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64 })
  channel!: string;

  @Column({ type: "varchar", length: 64 })
  message_type!: string;

  @Column({ type: "varchar", length: 64 })
  recipient_phone!: string;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  recipient_courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  recipient_business_id!: string | null;

  @Index()
  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "int", default: 5 })
  max_attempts!: number;

  @Column({ type: "timestamptz" })
  next_attempt_at!: Date;

  @Column({ type: "text", nullable: true })
  body!: string | null;

  @Column({ type: "jsonb", nullable: true })
  buttons!: unknown | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  provider!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  external_message_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  template_name!: string | null;

  @Column({ type: "jsonb", nullable: true })
  template_params!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  last_error!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  sent_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
