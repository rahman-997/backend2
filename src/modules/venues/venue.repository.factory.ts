import { mysqlPool, postgresPool } from "../../config/database.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/HttpError.js";
import { MemoryVenueRepository } from "./memory.repository.js";
import { MySqlVenueRepository } from "./mysql.repository.js";
import { PostgresVenueRepository } from "./postgres.repository.js";
import type { VenueRepository } from "./venue.repository.js";

export const venueRepository: VenueRepository = (() => {
  switch (env.STORAGE) {
    case "postgres":
      if (!postgresPool) throw new HttpError(500, "PostgreSQL pool is not configured");
      return new PostgresVenueRepository(postgresPool);

    case "mysql":
      if (!mysqlPool) throw new HttpError(500, "MySQL pool is not configured");
      return new MySqlVenueRepository(mysqlPool);

    case "memory":
    default:
      return new MemoryVenueRepository();
  }
})();
