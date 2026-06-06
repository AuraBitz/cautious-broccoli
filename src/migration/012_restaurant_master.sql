DO $$ BEGIN
  CREATE TYPE restaurant_status_enum AS ENUM ('online', 'offline');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS restaurant_master (
  id SERIAL PRIMARY KEY,
  restaurant_name VARCHAR(255) NOT NULL,
  restaurant_address TEXT,
  restaurant_mobile VARCHAR(50),
  status restaurant_status_enum NOT NULL DEFAULT 'offline',
  project_id INTEGER REFERENCES project_master (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_restaurant_master_project_id
  ON restaurant_master (project_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_master_status
  ON restaurant_master (status);
CREATE INDEX IF NOT EXISTS idx_restaurant_master_created_at
  ON restaurant_master (created_at);
