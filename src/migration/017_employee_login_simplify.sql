DROP INDEX IF EXISTS idx_employee_login_username;
DROP INDEX IF EXISTS idx_employee_login_email;

ALTER TABLE employee_login_master
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS email;
