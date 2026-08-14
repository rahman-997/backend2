CREATE TABLE IF NOT EXISTS venues (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address VARCHAR(2000) NOT NULL,
  capacity INT NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT venues_capacity_positive CHECK (capacity > 0)
);

CREATE INDEX venues_created_at_idx ON venues (created_at);
CREATE INDEX venues_capacity_idx ON venues (capacity);
