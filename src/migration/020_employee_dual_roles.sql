-- emp_role -> project_role_master (login / project_permission_master)
-- role_master_id -> roles_master (project Role Master assignment per project)

ALTER TABLE employee_master
  ADD COLUMN IF NOT EXISTS role_master_id INTEGER REFERENCES roles_master (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_master_role_master_id
  ON employee_master (role_master_id);

-- Preserve current roles_master assignment before reverting emp_role FK.
UPDATE employee_master em
SET role_master_id = em.emp_role
WHERE em.role_master_id IS NULL
  AND EXISTS (SELECT 1 FROM roles_master rm WHERE rm.id = em.emp_role);

ALTER TABLE employee_master
  DROP CONSTRAINT IF EXISTS employee_master_emp_role_fkey;

-- Project-scoped employees -> MANAGER project_role (id 2) when role_master links to project 2.
UPDATE employee_master em
SET emp_role = 2
FROM roles_master rm
WHERE em.role_master_id = rm.id
  AND EXISTS (
    SELECT 1 FROM project_role_master prm WHERE prm.id = 2
  )
  AND cardinality(COALESCE(rm.project_ids, '{}'::int[])) > 0;

-- Remaining rows -> Executive Director (overall access login role).
UPDATE employee_master em
SET emp_role = 1
WHERE NOT EXISTS (SELECT 1 FROM project_role_master prm WHERE prm.id = em.emp_role);

ALTER TABLE employee_master
  ADD CONSTRAINT employee_master_emp_role_fkey
  FOREIGN KEY (emp_role) REFERENCES project_role_master (id);
