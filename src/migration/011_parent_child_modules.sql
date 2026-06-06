ALTER TABLE parent_modules_master
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES project_master (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parent_modules_project_id
  ON parent_modules_master (project_id);
CREATE INDEX IF NOT EXISTS idx_parent_modules_created_by
  ON parent_modules_master (created_by);

CREATE TABLE IF NOT EXISTS child_module_master (
  id SERIAL PRIMARY KEY,
  parent_module_id INTEGER NOT NULL REFERENCES parent_modules_master (id) ON DELETE CASCADE,
  child_module_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_child_module_parent_id
  ON child_module_master (parent_module_id);
CREATE INDEX IF NOT EXISTS idx_child_module_created_by
  ON child_module_master (created_by);
CREATE INDEX IF NOT EXISTS idx_child_module_created_at
  ON child_module_master (created_at);
