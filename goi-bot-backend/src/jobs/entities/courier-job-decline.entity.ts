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

  /** Pay the courier skipped at. Same job can reappear only if the offer pay rises above this. */
  @Column({ type: "numeric", nullable: true })
  declined_price!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "declined_at" })
  declined_at!: Date;
}
