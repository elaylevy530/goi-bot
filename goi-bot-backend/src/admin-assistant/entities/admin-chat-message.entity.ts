import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "admin_chat_messages" })
export class AdminChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  thread_id!: string;

  @Column({ type: "varchar", length: 32 })
  role!: string;

  @Column({ type: "jsonb" })
  parts!: unknown;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
