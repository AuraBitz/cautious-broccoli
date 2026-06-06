-- client_management.company_name -> restaurant_id (FK restaurant_master)

DROP INDEX IF EXISTS idx_client_management_company_name;

ALTER TABLE client_management
  ADD COLUMN IF NOT EXISTS restaurant_id INTEGER REFERENCES restaurant_master (id) ON DELETE SET NULL;

ALTER TABLE client_management
  DROP COLUMN IF EXISTS company_name;

CREATE INDEX IF NOT EXISTS idx_client_management_restaurant_id
  ON client_management (restaurant_id);
