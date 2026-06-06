-- Restaurant customer transaction records
CREATE TABLE IF NOT EXISTS restaurant_transaction_master (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES restaurant_customer_management (id) ON DELETE CASCADE,
  account_number VARCHAR(100),
  bank_name VARCHAR(255),
  transaction_at TIMESTAMPTZ,
  transaction_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_transaction_customer
  ON restaurant_transaction_master (customer_id);

-- Restaurant orders
CREATE TABLE IF NOT EXISTS restaurant_order_management (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES restaurant_table_master (id) ON DELETE SET NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  menu_id INTEGER[] NOT NULL DEFAULT '{}',
  item_id INTEGER[] NOT NULL DEFAULT '{}',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  customer_transaction_id INTEGER REFERENCES restaurant_transaction_master (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_order_restaurant
  ON restaurant_order_management (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_table
  ON restaurant_order_management (table_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_customer_txn
  ON restaurant_order_management (customer_transaction_id);

-- Payments linked to orders and transactions
CREATE TABLE IF NOT EXISTS restaurant_payment_master (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES restaurant_order_management (id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES restaurant_transaction_master (id) ON DELETE SET NULL,
  is_cash_amount BOOLEAN NOT NULL DEFAULT FALSE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_payment_order
  ON restaurant_payment_master (order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_payment_transaction
  ON restaurant_payment_master (transaction_id);
