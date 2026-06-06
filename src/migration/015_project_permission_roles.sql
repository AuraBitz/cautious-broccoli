ALTER TABLE client_login_master
  ADD COLUMN IF NOT EXISTS project_role_id INTEGER REFERENCES project_role_master (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_login_project_role_id
  ON client_login_master (project_role_id);

ALTER TABLE project_permission_master
  DROP CONSTRAINT IF EXISTS project_permission_master_client_id_fkey;

DROP INDEX IF EXISTS idx_project_permission_client_id;

ALTER TABLE project_permission_master
  DROP COLUMN IF EXISTS client_id;

ALTER TABLE project_permission_master
  ADD COLUMN IF NOT EXISTS role_ids INTEGER[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_project_permission_role_ids
  ON project_permission_master USING GIN (role_ids);
