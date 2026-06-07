-- Upsert per restaurant+table: ring_count + JSON calling_text
ALTER TABLE restaurant_call_waiter
  ADD COLUMN IF NOT EXISTS ring_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE restaurant_call_waiter
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE restaurant_call_waiter
SET ring_count = 1
WHERE is_ring = TRUE AND ring_count = 0;

UPDATE restaurant_call_waiter
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE restaurant_call_waiter
  ALTER COLUMN calling_text DROP DEFAULT;

ALTER TABLE restaurant_call_waiter
  ALTER COLUMN calling_text TYPE JSONB
  USING (
    CASE
      WHEN calling_text IS NULL OR BTRIM(calling_text::text) = '' THEN '{}'::jsonb
      WHEN calling_text::text ~ '^[\[\{]' THEN calling_text::text::jsonb
      ELSE jsonb_build_object('1', calling_text::text)
    END
  );

ALTER TABLE restaurant_call_waiter
  ALTER COLUMN calling_text SET DEFAULT '{}'::jsonb;

-- One active row per restaurant + table
DELETE FROM restaurant_call_waiter a
USING restaurant_call_waiter b
WHERE a.restaurant_id = b.restaurant_id
  AND a.table_id = b.table_id
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_call_waiter_restaurant_table
  ON restaurant_call_waiter (restaurant_id, table_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_call_waiter_updated_at
  ON restaurant_call_waiter (updated_at DESC);
