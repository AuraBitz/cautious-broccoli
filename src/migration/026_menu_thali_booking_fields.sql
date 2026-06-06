-- Thali cover image on menu master
ALTER TABLE restaurant_menu_master
  ADD COLUMN IF NOT EXISTS thali_image TEXT;

-- Booking denormalized customer + status
ALTER TABLE restaurant_booking_master
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS booking_status VARCHAR(50) NOT NULL DEFAULT 'pending';
