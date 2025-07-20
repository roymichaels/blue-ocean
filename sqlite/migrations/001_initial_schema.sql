-- SQLite schema derived from Supabase migrations

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name_en TEXT,
  name_he TEXT
);

-- Subcategories table
CREATE TABLE subcategories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name_en TEXT,
  name_he TEXT
);

-- Pricing tiers table
CREATE TABLE pricing_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  discount REAL DEFAULT 0 CHECK(discount >= 0 AND discount <= 100),
  min_quantity INTEGER DEFAULT 1 CHECK(min_quantity > 0),
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name_en TEXT,
  name_he TEXT,
  description_en TEXT,
  description_he TEXT,
  price_per_unit REAL
);

-- Mix groups table
CREATE TABLE mix_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  conversion_factor REAL NOT NULL CHECK(conversion_factor > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  "originalPrice" REAL,
  description TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES categories(id),
  subcategory TEXT REFERENCES subcategories(id),
  images TEXT,
  videos TEXT,
  colors TEXT,
  rating REAL DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
  reviews INTEGER DEFAULT 0 CHECK(reviews >= 0),
  badges TEXT,
  pricing_tier TEXT REFERENCES pricing_tiers(id),
  stock INTEGER DEFAULT 0 CHECK(stock >= 0),
  mix_group_id TEXT REFERENCES mix_groups(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name_en TEXT,
  name_he TEXT,
  description_en TEXT,
  description_he TEXT
);

-- Chat rooms table
CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  last_message TEXT NOT NULL,
  last_message_time INTEGER NOT NULL,
  unread_count INTEGER DEFAULT 0 CHECK(unread_count >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  audio_uri TEXT,
  audio_duration INTEGER,
  reactions TEXT DEFAULT '{}'
);

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','driver','admin'))
);

-- User profiles table
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  matrix_user_id TEXT UNIQUE NOT NULL,
  app_username TEXT NOT NULL,
  email TEXT,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user','driver','admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  kyc_status TEXT DEFAULT 'none' CHECK(kyc_status IN ('none','pending','verified','rejected')),
  kyc_request_notes TEXT,
  kyc_requested_at DATETIME,
  kyc_approved_by TEXT,
  kyc_approved_at DATETIME,
  customer_tier TEXT DEFAULT 'new' CHECK(customer_tier IN ('new','regular','vip','banned'))
);

-- Notifications table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  comment TEXT,
  date DATETIME NOT NULL,
  helpful INTEGER DEFAULT 0 CHECK(helpful >= 0),
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  order_id TEXT
);

-- Hero banners table
CREATE TABLE hero_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  image TEXT NOT NULL,
  discount TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  title_en TEXT,
  title_he TEXT,
  subtitle_en TEXT,
  subtitle_he TEXT,
  discount_en TEXT,
  discount_he TEXT
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total REAL NOT NULL CHECK(total >= 0),
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  shipping_street TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT,
  shipping_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_image TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price REAL NOT NULL CHECK(price >= 0),
  selected_color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order tracking table
CREATE TABLE order_tracking (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed INTEGER DEFAULT 0
);

-- Price tier rules table
CREATE TABLE price_tier_rules (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK(min_qty >= 0),
  max_qty INTEGER NOT NULL CHECK(max_qty >= min_qty),
  price_per_unit REAL,
  discount_pct REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist items table
CREATE TABLE wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Delivery jobs table
CREATE TABLE delivery_jobs (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL,
  status TEXT NOT NULL,
  pickup_time DATETIME,
  dropoff_time DATETIME,
  proof_uri TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenant settings table
CREATE TABLE tenant_settings (
  tenant TEXT PRIMARY KEY,
  platform_name TEXT,
  platform_logo TEXT,
  theme_color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at columns
CREATE TRIGGER update_timestamp AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_user_profiles_timestamp AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_hero_banners_timestamp AFTER UPDATE ON hero_banners
BEGIN
  UPDATE hero_banners SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_orders_timestamp AFTER UPDATE ON orders
BEGIN
  UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_price_tier_rules_timestamp AFTER UPDATE ON price_tier_rules
BEGIN
  UPDATE price_tier_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_wishlist_items_timestamp AFTER UPDATE ON wishlist_items
BEGIN
  UPDATE wishlist_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_delivery_jobs_timestamp AFTER UPDATE ON delivery_jobs
BEGIN
  UPDATE delivery_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_tenant_settings_timestamp AFTER UPDATE ON tenant_settings
BEGIN
  UPDATE tenant_settings SET updated_at = CURRENT_TIMESTAMP WHERE tenant = NEW.tenant;
END;
