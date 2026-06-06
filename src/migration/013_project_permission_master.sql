CREATE TABLE IF NOT EXISTS project_permission_master (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES client_management (id) ON DELETE CASCADE,
  project_ids INTEGER[] NOT NULL DEFAULT '{}',
  overall_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_permission_client_id
  ON project_permission_master (client_id);
CREATE INDEX IF NOT EXISTS idx_project_permission_created_at
  ON project_permission_master (created_at);
CREATE INDEX IF NOT EXISTS idx_project_permission_project_ids
  ON project_permission_master USING GIN (project_ids);
