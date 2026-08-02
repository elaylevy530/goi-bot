import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "support_tickets" })
export class SupportTicket {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Index() @Column({ type: "uuid", nullable: true }) job_id!: string | null;
  @Column({ type: "varchar", length: 128 }) issue_type!: string;
  @Column({ type: "text" }) message!: string;
  @Column({ type: "varchar", length: 32, default: "open" }) status!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
