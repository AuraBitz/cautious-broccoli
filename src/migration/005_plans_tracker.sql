CREATE TABLE IF NOT EXISTS plans_tracker (
  id SERIAL PRIMARY KEY,
  client_login_id INTEGER NOT NULL REFERENCES client_login_master (id) ON DELETE CASCADE,
  purchase_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan_id INTEGER NOT NULL REFERENCES plans_master (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_tracker_login_id ON plans_tracker (client_login_id);
CREATE INDEX IF NOT EXISTS idx_plans_tracker_purchase_at ON plans_tracker (purchase_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_tracker_login_purchase ON plans_tracker (client_login_id, purchase_at DESC);
