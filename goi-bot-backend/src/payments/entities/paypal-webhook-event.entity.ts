import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "paypal_webhook_events" })
export class PaypalWebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128 })
  event_id!: string;

  @Column({ type: "varchar", length: 128 })
  event_type!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  resource_type!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  resource_id!: string | null;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ type: "boolean", default: false })
  verified!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  processed_at!: Date | null;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  received_at!: Date;
}
