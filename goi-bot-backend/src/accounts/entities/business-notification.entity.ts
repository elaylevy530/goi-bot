import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "business_notifications" })
export class BusinessNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "text" })
  kind!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text", nullable: true })
  body!: string | null;

  @Column({ type: "text", nullable: true })
  link!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  read_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
