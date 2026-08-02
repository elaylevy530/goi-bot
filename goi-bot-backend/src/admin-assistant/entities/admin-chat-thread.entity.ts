import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "admin_chat_threads" })
export class AdminChatThread {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  owner_id!: string;

  @Column({ type: "varchar", length: 255, default: "New chat" })
  title!: string;

  @Column({ type: "timestamptz" })
  last_message_at!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
