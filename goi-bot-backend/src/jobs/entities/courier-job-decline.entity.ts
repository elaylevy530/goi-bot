import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "courier_job_declines" })
export class CourierJobDecline {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  courier_id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  @CreateDateColumn({ type: "timestamptz", name: "declined_at" })
  declined_at!: Date;
}
