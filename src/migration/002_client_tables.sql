DO $$ BEGIN
  CREATE TYPE plan_status_enum AS ENUM ('Active', 'Deactivate', 'Blocked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE login_status_enum AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_login_master (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id VARCHAR(255),
  status login_status_enum NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS client_management (
  id SERIAL PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  plan_id INTEGER,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id INTEGER,
  plan_start_at TIMESTAMPTZ,
  plan_remain_days INTEGER,
  plan_status plan_status_enum NOT NULL DEFAULT 'Active',
  login_id INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_client_management_plan_status ON client_management (plan_status);
CREATE INDEX IF NOT EXISTS idx_client_management_login_id ON client_management (login_id);
CREATE INDEX IF NOT EXISTS idx_client_management_created_at ON client_management (created_at);
CREATE INDEX IF NOT EXISTS idx_client_login_master_status ON client_login_master (status);
CREATE INDEX IF NOT EXISTS idx_client_login_master_username ON client_login_master (username);
