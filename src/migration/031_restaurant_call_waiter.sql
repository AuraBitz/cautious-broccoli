CREATE TABLE IF NOT EXISTS restaurant_call_waiter (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  floor_id INTEGER NOT NULL REFERENCES restaurant_floor_master (id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL REFERENCES restaurant_table_master (id) ON DELETE CASCADE,
  is_ring BOOLEAN NOT NULL DEFAULT TRUE,
  calling_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_call_waiter_restaurant
  ON restaurant_call_waiter (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_call_waiter_created_at
  ON restaurant_call_waiter (created_at DESC);
