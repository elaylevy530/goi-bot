import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

@Entity({ name: "courier_tags" })
@Unique(["courier_id", "tag_id"])
export class CourierTag {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) courier_id!: string;
  @Index() @Column({ type: "uuid" }) tag_id!: string;
  @Column({ type: "boolean", default: false }) assigned_automatically!: boolean;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
