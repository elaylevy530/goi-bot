import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "business_favorite_couriers" })
@Unique(["business_id", "courier_id"])
export class BusinessFavoriteCourier {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Index() @Column({ type: "uuid" }) courier_id!: string;
  @Column({ type: "varchar", length: 32, default: "active" }) status!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
