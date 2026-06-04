-- Separate company name from contact (owner_name)
ALTER TABLE client_management
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

UPDATE client_management
SET
  company_name = CASE
    WHEN position(' / ' IN owner_name) > 0 THEN trim(split_part(owner_name, ' / ', 1))
    ELSE trim(owner_name)
  END,
  owner_name = CASE
    WHEN position(' / ' IN owner_name) > 0 THEN NULLIF(trim(substring(owner_name FROM position(' / ' IN owner_name) + 3)), '')
    ELSE trim(owner_name)
  END
WHERE company_name IS NULL OR trim(company_name) = '';

CREATE INDEX IF NOT EXISTS idx_client_management_company_name
  ON client_management (company_name);
