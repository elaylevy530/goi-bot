import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { PreviewPanel } from "../auth.types";

@Entity({ name: "admin_preview_sessions" })
export class AdminPreviewSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  admin_user_id!: string;

  @Column({ type: "varchar", length: 32 })
  panel!: PreviewPanel;

  @Column({ type: "uuid", nullable: true })
  courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  customer_id!: string | null;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  ended_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  started_at!: Date;
}
