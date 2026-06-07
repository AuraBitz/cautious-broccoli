CREATE TABLE IF NOT EXISTS restaurant_order_master (
  id SERIAL PRIMARY KEY,
  order_number INTEGER NOT NULL,
  customer_id INTEGER REFERENCES restaurant_customer_management (id) ON DELETE SET NULL,
  floor_id INTEGER REFERENCES restaurant_floor_master (id) ON DELETE SET NULL,
  table_id INTEGER REFERENCES restaurant_table_master (id) ON DELETE SET NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  order_items_id INTEGER[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'on_dine', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_restaurant_order_master_number UNIQUE (restaurant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_master_restaurant
  ON restaurant_order_master (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_master_customer
  ON restaurant_order_master (customer_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_master_table
  ON restaurant_order_master (table_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_master_status
  ON restaurant_order_master (status);
