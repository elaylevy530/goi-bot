import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "classification_rules" })
export class ClassificationRule {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 255 }) description!: string;
  @Column({ type: "varchar", length: 64 }) field!: string;
  @Column({ type: "varchar", length: 32 }) operator!: string;
  @Column({ type: "varchar", length: 255 }) value!: string;
  @Index() @Column({ type: "uuid" }) tag_id!: string;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
