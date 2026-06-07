ALTER TABLE plans_master
  ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS range_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES project_master (id) ON DELETE SET NULL;

UPDATE plans_master pm
SET project_id = sub.pid
FROM (
  SELECT pm2.id AS plan_id, p.id AS pid
  FROM plans_master pm2
  JOIN project_master p ON pm2.id = ANY (COALESCE(p.plan_ids, '{}'))
) sub
WHERE pm.id = sub.plan_id
  AND pm.project_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_plans_master_project_id ON plans_master (project_id);
CREATE INDEX IF NOT EXISTS idx_plans_master_range_type ON plans_master (range_type);
