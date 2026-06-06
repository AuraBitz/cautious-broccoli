-- Restore role name column (default client) instead of role_id FK.

ALTER TABLE client_login_master
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'client';

UPDATE client_login_master cl
SET role = COALESCE(lower(rm.role_code), 'client')
FROM roles_master rm
WHERE cl.role_id = rm.id;

UPDATE client_login_master
SET role = 'client'
WHERE role IS NULL OR trim(role) = '';

ALTER TABLE client_login_master
  DROP CONSTRAINT IF EXISTS client_login_master_role_id_fkey;

DROP INDEX IF EXISTS idx_client_login_role_id;

ALTER TABLE client_login_master
  DROP COLUMN IF EXISTS role_id;

CREATE INDEX IF NOT EXISTS idx_client_login_master_role
  ON client_login_master (role);
