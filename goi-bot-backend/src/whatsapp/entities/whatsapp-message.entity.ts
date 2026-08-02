import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "whatsapp_messages" })
export class WhatsappMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  phone!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 32, default: "outbound" })
  direction!: string;

  @Column({ type: "varchar", length: 32, default: "queued" })
  delivery_status!: string;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  customer_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  message_type!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  external_message_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  template_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  sent_by!: string | null;

  @Column({ type: "text", nullable: true })
  error_text!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  sent_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  delivered_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  read_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  failed_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  last_status_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
