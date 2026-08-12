import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "conversations" })
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32 })
  kind!:
    | "courier_support"
    | "business_support"
    | "courier_business"
    | "guest_support";

  @Index()
  @Column({ type: "uuid", nullable: true })
  courier_id!: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  business_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "text", nullable: true })
  subject!: string | null;

  @Column({ type: "timestamptz" })
  last_message_at!: Date;

  @Column({ type: "text", nullable: true })
  last_message_preview!: string | null;

  @Column({ type: "int", default: 0 })
  unread_courier!: number;

  @Column({ type: "int", default: 0 })
  unread_business!: number;

  @Column({ type: "int", default: 0 })
  unread_admin!: number;

  /** Unread messages for guest (tracking_token) side of guest_support threads. */
  @Column({ type: "int", default: 0 })
  unread_guest!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
