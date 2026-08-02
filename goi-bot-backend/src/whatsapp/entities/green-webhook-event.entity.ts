import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Provider-neutral inbound webhook log (Green API + normalized WhatsApp Cloud events). */
@Entity({ name: "green_api_webhook_events" })
export class GreenApiWebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128, nullable: true })
  external_message_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  type_webhook!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  type_message!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  sender_chat_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  sender_phone!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  button_id!: string | null;

  @Column({ type: "text", nullable: true })
  button_text!: string | null;

  @Column({ type: "jsonb" })
  raw_payload!: Record<string, unknown>;

  @Column({ type: "varchar", length: 32, default: "received" })
  processing_status!: string;

  @Column({ type: "text", nullable: true })
  processing_error!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  received_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  processed_at!: Date | null;
}
