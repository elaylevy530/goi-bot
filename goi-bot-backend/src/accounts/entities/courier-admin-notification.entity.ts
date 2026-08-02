import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "courier_admin_notifications" })
export class CourierAdminNotification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid", nullable: true }) courier_id!: string | null;
  @Column({ type: "varchar", length: 32, default: "all" }) audience!: string;
  @Column({ type: "varchar", length: 255 }) title!: string;
  @Column({ type: "text", nullable: true }) body!: string | null;
  @Column({ type: "text", nullable: true }) link_url!: string | null;
  @Column({ type: "uuid", nullable: true }) sent_by!: string | null;
  @Column({ type: "timestamptz", nullable: true }) read_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
