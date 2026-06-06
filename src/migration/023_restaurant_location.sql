ALTER TABLE restaurant_master
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_restaurant_master_city
  ON restaurant_master (city);
