ALTER TABLE restaurant_customer_management
  ADD COLUMN IF NOT EXISTS is_manual_booking BOOLEAN NOT NULL DEFAULT FALSE;
