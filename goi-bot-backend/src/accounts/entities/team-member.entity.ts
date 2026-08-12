import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "team_members" })
export class TeamMember {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "uuid", nullable: true }) user_id!: string | null;
  @Column({ type: "varchar", length: 255 }) name!: string;
  @Column({ type: "varchar", length: 64, nullable: true }) phone!: string | null;
  @Column({ type: "varchar", length: 32, default: "viewer" }) role!: string;
  @Column({ type: "timestamptz", nullable: true }) invited_at!: Date | null;
  @Column({ type: "timestamptz", nullable: true }) accepted_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
