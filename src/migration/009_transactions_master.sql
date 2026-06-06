CREATE TABLE IF NOT EXISTS transactions_master (
  id SERIAL PRIMARY KEY,
  payment_type_id INTEGER NOT NULL REFERENCES payment_type_master (id),
  account VARCHAR(255),
  project_id INTEGER REFERENCES project_master (id) ON DELETE SET NULL,
  number VARCHAR(50),
  transaction_no VARCHAR(100) NOT NULL,
  customer_id INTEGER REFERENCES client_management (id) ON DELETE SET NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  plan_id INTEGER REFERENCES plans_master (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_master_transaction_no
  ON transactions_master (transaction_no);

CREATE INDEX IF NOT EXISTS idx_transactions_master_payment_type_id
  ON transactions_master (payment_type_id);
CREATE INDEX IF NOT EXISTS idx_transactions_master_project_id
  ON transactions_master (project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_master_customer_id
  ON transactions_master (customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_master_plan_id
  ON transactions_master (plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_master_transaction_date
  ON transactions_master (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_master_created_at
  ON transactions_master (created_at);
