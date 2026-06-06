CREATE TABLE IF NOT EXISTS employee_login_master (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_login_username
  ON employee_login_master (username);
CREATE INDEX IF NOT EXISTS idx_employee_login_email
  ON employee_login_master (email);

CREATE TABLE IF NOT EXISTS employee_master (
  id SERIAL PRIMARY KEY,
  emp_code VARCHAR(100) NOT NULL UNIQUE,
  employee_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  emp_role INTEGER NOT NULL REFERENCES project_role_master (id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  emp_login_id INTEGER UNIQUE REFERENCES employee_login_master (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_master_emp_code
  ON employee_master (emp_code);
CREATE INDEX IF NOT EXISTS idx_employee_master_emp_role
  ON employee_master (emp_role);
CREATE INDEX IF NOT EXISTS idx_employee_master_emp_login_id
  ON employee_master (emp_login_id);
CREATE INDEX IF NOT EXISTS idx_employee_master_status
  ON employee_master (status);
CREATE INDEX IF NOT EXISTS idx_employee_master_created_at
  ON employee_master (created_at);
