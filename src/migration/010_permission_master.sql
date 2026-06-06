CREATE TABLE IF NOT EXISTS permission_master (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles_master (id) ON DELETE CASCADE,
  modules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_master_role_id
  ON permission_master (role_id);

CREATE INDEX IF NOT EXISTS idx_permission_master_created_at
  ON permission_master (created_at);

CREATE INDEX IF NOT EXISTS idx_permission_master_modules
  ON permission_master USING GIN (modules);
