DO $$ BEGIN
  CREATE TYPE master_status_enum AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS parent_modules_master (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(255) NOT NULL,
  status master_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sub_module_master (
  id SERIAL PRIMARY KEY,
  parent_module_id INTEGER NOT NULL REFERENCES parent_modules_master (id) ON DELETE CASCADE,
  sub_module_name VARCHAR(255) NOT NULL,
  status master_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans_master (
  id SERIAL PRIMARY KEY,
  plan_type VARCHAR(100) NOT NULL,
  plan_valid_days INTEGER NOT NULL DEFAULT 0,
  plan_modules_id INTEGER[] NOT NULL DEFAULT '{}',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS project_master (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_ids INTEGER[] NOT NULL DEFAULT '{}',
  project_start_at TIMESTAMPTZ,
  status master_status_enum NOT NULL DEFAULT 'active',
  module_ids INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_parent_modules_status ON parent_modules_master (status);
CREATE INDEX IF NOT EXISTS idx_sub_module_parent ON sub_module_master (parent_module_id);
CREATE INDEX IF NOT EXISTS idx_sub_module_status ON sub_module_master (status);
CREATE INDEX IF NOT EXISTS idx_plans_master_type ON plans_master (plan_type);
CREATE INDEX IF NOT EXISTS idx_project_master_status ON project_master (status);
