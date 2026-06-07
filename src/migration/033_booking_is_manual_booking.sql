ALTER TABLE restaurant_booking_master
  ADD COLUMN IF NOT EXISTS is_manual_booking BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE restaurant_booking_master rbm
SET is_manual_booking = TRUE
FROM restaurant_customer_management rcm
WHERE rbm.customer_id = rcm.id
  AND rcm.is_manual_booking = TRUE;

ALTER TABLE restaurant_customer_management
  DROP COLUMN IF EXISTS is_manual_booking;
