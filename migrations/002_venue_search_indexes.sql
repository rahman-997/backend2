CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS venues_name_trgm_idx
  ON venues USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS venues_address_trgm_idx
  ON venues USING GIN (address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS venues_name_sort_idx
  ON venues (name, id);

CREATE INDEX IF NOT EXISTS venues_address_sort_idx
  ON venues (address, id);
