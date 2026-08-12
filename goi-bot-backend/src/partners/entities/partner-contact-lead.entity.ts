import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Marketing contact leads from goi-partners (movers/couriers form). */
@Entity({ name: "partner_contact_leads" })
export class PartnerContactLead {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 32 })
  phone!: string;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "varchar", length: 40, default: "goi-partners" })
  source!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
