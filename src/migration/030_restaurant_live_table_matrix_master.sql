CREATE TABLE IF NOT EXISTS restaurant_live_table_matrix_master (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master(id) ON DELETE CASCADE,
  matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_restaurant_live_table_matrix_restaurant UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_live_table_matrix_restaurant
  ON restaurant_live_table_matrix_master (restaurant_id);
