CREATE TABLE IF NOT EXISTS payment_type_master (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL UNIQUE,
  status master_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_type_master_status ON payment_type_master (status);
CREATE INDEX IF NOT EXISTS idx_payment_type_master_type ON payment_type_master (type);
