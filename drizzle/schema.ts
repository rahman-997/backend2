import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  address: varchar("address", { length: 2000 }).notNull(),
  capacity: integer("capacity").notNull(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
