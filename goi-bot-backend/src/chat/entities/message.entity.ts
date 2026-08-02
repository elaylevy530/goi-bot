import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "messages" })
export class Message {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) conversation_id!: string;
  @Index() @Column({ type: "uuid" }) sender_user_id!: string;
  @Column({ type: "varchar", length: 32 }) sender_role!: string;
  @Column({ type: "text", nullable: true }) body!: string | null;
  @Column({ type: "text", nullable: true }) attachment_url!: string | null;
  @Column({ type: "varchar", length: 64, nullable: true }) attachment_kind!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) attachment_name!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) attachment_mime!: string | null;
  @Column({ type: "bigint", nullable: true }) attachment_size!: string | null;
  @Column({ type: "int", nullable: true }) duration_ms!: number | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
