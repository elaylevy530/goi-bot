import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "customer_push_subscriptions" })
export class CustomerPushSubscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "text" })
  endpoint!: string;

  @Column({ type: "text" })
  auth!: string;

  @Column({ type: "text" })
  p256dh!: string;

  @Column({ type: "text", nullable: true })
  user_agent!: string | null;

  @Column({ type: "timestamptz" })
  last_used_at!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
