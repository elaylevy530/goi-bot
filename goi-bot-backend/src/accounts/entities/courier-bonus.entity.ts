import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "courier_bonuses" })
export class CourierBonus {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 255 }) title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "numeric", default: 0 }) amount!: string;
  @Column({ type: "varchar", length: 32, default: "gift" }) icon!: string;
  @Column({ type: "varchar", length: 32, default: "primary" }) color!: string;
  @Column({ type: "boolean", default: true }) is_active!: boolean;
  @Column({ type: "int", default: 0 }) sort_order!: number;
  @Column({ type: "timestamptz", nullable: true }) starts_at!: Date | null;
  @Column({ type: "timestamptz", nullable: true }) ends_at!: Date | null;
  @Column({ type: "uuid", nullable: true }) created_by!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
