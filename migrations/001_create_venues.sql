CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS venues (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, address TEXT NOT NULL, capacity INTEGER NOT NULL CHECK (capacity > 0), contact_email VARCHAR(320) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS venues_name_lower_unique ON venues (LOWER(name));
CREATE INDEX IF NOT EXISTS venues_created_at_idx ON venues (created_at DESC);
CREATE INDEX IF NOT EXISTS venues_capacity_idx ON venues (capacity);
