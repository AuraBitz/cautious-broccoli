-- Employee role now references Role Master (roles_master), not project_role_master.
ALTER TABLE employee_master
  DROP CONSTRAINT IF EXISTS employee_master_emp_role_fkey;

-- Map by matching code / name where possible.
UPDATE employee_master em
SET emp_role = rm.id
FROM project_role_master prm
INNER JOIN roles_master rm
  ON lower(rm.role_code) = lower(prm.code)
  OR lower(rm.role_name) = lower(prm.role_name)
WHERE em.emp_role = prm.id;

-- Any remaining invalid role ids -> first Role Master row (stable fallback).
UPDATE employee_master em
SET emp_role = fallback.id
FROM (
  SELECT id
  FROM roles_master
  ORDER BY id
  LIMIT 1
) fallback
WHERE NOT EXISTS (
  SELECT 1 FROM roles_master rm WHERE rm.id = em.emp_role
);

ALTER TABLE employee_master
  ADD CONSTRAINT employee_master_emp_role_fkey
  FOREIGN KEY (emp_role) REFERENCES roles_master (id);
