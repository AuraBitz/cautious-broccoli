ALTER TABLE roles_master
  ADD COLUMN IF NOT EXISTS project_ids INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roles_master_created_by ON roles_master (created_by);
