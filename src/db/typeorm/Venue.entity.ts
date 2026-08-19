import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "venues" })
export class VenueEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  address!: string;

  @Column({ type: "integer" })
  capacity!: number;

  @Column({ name: "contact_email", type: "varchar", length: 320 })
  contactEmail!: string;

  @Column({ name: "owner_user_id", type: "uuid", nullable: true })
  ownerUserId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
