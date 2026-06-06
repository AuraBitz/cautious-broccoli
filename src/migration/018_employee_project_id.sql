ALTER TABLE employee_master
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES project_master (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_master_project_id
  ON employee_master (project_id);
