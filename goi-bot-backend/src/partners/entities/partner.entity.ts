import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "partners" })
export class Partner {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 60 })
  slug!: string;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "text", nullable: true })
  logo_url!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  contact_phone!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  whatsapp_group_id!: string | null;

  @Column({ type: "text", nullable: true })
  dispatch_note!: string | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  /** Per-section toggles for WhatsApp job message template. */
  @Column({ type: "jsonb", default: {} })
  message_sections!: Record<string, boolean>;

  @Column({ type: "text", nullable: true })
  message_cta!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
