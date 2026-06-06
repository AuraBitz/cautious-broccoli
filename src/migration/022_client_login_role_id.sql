-- client_login_master.role (varchar) -> role_id (FK roles_master)

INSERT INTO roles_master (role_code, role_name, status)
SELECT 'CLIENT', 'Client', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM roles_master WHERE lower(role_code) = 'client'
);

ALTER TABLE client_login_master
  ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles_master (id) ON DELETE RESTRICT;

UPDATE client_login_master cl
SET role_id = rm.id
FROM roles_master rm
WHERE cl.role_id IS NULL
  AND lower(rm.role_code) = lower(cl.role);

UPDATE client_login_master
SET role_id = (
  SELECT id FROM roles_master WHERE lower(role_code) = 'client' ORDER BY id LIMIT 1
)
WHERE role_id IS NULL;

ALTER TABLE client_login_master
  ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE client_login_master
  DROP COLUMN IF EXISTS role;

CREATE INDEX IF NOT EXISTS idx_client_login_role_id
  ON client_login_master (role_id);
