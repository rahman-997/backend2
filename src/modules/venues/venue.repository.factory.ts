import { env } from "../../config/env.js";
import { pool } from "../../config/database.js";
import { HttpError } from "../../errors/HttpError.js";
import { MemoryVenueRepository } from "./memory.repository.js";
import { PostgresVenueRepository } from "./postgres.repository.js";
import type { VenueRepository } from "./venue.repository.js";
export const venueRepository: VenueRepository = (() => { if (env.STORAGE === "postgres") { if (!pool) throw new HttpError(500, "DATABASE_URL is required for postgres storage"); return new PostgresVenueRepository(pool); } return new MemoryVenueRepository(); })();
