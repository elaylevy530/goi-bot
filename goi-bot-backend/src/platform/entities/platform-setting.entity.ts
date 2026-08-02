import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "platform_settings" })
export class PlatformSetting {
  @PrimaryColumn({ type: "varchar", length: 128 })
  key!: string;

  @Column({ type: "jsonb", default: {} })
  value!: unknown;

  @Column({ type: "uuid", nullable: true })
  updated_by!: string | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
