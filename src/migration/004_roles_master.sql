CREATE TABLE IF NOT EXISTS roles_master (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(255) NOT NULL,
  description TEXT,
  status master_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_master_status ON roles_master (status);
CREATE INDEX IF NOT EXISTS idx_roles_master_code ON roles_master (role_code);
