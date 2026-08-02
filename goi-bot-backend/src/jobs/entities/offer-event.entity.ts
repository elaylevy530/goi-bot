import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "offer_events" })
export class OfferEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  @Index()
  @Column({ type: "uuid" })
  courier_id!: string;

  @Column({ type: "varchar", length: 32, default: "push" })
  channel!: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  response!: string;

  @Column({ type: "timestamptz" })
  sent_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  expires_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  responded_at!: Date | null;

  @Column({ type: "text", nullable: true })
  decline_reason!: string | null;

  @Column({ type: "double precision", nullable: true })
  courier_lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  courier_lng!: number | null;

  @Column({ type: "numeric", nullable: true })
  distance_km!: string | null;

  @Column({ type: "numeric", nullable: true })
  match_score!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
