-- Restaurant menu (thali + JSON categories/items)
CREATE TABLE IF NOT EXISTS restaurant_menu_master (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  restaurant_thali_name VARCHAR(255) NOT NULL,
  menu_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_menu_restaurant
  ON restaurant_menu_master (restaurant_id);

-- Restaurant customers (per restaurant, not project client_management)
CREATE TABLE IF NOT EXISTS restaurant_customer_management (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  customer_login_id INTEGER REFERENCES client_login_master (id) ON DELETE SET NULL,
  is_not_login BOOLEAN NOT NULL DEFAULT TRUE,
  current_status VARCHAR(50) NOT NULL DEFAULT 'active',
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_customer_restaurant
  ON restaurant_customer_management (restaurant_id);

-- Floors
CREATE TABLE IF NOT EXISTS restaurant_floor_master (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  floor_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_floor_restaurant
  ON restaurant_floor_master (restaurant_id);

-- Tables
CREATE TABLE IF NOT EXISTS restaurant_table_master (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  floor_id INTEGER NOT NULL REFERENCES restaurant_floor_master (id) ON DELETE CASCADE,
  table_number VARCHAR(50) NOT NULL,
  chair_count INTEGER NOT NULL DEFAULT 0,
  booking_status VARCHAR(50) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_table_restaurant
  ON restaurant_table_master (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_table_floor
  ON restaurant_table_master (floor_id);

-- Bookings
CREATE TABLE IF NOT EXISTS restaurant_booking_master (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES restaurant_customer_management (id) ON DELETE SET NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_master (id) ON DELETE CASCADE,
  booking_time VARCHAR(20),
  booking_date DATE,
  persons_count INTEGER NOT NULL DEFAULT 1,
  table_id INTEGER REFERENCES restaurant_table_master (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_booking_restaurant
  ON restaurant_booking_master (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_booking_customer
  ON restaurant_booking_master (customer_id);
