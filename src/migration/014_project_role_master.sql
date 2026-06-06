CREATE TABLE IF NOT EXISTS project_role_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  role_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_role_master_code
  ON project_role_master (code);
CREATE INDEX IF NOT EXISTS idx_project_role_master_status
  ON project_role_master (status);
CREATE INDEX IF NOT EXISTS idx_project_role_master_created_at
  ON project_role_master (created_at);
