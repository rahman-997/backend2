import "reflect-metadata";
import { DataSource } from "typeorm";
import { VenueEntity } from "../src/db/typeorm/Venue.entity.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for TypeORM validation");

const dataSource = new DataSource({
  type: "postgres",
  url,
  entities: [VenueEntity],
  synchronize: false,
  migrationsRun: false,
});

try {
  await dataSource.initialize();
  const metadata = dataSource.getMetadata(VenueEntity);
  if (metadata.tableName !== "venues") throw new Error("TypeORM schema mismatch: venues table");
  const required = new Set(["id", "name", "address", "capacity", "contactEmail", "createdAt", "updatedAt"]);
  for (const column of metadata.columns) {
    required.delete(column.propertyName);
  }
  if (required.size) throw new Error(`TypeORM schema mismatch: missing ${[...required].join(", ")}`);
  console.log("TypeORM schema validation passed");
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
