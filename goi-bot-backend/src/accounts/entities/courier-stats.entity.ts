import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "courier_stats" })
export class CourierStats {
  @PrimaryColumn({ type: "uuid" }) courier_id!: string;
  @Column({ type: "int", default: 0 }) jobs_completed!: number;
  @Column({ type: "int", default: 0 }) jobs_cancelled!: number;
  @Column({ type: "int", default: 0 }) offers_total!: number;
  @Column({ type: "int", default: 0 }) offers_accepted!: number;
  @Column({ type: "int", default: 0 }) offers_declined!: number;
  @Column({ type: "int", default: 0 }) offers_no_response!: number;
  @Column({ type: "numeric", nullable: true }) acceptance_rate!: string | null;
  @Column({ type: "numeric", nullable: true }) on_time_rate!: string | null;
  @Column({ type: "numeric", nullable: true }) avg_rating!: string | null;
  @Column({ type: "numeric", nullable: true }) avg_response_seconds!: string | null;
  @Column({ type: "timestamptz", nullable: true }) last_active_at!: Date | null;
  @UpdateDateColumn({ type: "timestamptz" }) computed_at!: Date;
}
