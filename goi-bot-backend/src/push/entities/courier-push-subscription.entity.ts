import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "courier_push_subscriptions" })
export class CourierPushSubscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  courier_id!: string;

  @Column({ type: "text" })
  endpoint!: string;

  @Column({ type: "text" })
  auth!: string;

  @Column({ type: "text" })
  p256dh!: string;

  @Column({ type: "text", nullable: true })
  user_agent!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  last_used_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
