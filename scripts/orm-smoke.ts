import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { DataSource } from "typeorm";
import { venues } from "../drizzle/schema.js";
import { VenueEntity } from "../src/db/typeorm/Venue.entity.js";

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for ORM compatibility smoke testing");

const token = randomUUID();
const name = `ORM Compatibility ${token}`;
const prisma = new PrismaClient();
const pool = new Pool({ connectionString: url, max: 2 });
const db = drizzle(pool);
const typeorm = new DataSource({
  type: "postgres",
  url,
  entities: [VenueEntity],
  synchronize: false,
  migrationsRun: false,
});

let createdId: string | undefined;

try {
  await typeorm.initialize();

  // Write with Prisma.
  const created = await prisma.venue.create({
    data: {
      name,
      address: "Cross-ORM compatibility fixture",
      capacity: 111,
      contactEmail: `orm-${token}@example.com`,
    },
  });
  createdId = created.id;

  // Read the Prisma-created row with Drizzle.
  const drizzleRows = await db.select().from(venues).where(eq(venues.id, created.id));
  if (drizzleRows.length !== 1 || drizzleRows[0]?.name !== name) {
    throw new Error("Drizzle could not read the row created by Prisma");
  }

  // Update the same row with TypeORM.
  const repository = typeorm.getRepository(VenueEntity);
  const typeormVenue = await repository.findOneBy({ id: created.id });
  if (!typeormVenue) throw new Error("TypeORM could not read the row created by Prisma");
  typeormVenue.capacity = 222;
  await repository.save(typeormVenue);

  // Verify the TypeORM update with Prisma.
  const updated = await prisma.venue.findUnique({ where: { id: created.id } });
  if (!updated || updated.capacity !== 222) {
    throw new Error("Prisma could not observe the TypeORM update");
  }

  // Delete with Drizzle and verify deletion with Prisma.
  await db.delete(venues).where(eq(venues.id, created.id));
  const deleted = await prisma.venue.findUnique({ where: { id: created.id } });
  if (deleted !== null) throw new Error("Drizzle delete was not visible to Prisma");

  createdId = undefined;
  console.log("Prisma + Drizzle + TypeORM compatibility smoke test passed");
} finally {
  if (createdId) {
    await prisma.venue.deleteMany({ where: { id: createdId } }).catch(() => undefined);
  }
  if (typeorm.isInitialized) await typeorm.destroy();
  await pool.end();
  await prisma.$disconnect();
}
