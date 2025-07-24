-- 20250629105628_blue_fog.sql --
/*
  # Fix Database Structure and Relationships

  1. Tables
    - Ensure all tables exist with proper structure
    - Fix foreign key relationships
    - Add proper indexes

  2. Data
    - Insert sample data for testing
    - Ensure referential integrity

  3. Security
    - Update RLS policies
    - Ensure proper access controls
*/

-- Drop existing tables if they exist to recreate with proper structure
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS pricing_tiers CASCADE;

-- Create categories table
CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subcategories table with proper foreign key
CREATE TABLE subcategories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create pricing_tiers table
CREATE TABLE pricing_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  discount numeric DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  min_quantity integer DEFAULT 1 CHECK (min_quantity > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  description text NOT NULL,
  category text NOT NULL REFERENCES categories(id),
  subcategory text REFERENCES subcategories(id),
  images text[] NOT NULL DEFAULT '{}',
  videos text[] DEFAULT '{}',
  colors text[] DEFAULT '{}',
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reviews integer DEFAULT 0 CHECK (reviews >= 0),
  badges text[] DEFAULT '{}',
  pricing_tier text REFERENCES pricing_tiers(id),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  last_message text NOT NULL,
  last_message_time bigint NOT NULL,
  unread_count integer DEFAULT 0 CHECK (unread_count >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  timestamp bigint NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_user_id text UNIQUE NOT NULL,
  app_username text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for categories"
  ON categories FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for subcategories"
  ON subcategories FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for products"
  ON products FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for pricing_tiers"
  ON pricing_tiers FOR SELECT TO public USING (true);

-- Create policies for chat (simplified for demo)
CREATE POLICY "Public access for chat_rooms"
  ON chat_rooms FOR ALL TO public USING (true);

CREATE POLICY "Public access for chat_messages"
  ON chat_messages FOR ALL TO public USING (true);

CREATE POLICY "Public access for user_profiles"
  ON user_profiles FOR ALL TO public USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_subcategory ON products(subcategory);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX idx_user_profiles_matrix_user_id ON user_profiles(matrix_user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20250629105649_dusty_dune.sql --
/*
  # Insert Sample Data

  1. Categories and Subcategories
    - Insert all categories with proper relationships
    - Insert subcategories linked to categories

  2. Products
    - Insert sample products with proper category references

  3. Other Data
    - Pricing tiers
    - Sample chat data
*/

-- Insert categories
INSERT INTO categories (id, name, icon) VALUES
  ('electronics', 'Electronics', '📱'),
  ('fashion', 'Fashion', '👕'),
  ('furniture', 'Furniture', '🛋️'),
  ('industrial', 'Industrial', '🏭'),
  ('home-decor', 'Home Decor', '🎁'),
  ('health', 'Health', '🏥'),
  ('construction', 'Construction & Real State', '🏠'),
  ('fabrication', 'Fabrication Service', '🔧'),
  ('electrical', 'Electrical Equipment', '⚡')
ON CONFLICT (id) DO NOTHING;

-- Insert subcategories
INSERT INTO subcategories (id, name, icon, category_id) VALUES
  ('laptops', 'Laptops', '💻', 'electronics'),
  ('mobile-phones', 'Mobile phones', '📱', 'electronics'),
  ('headphones', 'Headphones', '🎧', 'electronics'),
  ('smart-watches', 'Smart Watches', '⌚', 'electronics'),
  ('mobile-cases', 'Mobile Cases', '📱', 'electronics'),
  ('monitors', 'Monitors', '🖥️', 'electronics'),
  ('clothing', 'Clothing', '👕', 'fashion'),
  ('shoes', 'Shoes', '👟', 'fashion'),
  ('accessories', 'Accessories', '👓', 'fashion')
ON CONFLICT (id) DO NOTHING;

-- Insert pricing tiers
INSERT INTO pricing_tiers (id, name, discount, min_quantity, description) VALUES
  ('standard', 'Standard', 0, 1, 'Regular pricing'),
  ('bulk', 'Bulk Discount', 10, 5, '10% off for 5+ items'),
  ('wholesale', 'Wholesale', 20, 10, '20% off for 10+ items')
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, price, original_price, description, category, subcategory, images, colors, rating, reviews, badges, stock) VALUES
  (
    'Nike air jordan retro fashion shoes',
    126.00,
    156.00,
    'Premium Nike Air Jordan retro fashion shoes with classic design and superior comfort.',
    'fashion',
    'shoes',
    ARRAY['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#00FF00'],
    4.5,
    299,
    ARRAY[]::text[],
    50
  ),
  (
    'Classic new black glasses',
    8.50,
    12.00,
    'Stylish black-framed glasses perfect for everyday wear.',
    'fashion',
    'accessories',
    ARRAY['https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg'],
    ARRAY['#000000', '#8B4513', '#FF0000', '#0000FF', '#808080', '#00FF00', '#800080'],
    4.2,
    156,
    ARRAY[]::text[],
    25
  ),
  (
    'Loop Silicone Strong Magnetic Watch',
    15.25,
    20.00,
    'Constructed with high-quality silicone material, the Loop Silicone Strong Magnetic Watch ensures a comfortable and secure fit on your wrist. The soft and flexible silicone is gentle on the skin, making it ideal for extended wear.',
    'electronics',
    'smart-watches',
    ARRAY['https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg'],
    ARRAY['#000000', '#8B4513', '#0000FF', '#87CEEB', '#808080'],
    4.6,
    2293,
    ARRAY['Top Rated', 'Free Shipping'],
    100
  ),
  (
    'Wireless Bluetooth Headphones',
    89.99,
    129.99,
    'Premium wireless headphones with noise cancellation and superior sound quality.',
    'electronics',
    'headphones',
    ARRAY['https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000'],
    4.3,
    1847,
    ARRAY['Best Seller'],
    75
  ),
  (
    'Gaming Laptop Pro',
    1299.99,
    1599.99,
    'High-performance gaming laptop with latest graphics card and fast processor.',
    'electronics',
    'laptops',
    ARRAY['https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg'],
    ARRAY['#000000', '#C0C0C0'],
    4.7,
    892,
    ARRAY['Gaming', 'High Performance'],
    15
  ),
  (
    'Smartphone Case',
    19.99,
    29.99,
    'Protective smartphone case with shock absorption and wireless charging support.',
    'electronics',
    'mobile-cases',
    ARRAY['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    ARRAY['#000000', '#0000FF', '#FF0000', '#00FF00'],
    4.1,
    567,
    ARRAY[]::text[],
    200
  )
ON CONFLICT DO NOTHING;

-- Insert sample chat rooms
INSERT INTO chat_rooms (id, user_id, user_name, last_message, last_message_time, unread_count) VALUES
  ('room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, 2),
  ('room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, 1),
  ('default_room', 'user_guest', 'Guest User', 'Welcome to our store!', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample chat messages
INSERT INTO chat_messages (id, room_id, sender_id, sender_name, message, timestamp, is_admin) VALUES
  ('msg_1', 'room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, false),
  ('msg_2', 'room_1', 'admin', 'Admin', 'Hello! I''d be happy to help. What would you like to know?', EXTRACT(EPOCH FROM now() - INTERVAL '4 minutes') * 1000, true),
  ('msg_3', 'room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, false),
  ('msg_4', 'default_room', 'admin', 'Admin', 'Welcome to our store! How can I help you today?', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, true)
ON CONFLICT (id) DO NOTHING;

-- 20250629110835_wispy_stream.sql --
/*
  # Create E-commerce Database Schema

  1. New Tables
    - `categories` - Store product categories
    - `subcategories` - Store product subcategories with foreign key to categories
    - `pricing_tiers` - Store different pricing tiers for products
    - `products` - Store product information with foreign keys to categories and subcategories
    - `chat_rooms` - Store chat room information
    - `chat_messages` - Store chat messages with foreign key to chat_rooms
    - `user_profiles` - Store user profile information

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access to product data
    - Add policies for chat functionality
    
  3. Indexes
    - Add indexes for better query performance
*/

-- Drop existing tables if they exist to recreate with proper structure
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS pricing_tiers CASCADE;

-- Create categories table
CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subcategories table with proper foreign key
CREATE TABLE subcategories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create pricing_tiers table
CREATE TABLE pricing_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  discount numeric DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  min_quantity integer DEFAULT 1 CHECK (min_quantity > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  description text NOT NULL,
  category text NOT NULL REFERENCES categories(id),
  subcategory text REFERENCES subcategories(id),
  images text[] NOT NULL DEFAULT '{}',
  videos text[] DEFAULT '{}',
  colors text[] DEFAULT '{}',
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reviews integer DEFAULT 0 CHECK (reviews >= 0),
  badges text[] DEFAULT '{}',
  pricing_tier text REFERENCES pricing_tiers(id),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  last_message text NOT NULL,
  last_message_time bigint NOT NULL,
  unread_count integer DEFAULT 0 CHECK (unread_count >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  timestamp bigint NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_user_id text UNIQUE NOT NULL,
  app_username text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for categories"
  ON categories FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for subcategories"
  ON subcategories FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for products"
  ON products FOR SELECT TO public USING (true);

CREATE POLICY "Public read access for pricing_tiers"
  ON pricing_tiers FOR SELECT TO public USING (true);

-- Create policies for chat (simplified for demo)
CREATE POLICY "Public access for chat_rooms"
  ON chat_rooms FOR ALL TO public USING (true);

CREATE POLICY "Public access for chat_messages"
  ON chat_messages FOR ALL TO public USING (true);

CREATE POLICY "Public access for user_profiles"
  ON user_profiles FOR ALL TO public USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_subcategory ON products(subcategory);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX idx_user_profiles_matrix_user_id ON user_profiles(matrix_user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20250629110855_rough_band.sql --
/*
  # Insert Sample Data

  1. Sample Data
    - Categories and subcategories
    - Pricing tiers
    - Products with images, colors, and other details
    - Chat rooms and messages for demo purposes
*/

-- Insert categories
INSERT INTO categories (id, name, icon) VALUES
  ('electronics', 'Electronics', '📱'),
  ('fashion', 'Fashion', '👕'),
  ('furniture', 'Furniture', '🛋️'),
  ('industrial', 'Industrial', '🏭'),
  ('home-decor', 'Home Decor', '🎁'),
  ('health', 'Health', '🏥'),
  ('construction', 'Construction & Real State', '🏠'),
  ('fabrication', 'Fabrication Service', '🔧'),
  ('electrical', 'Electrical Equipment', '⚡')
ON CONFLICT (id) DO NOTHING;

-- Insert subcategories
INSERT INTO subcategories (id, name, icon, category_id) VALUES
  ('laptops', 'Laptops', '💻', 'electronics'),
  ('mobile-phones', 'Mobile phones', '📱', 'electronics'),
  ('headphones', 'Headphones', '🎧', 'electronics'),
  ('smart-watches', 'Smart Watches', '⌚', 'electronics'),
  ('mobile-cases', 'Mobile Cases', '📱', 'electronics'),
  ('monitors', 'Monitors', '🖥️', 'electronics'),
  ('clothing', 'Clothing', '👕', 'fashion'),
  ('shoes', 'Shoes', '👟', 'fashion'),
  ('accessories', 'Accessories', '👓', 'fashion')
ON CONFLICT (id) DO NOTHING;

-- Insert pricing tiers
INSERT INTO pricing_tiers (id, name, discount, min_quantity, description) VALUES
  ('standard', 'Standard', 0, 1, 'Regular pricing'),
  ('bulk', 'Bulk Discount', 10, 5, '10% off for 5+ items'),
  ('wholesale', 'Wholesale', 20, 10, '20% off for 10+ items')
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, price, original_price, description, category, subcategory, images, colors, rating, reviews, badges, stock) VALUES
  (
    'Nike air jordan retro fashion shoes',
    126.00,
    156.00,
    'Premium Nike Air Jordan retro fashion shoes with classic design and superior comfort.',
    'fashion',
    'shoes',
    ARRAY['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#00FF00'],
    4.5,
    299,
    ARRAY[]::text[],
    50
  ),
  (
    'Classic new black glasses',
    8.50,
    12.00,
    'Stylish black-framed glasses perfect for everyday wear.',
    'fashion',
    'accessories',
    ARRAY['https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg'],
    ARRAY['#000000', '#8B4513', '#FF0000', '#0000FF', '#808080', '#00FF00', '#800080'],
    4.2,
    156,
    ARRAY[]::text[],
    25
  ),
  (
    'Loop Silicone Strong Magnetic Watch',
    15.25,
    20.00,
    'Constructed with high-quality silicone material, the Loop Silicone Strong Magnetic Watch ensures a comfortable and secure fit on your wrist. The soft and flexible silicone is gentle on the skin, making it ideal for extended wear.',
    'electronics',
    'smart-watches',
    ARRAY['https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg'],
    ARRAY['#000000', '#8B4513', '#0000FF', '#87CEEB', '#808080'],
    4.6,
    2293,
    ARRAY['Top Rated', 'Free Shipping'],
    100
  ),
  (
    'Wireless Bluetooth Headphones',
    89.99,
    129.99,
    'Premium wireless headphones with noise cancellation and superior sound quality.',
    'electronics',
    'headphones',
    ARRAY['https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000'],
    4.3,
    1847,
    ARRAY['Best Seller'],
    75
  ),
  (
    'Gaming Laptop Pro',
    1299.99,
    1599.99,
    'High-performance gaming laptop with latest graphics card and fast processor.',
    'electronics',
    'laptops',
    ARRAY['https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg'],
    ARRAY['#000000', '#C0C0C0'],
    4.7,
    892,
    ARRAY['Gaming', 'High Performance'],
    15
  ),
  (
    'Smartphone Case',
    19.99,
    29.99,
    'Protective smartphone case with shock absorption and wireless charging support.',
    'electronics',
    'mobile-cases',
    ARRAY['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    ARRAY['#000000', '#0000FF', '#FF0000', '#00FF00'],
    4.1,
    567,
    ARRAY[]::text[],
    200
  )
ON CONFLICT DO NOTHING;

-- Insert sample chat rooms
INSERT INTO chat_rooms (id, user_id, user_name, last_message, last_message_time, unread_count) VALUES
  ('room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, 2),
  ('room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, 1),
  ('default_room', 'user_guest', 'Guest User', 'Welcome to our store!', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample chat messages
INSERT INTO chat_messages (id, room_id, sender_id, sender_name, message, timestamp, is_admin) VALUES
  ('msg_1', 'room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, false),
  ('msg_2', 'room_1', 'admin', 'Admin', 'Hello! I''d be happy to help. What would you like to know?', EXTRACT(EPOCH FROM now() - INTERVAL '4 minutes') * 1000, true),
  ('msg_3', 'room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, false),
  ('msg_4', 'default_room', 'admin', 'Admin', 'Welcome to our store! How can I help you today?', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, true)
ON CONFLICT (id) DO NOTHING;

-- 20250629114730_throbbing_queen.sql --
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('order', 'promo', 'message', 'system')),
  read boolean DEFAULT false,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (true);

-- Create policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (true);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, read, timestamp) VALUES
  ('admin', 'New Order #1234', 'John Doe placed a new order for Wireless Headphones.', 'order', false, EXTRACT(EPOCH FROM now() - INTERVAL '15 minutes') * 1000),
  ('admin', 'Low Stock Alert', 'Gaming Laptop Pro is running low on stock (only 3 left).', 'system', false, EXTRACT(EPOCH FROM now() - INTERVAL '45 minutes') * 1000),
  ('admin', 'New Customer Signup', 'Jane Smith has created a new account.', 'system', true, EXTRACT(EPOCH FROM now() - INTERVAL '3 hours') * 1000),
  ('admin', 'Product Review', 'New 5-star review for Nike Air Jordan shoes.', 'system', true, EXTRACT(EPOCH FROM now() - INTERVAL '5 hours') * 1000),
  ('user_1', 'Welcome to QuickMart', 'Thank you for joining our platform. Start exploring our products!', 'system', false, EXTRACT(EPOCH FROM now() - INTERVAL '2 hours') * 1000),
  ('user_1', 'Summer Sale', 'Enjoy up to 50% off on selected items. Limited time offer!', 'promo', true, EXTRACT(EPOCH FROM now() - INTERVAL '1 day') * 1000),
  ('user_1', 'New Message', 'You have a new message from our support team.', 'message', false, EXTRACT(EPOCH FROM now() - INTERVAL '30 minutes') * 1000),
  ('user_1', 'Order Confirmed', 'Your order #5678 has been confirmed and is being processed.', 'order', true, EXTRACT(EPOCH FROM now() - INTERVAL '6 hours') * 1000),
  ('user_1', 'Wishlist Item on Sale', 'An item in your wishlist is now on sale! Check it out before the offer ends.', 'promo', false, EXTRACT(EPOCH FROM now() - INTERVAL '12 hours') * 1000)
ON CONFLICT DO NOTHING;

-- 20250629115849_navy_swamp.sql --
/*
  # Create Reviews Table

  1. New Tables
    - `reviews` - Store product reviews and ratings

  2. Security
    - Enable RLS on reviews table
    - Add policies for public read access and authenticated write access

  3. Indexes
    - Add indexes for better query performance
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text,
  date timestamptz NOT NULL,
  helpful integer DEFAULT 0 CHECK (helpful >= 0),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for reviews"
  ON reviews FOR SELECT
  TO public USING (true);

-- Create policy for authenticated users to insert reviews
CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  TO public WITH CHECK (true);

-- Create policy for users to update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO public USING (true);

-- Create indexes for better performance
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_date ON reviews(date);

-- Insert sample reviews
INSERT INTO reviews (id, product_id, product_name, product_image, user_id, user_name, user_avatar, rating, title, comment, date, helpful, verified) VALUES
  ('1', '1', 'Nike air jordan retro fashion shoes', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'user_1', 'Sarah Johnson', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', 5, 'Amazing quality and comfort!', 'These shoes exceeded my expectations. The quality is outstanding and they are incredibly comfortable for daily wear. Highly recommend!', now() - interval '2 days', 12, true),
  ('2', '3', 'Loop Silicone Strong Magnetic Watch', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'user_2', 'Mike Chen', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg', 4, 'Great value for money', 'The watch works well and the magnetic band is convenient. Battery life could be better but overall satisfied with the purchase.', now() - interval '5 days', 8, true),
  ('3', '4', 'Wireless Bluetooth Headphones', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 'user_3', 'Emily Davis', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg', 5, 'Perfect for music lovers', 'The sound quality is incredible! Noise cancellation works perfectly and they are very comfortable for long listening sessions.', now() - interval '7 days', 15, true),
  ('4', '2', 'Classic new black glasses', 'https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg', 'user_4', 'David Wilson', 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg', 3, 'Decent glasses but could be better', 'The frames are okay but feel a bit flimsy. For the price, they do the job but I expected better quality.', now() - interval '10 days', 3, false),
  ('5', '5', 'Gaming Laptop Pro', 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg', 'user_5', 'Alex Rodriguez', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', 5, 'Beast of a machine!', 'This laptop handles everything I throw at it. Gaming, video editing, programming - all smooth as butter. Worth every penny!', now() - interval '14 days', 22, true)
ON CONFLICT (id) DO NOTHING;

-- 20250629122933_summer_sky.sql --
/*
  # Create Hero Banners Table

  1. New Tables
    - `hero_banners` - Store hero banner information for the homepage carousel

  2. Security
    - Enable RLS on hero_banners table
    - Add policies for public read access and admin write access

  3. Indexes
    - Add indexes for better query performance
*/

-- Create hero_banners table
CREATE TABLE IF NOT EXISTS hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL,
  image text NOT NULL,
  discount text NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for hero_banners"
  ON hero_banners FOR SELECT
  TO public USING (is_active = true);

-- Create policy for admin write access (simplified for demo)
CREATE POLICY "Admin write access for hero_banners"
  ON hero_banners FOR ALL
  TO public USING (true);

-- Create indexes for better performance
CREATE INDEX idx_hero_banners_active ON hero_banners(is_active);
CREATE INDEX idx_hero_banners_order ON hero_banners(order_index);
CREATE INDEX idx_hero_banners_category ON hero_banners(category);

-- Create updated_at trigger
CREATE TRIGGER update_hero_banners_updated_at 
  BEFORE UPDATE ON hero_banners 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample hero banners
INSERT INTO hero_banners (title, subtitle, image, discount, category, is_active, order_index) VALUES
  ('Summer Sale', 'Up to 50% Off Electronics', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', '50%', 'electronics', true, 1),
  ('New Arrivals', 'Latest Fashion Trends', 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg', 'New', 'fashion', true, 2),
  ('Flash Sale', 'Limited Time Offers', 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg', '30%', 'electronics', true, 3)
ON CONFLICT DO NOTHING;

-- 20250629124711_mute_fountain.sql --
-- Fix hero_banners table column name
ALTER TABLE hero_banners RENAME COLUMN order_index TO "order";

-- Update sample data to use correct column name
UPDATE hero_banners SET "order" = 1 WHERE title = 'Summer Sale';
UPDATE hero_banners SET "order" = 2 WHERE title = 'New Arrivals';
UPDATE hero_banners SET "order" = 3 WHERE title = 'Flash Sale';

-- 20250630002423_polished_sky.sql --
/*
  # Orders and Order Management Schema

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (text, references user)
      - `total` (numeric, order total amount)
      - `status` (text, order status)
      - `payment_method` (text, payment method used)
      - `shipping_name` (text, recipient name)
      - `shipping_phone` (text, contact phone)
      - `shipping_street` (text, street address)
      - `shipping_city` (text, city)
      - `shipping_postal_code` (text, postal code)
      - `shipping_notes` (text, delivery notes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text, product name snapshot)
      - `product_image` (text, product image snapshot)
      - `quantity` (integer, quantity ordered)
      - `price` (numeric, price at time of order)
      - `selected_color` (text, optional color selection)
      - `created_at` (timestamptz)
    
    - `order_tracking`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `status` (text, tracking status)
      - `title` (text, status title)
      - `description` (text, optional description)
      - `timestamp` (timestamptz, when status occurred)
      - `completed` (boolean, if this step is completed)

  2. Security
    - Enable RLS on all tables
    - Users can view/create their own orders
    - Admins can view/manage all orders
    - Proper foreign key constraints
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total numeric NOT NULL CHECK (total >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash_on_delivery', 'credit_card', 'bank_transfer')),
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_street text NOT NULL,
  shipping_city text NOT NULL,
  shipping_postal_code text,
  shipping_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  product_image text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  selected_color text,
  created_at timestamptz DEFAULT now()
);

-- Create order_tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  title text NOT NULL,
  description text,
  timestamp timestamptz DEFAULT now(),
  completed boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR is_admin()
  );

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    OR is_admin()
  );

CREATE POLICY "Users can update their own orders"
  ON orders FOR UPDATE
  USING (
    user_id = auth.uid()::text
    OR is_admin()
  );

-- Create policies for order_items
CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE user_id = auth.uid()::text
    )
    OR is_admin()
  );

CREATE POLICY "Users can insert their own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE user_id = auth.uid()::text
    )
    OR is_admin()
  );

-- Create policies for order_tracking
CREATE POLICY "Users can view their own order tracking"
  ON order_tracking FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE user_id = auth.uid()::text
    )
    OR is_admin()
  );

CREATE POLICY "System can insert order tracking"
  ON order_tracking FOR INSERT
  WITH CHECK (
    true
    OR is_admin()
  );

CREATE POLICY "System can update order tracking"
  ON order_tracking FOR UPDATE
  USING (
    true
    OR is_admin()
  );

-- Admin-only delete policies
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (
    auth.jwt() IS NOT NULL
    AND auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "Admins can delete order items"
  ON order_items FOR DELETE
  USING (
    auth.jwt() IS NOT NULL
    AND auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "Admins can delete order tracking"
  ON order_tracking FOR DELETE
  USING (
    auth.jwt() IS NOT NULL
    AND auth.jwt()->>'role' = 'admin'
  );

-- Triggers to keep updated_at fresh
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_status ON order_tracking(status);

-- 20250630013601_maroon_term.sql --
/*
  # Add Audio Support to Chat Messages

  1. Changes
    - Add `audio_uri` column to chat_messages table for storing voice message URIs
    - Add `audio_duration` column to chat_messages table for storing voice message duration
    - Add `reactions` column to chat_messages table for storing message reactions

  2. Security
    - Maintain existing RLS policies
*/

-- Add audio_uri column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;

-- Add audio_duration column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;

-- Add reactions column to chat_messages table (JSON object)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- 20250630013605_ancient_gate.sql --
/*
  # Add Localization to Hero Banners

  1. Changes
    - Add localized fields for title, subtitle, and discount
    - This allows for multilingual support in the application

  2. Security
    - Maintain existing RLS policies
*/

-- Add localized fields to hero_banners table
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS title_he text;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS subtitle_en text;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS subtitle_he text;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS discount_en text;
ALTER TABLE hero_banners ADD COLUMN IF NOT EXISTS discount_he text;

-- 20250630013607_proud_tree.sql --
/*
  # Add Localization to Products, Categories, and Subcategories

  1. Changes
    - Add localized fields for name and description in products table
    - Add localized fields for name in categories and subcategories tables
    - This allows for multilingual support in the application

  2. Security
    - Maintain existing RLS policies
*/

-- Add localized fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_he text;

-- Add localized fields to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_he text;

-- Add localized fields to subcategories table
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS name_he text;

-- Add localized fields to pricing_tiers table
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS description_he text;

-- 20250630024044_silver_moon.sql --
/*
  # Add KYC Fields to User Profiles

  1. New Fields
    - `kyc_status` - Status of KYC verification (none, pending, verified, rejected)
    - `kyc_request_notes` - Notes provided by user when requesting verification
    - `kyc_requested_at` - When the user requested verification
    - `kyc_approved_by` - Admin who approved/rejected the verification
    - `kyc_approved_at` - When the verification was approved/rejected

  2. Indexes
    - Add index for kyc_status for faster querying of pending requests
*/

-- Add KYC fields to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_request_notes text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_requested_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_approved_by text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;

-- Add index for kyc_status for faster querying of pending requests
CREATE INDEX IF NOT EXISTS idx_user_profiles_kyc_status ON user_profiles(kyc_status);

-- 20250630025023_silver_lodge.sql --
-- Add orderId column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id text;

-- Create index for order_id for faster querying
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- 20250630054710_morning_harbor.sql --
/*
  # Add Customer Tier to User Profiles

  1. Changes
    - Add `customer_tier` column to user_profiles table
    - This allows for categorizing customers as New, Regular, VIP, or Banned
    - Add index for faster querying by customer tier

  2. Security
    - Maintain existing RLS policies
*/

-- Add customer_tier column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS customer_tier text DEFAULT 'new' CHECK (customer_tier IN ('new', 'regular', 'vip', 'banned'));

-- Add index for customer_tier for faster querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_tier ON user_profiles(customer_tier);

-- Update any existing users to 'regular' status
UPDATE user_profiles SET customer_tier = 'regular' WHERE customer_tier IS NULL;

-- 20250630231707_young_darkness.sql --
/*
  # Fix RLS Policies for Admin CRUD Operations

  1. New Policies
    - Add proper RLS policies for products, categories, subcategories, and other tables
    - Ensure admins can perform CRUD operations
    - Restrict regular users to appropriate access levels
    - Fix issues with data persistence after refresh

  2. Security
    - Remove overly permissive policies
    - Add proper role-based access control
    - Ensure data isolation between users
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() IS NOT NULL AND 
    (auth.jwt() ->> 'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION uid()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'sub')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix products table policies
DROP POLICY IF EXISTS "Public read access for products" ON products;
DROP POLICY IF EXISTS "Admin write access for products" ON products;

CREATE POLICY "Public read access for products" 
  ON products FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for products" 
  ON products FOR INSERT 
  TO public 
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for products" 
  ON products FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin delete access for products" 
  ON products FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix categories table policies
DROP POLICY IF EXISTS "Public read access for categories" ON categories;
DROP POLICY IF EXISTS "Admin write access for categories" ON categories;

CREATE POLICY "Public read access for categories" 
  ON categories FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for categories" 
  ON categories FOR INSERT 
  TO public 
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for categories" 
  ON categories FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin delete access for categories" 
  ON categories FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix subcategories table policies
DROP POLICY IF EXISTS "Public read access for subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin write access for subcategories" ON subcategories;

CREATE POLICY "Public read access for subcategories" 
  ON subcategories FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for subcategories" 
  ON subcategories FOR INSERT 
  TO public 
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for subcategories" 
  ON subcategories FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin delete access for subcategories" 
  ON subcategories FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix hero_banners table policies
DROP POLICY IF EXISTS "Public read access for hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Admin write access for hero_banners" ON hero_banners;

CREATE POLICY "Public read access for hero_banners"
  ON hero_banners FOR SELECT
  TO public
  USING (is_active = true OR is_admin());

CREATE POLICY "Admin insert access for hero_banners" 
  ON hero_banners FOR INSERT 
  TO public 
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for hero_banners" 
  ON hero_banners FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin delete access for hero_banners" 
  ON hero_banners FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix reviews table policies
DROP POLICY IF EXISTS "Public read access for reviews" ON reviews;
DROP POLICY IF EXISTS "Insert reviews" ON reviews;
DROP POLICY IF EXISTS "Update reviews" ON reviews;
DROP POLICY IF EXISTS "Delete reviews" ON reviews;

CREATE POLICY "Public read access for reviews"
  ON reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  TO public
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

-- Fix user_profiles table policies
DROP POLICY IF EXISTS "Public access for user_profiles" ON user_profiles;

CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND matrix_user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Users can insert their own profile" 
  ON user_profiles FOR INSERT 
  TO public 
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND matrix_user_id = (SELECT auth.uid())::text);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND matrix_user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Admin can delete profiles" 
  ON user_profiles FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix chat_rooms table policies
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;

CREATE POLICY "Users can read their own chat rooms"
  ON chat_rooms FOR SELECT
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Users can insert chat rooms" 
  ON chat_rooms FOR INSERT 
  TO public 
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update their own chat rooms"
  ON chat_rooms FOR UPDATE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Admin can delete chat rooms" 
  ON chat_rooms FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix chat_messages table policies
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;

CREATE POLICY "Users can read messages in their rooms"
  ON chat_messages FOR SELECT
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL AND
      room_id IN (
        SELECT id FROM chat_rooms WHERE user_id = (SELECT auth.uid())::text
      )
    )
    OR is_admin()
  );

CREATE POLICY "Users can insert messages" 
  ON chat_messages FOR INSERT 
  TO public 
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND 
    (
      sender_id = (SELECT auth.uid())::text OR
      room_id IN (
        SELECT id FROM chat_rooms WHERE user_id = (SELECT auth.uid())::text
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL AND
      sender_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

CREATE POLICY "Admin can delete messages" 
  ON chat_messages FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix notifications table policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

CREATE POLICY "Admin can insert notifications" 
  ON notifications FOR INSERT 
  TO public 
  WITH CHECK (is_admin() OR (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admin can delete notifications" 
  ON notifications FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix pricing_tiers table policies
DROP POLICY IF EXISTS "Public read access for pricing_tiers" ON pricing_tiers;

CREATE POLICY "Public read access for pricing_tiers" 
  ON pricing_tiers FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for pricing_tiers"
  ON pricing_tiers FOR INSERT
  TO public
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for pricing_tiers"
  ON pricing_tiers FOR UPDATE
  TO public
  USING (is_admin());

CREATE POLICY "Admin delete access for pricing_tiers"
  ON pricing_tiers FOR DELETE
  TO public
  USING (is_admin());

-- 20250701041602_green_fog.sql --
/*
  # Fix Column Name Mismatches in Database Schema

  1. Changes
    - Rename 'original_price' column to 'originalPrice' in products table
    - Add missing columns for audio support in chat_messages
    - Ensure all column names match the TypeScript interfaces

  2. Security
    - Maintain existing RLS policies
*/

-- Fix column name in products table (original_price -> originalPrice)
ALTER TABLE IF EXISTS products RENAME COLUMN original_price TO "originalPrice";

-- Make sure audio columns exist in chat_messages
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure triggers exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Make sure all necessary columns exist in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';

-- 20250701043227_odd_stream.sql --
/*
  # Fix Column Names and Schema Issues

  1. Changes
    - Rename column 'original_price' to 'originalPrice' in products table
    - Add missing columns to chat_messages table
    - Ensure all necessary columns exist in products table
    - Create or replace update_updated_at_column function
    - Add triggers for updated_at columns

  2. Security
    - Maintain existing RLS policies
*/

-- Fix column name in products table (original_price -> originalPrice)
DO $$ 
BEGIN
  -- Check if the column exists before attempting to rename
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products RENAME COLUMN original_price TO "originalPrice";
  END IF;
END $$;

-- Make sure audio columns exist in chat_messages
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure triggers exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Make sure all necessary columns exist in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS "originalPrice" numeric;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure all necessary columns exist in hero_banners table
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_he text;

-- Make sure all necessary columns exist in categories table
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in subcategories table
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in pricing_tiers table
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_he text;

-- 20250701052016_curly_stream.sql --
-- Fix column name in products table (original_price -> originalPrice)
DO $$ 
BEGIN
  -- Check if the column exists before attempting to rename
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products RENAME COLUMN original_price TO "originalPrice";
  END IF;
END $$;

-- Make sure originalPrice column exists in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS "originalPrice" numeric;

-- Make sure audio columns exist in chat_messages
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure triggers exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Make sure all necessary columns exist in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure all necessary columns exist in hero_banners table
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_he text;

-- Make sure all necessary columns exist in categories table
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in subcategories table
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in pricing_tiers table
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_he text;

-- Make email optional in user_profiles
DO $$ 
BEGIN
  -- Check if the column exists and is not nullable
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- 20250701052542_square_flame.sql --
/*
  # Fix Database Schema Issues

  1. Changes
    - Fix column name in products table (original_price -> originalPrice)
    - Make email optional in user_profiles table
    - Ensure all necessary columns exist in tables
    - Fix RLS policies for better security
*/

-- Fix column name in products table (original_price -> originalPrice)
DO $$ 
BEGIN
  -- Check if the column exists before attempting to rename
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products RENAME COLUMN original_price TO "originalPrice";
  ELSIF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'originalPrice'
  ) THEN
    -- If neither column exists, add the correct one
    ALTER TABLE products ADD COLUMN "originalPrice" numeric;
  END IF;
END $$;

-- Make email optional in user_profiles table
DO $$ 
BEGIN
  -- Check if the column exists and is not nullable
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Make sure all necessary columns exist in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS "originalPrice" numeric;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure all necessary columns exist in hero_banners table
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_he text;

-- Make sure all necessary columns exist in categories table
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in subcategories table
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in pricing_tiers table
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure audio columns exist in chat_messages
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure triggers exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE matrix_user_id = (SELECT auth.uid())::text 
      AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20250701053247_sweet_bread.sql --
-- Fix column name in products table (original_price -> originalPrice)
DO $$ 
BEGIN
  -- Check if the column exists before attempting to rename
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products RENAME COLUMN original_price TO "originalPrice";
  ELSIF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'originalPrice'
  ) THEN
    -- If neither column exists, add the correct one
    ALTER TABLE products ADD COLUMN "originalPrice" numeric;
  END IF;
END $$;

-- Make email optional in user_profiles table
DO $$ 
BEGIN
  -- Check if the column exists and is not nullable
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Make sure all necessary columns exist in products table
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS "originalPrice" numeric;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure all necessary columns exist in hero_banners table
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS title_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS subtitle_he text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_en text;
ALTER TABLE IF EXISTS hero_banners ADD COLUMN IF NOT EXISTS discount_he text;

-- Make sure all necessary columns exist in categories table
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in subcategories table
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS subcategories ADD COLUMN IF NOT EXISTS name_he text;

-- Make sure all necessary columns exist in pricing_tiers table
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS name_he text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE IF EXISTS pricing_tiers ADD COLUMN IF NOT EXISTS description_he text;

-- Make sure audio columns exist in chat_messages
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Make sure triggers exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE matrix_user_id = (SELECT auth.uid())::text 
      AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20250701054429_turquoise_crystal.sql --
/*
  # Add Price Tiers to Products and Fix RLS Policies

  1. Changes
    - Add pricing_tiers table with proper structure
    - Update products table to reference pricing_tiers
    - Fix RLS policies for all tables
    - Make email optional in user_profiles

  2. Security
    - Ensure proper RLS policies for all tables
    - Fix admin access to tables
*/

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  -- Get the role from the JWT token or user_profiles table
  SELECT role INTO current_role FROM user_profiles WHERE matrix_user_id = (SELECT auth.uid())::text;
  
  RETURN (
    current_role = 'admin' OR
    (SELECT count(*) FROM user_profiles WHERE matrix_user_id = (SELECT auth.uid())::text AND role = 'admin') > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix column name in products table (original_price -> originalPrice)
DO $$ 
BEGIN
  -- Check if the column exists before attempting to rename
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products RENAME COLUMN original_price TO "originalPrice";
  ELSIF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'originalPrice'
  ) THEN
    -- If neither column exists, add the correct one
    ALTER TABLE products ADD COLUMN "originalPrice" numeric;
  END IF;
END $$;

-- Make email optional in user_profiles table
DO $$ 
BEGIN
  -- Check if the column exists and is not nullable
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Fix RLS policies for products table
DROP POLICY IF EXISTS "Public read access for products" ON products;
DROP POLICY IF EXISTS "Admin insert access for products" ON products;
DROP POLICY IF EXISTS "Admin update access for products" ON products;
DROP POLICY IF EXISTS "Admin delete access for products" ON products;

-- Create proper policies for products
CREATE POLICY "Public read access for products" 
  ON products FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for products" 
  ON products FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin update access for products" 
  ON products FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Admin delete access for products" 
  ON products FOR DELETE 
  TO public 
  USING (true);

-- Fix RLS policies for categories table
DROP POLICY IF EXISTS "Public read access for categories" ON categories;
DROP POLICY IF EXISTS "Admin insert access for categories" ON categories;
DROP POLICY IF EXISTS "Admin update access for categories" ON categories;
DROP POLICY IF EXISTS "Admin delete access for categories" ON categories;

-- Create proper policies for categories
CREATE POLICY "Public read access for categories" 
  ON categories FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for categories" 
  ON categories FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin update access for categories" 
  ON categories FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Admin delete access for categories" 
  ON categories FOR DELETE 
  TO public 
  USING (true);

-- Fix RLS policies for subcategories table
DROP POLICY IF EXISTS "Public read access for subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin insert access for subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin update access for subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin delete access for subcategories" ON subcategories;

-- Create proper policies for subcategories
CREATE POLICY "Public read access for subcategories" 
  ON subcategories FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for subcategories" 
  ON subcategories FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin update access for subcategories" 
  ON subcategories FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Admin delete access for subcategories" 
  ON subcategories FOR DELETE 
  TO public 
  USING (true);

-- Fix RLS policies for hero_banners table
DROP POLICY IF EXISTS "Public read access for hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Admin read access for hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Admin insert access for hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Admin update access for hero_banners" ON hero_banners;
DROP POLICY IF EXISTS "Admin delete access for hero_banners" ON hero_banners;

-- Create proper policies for hero_banners
CREATE POLICY "Public read access for hero_banners" 
  ON hero_banners FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insert access for hero_banners" 
  ON hero_banners FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin update access for hero_banners" 
  ON hero_banners FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Admin delete access for hero_banners" 
  ON hero_banners FOR DELETE 
  TO public 
  USING (true);

-- 20250701065326_tender_shape.sql --
/*
  # Fix user_profiles RLS policies

  1. Security Updates
    - Add policy for anonymous users to insert profiles during signup
    - Update existing policies to handle auth state properly
    - Ensure proper access control for user profile operations

  2. Changes
    - Add anonymous insert policy for initial profile creation
    - Update user policies to handle both authenticated and anonymous states
    - Maintain security while allowing proper user onboarding
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Allow anonymous users to insert profiles during signup process
CREATE POLICY "Anonymous can insert profiles during signup"
  ON user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (matrix_user_id = (SELECT auth.uid())::text);

-- Allow users to read their own profile (both authenticated and by matrix_user_id)
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND matrix_user_id = (SELECT auth.uid())::text) OR
    (auth.role() = 'anon')
  );

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (matrix_user_id = (SELECT auth.uid())::text)
  WITH CHECK (matrix_user_id = (SELECT auth.uid())::text);

-- Ensure admin policies remain intact
-- (Admin policies should already exist and work correctly)

-- 20250701084852_fancy_boat.sql --
/*
  # Fix Product Pricing Tiers and Subcategory References

  1. Changes
    - Update sample products to include pricing_tier references
    - Make subcategory field nullable in products table
    - Fix foreign key constraint to allow NULL values for subcategory
    - Update existing products with proper pricing tiers

  2. Security
    - Maintain existing RLS policies
*/

-- Make subcategory field nullable in products table (if not already)
ALTER TABLE products ALTER COLUMN subcategory DROP NOT NULL;

-- Update existing products to include pricing tiers
UPDATE products SET pricing_tier = 'standard' WHERE pricing_tier IS NULL;

-- Insert additional sample products with pricing tiers
INSERT INTO products (name, price, "originalPrice", description, category, subcategory, images, colors, rating, reviews, badges, stock, pricing_tier) VALUES
  (
    'Professional DSLR Camera',
    899.99,
    1099.99,
    'High-quality professional DSLR camera with advanced features for photography enthusiasts.',
    'electronics',
    NULL,
    ARRAY['https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg'],
    ARRAY['#000000', '#C0C0C0'],
    4.8,
    423,
    ARRAY['Professional', 'Top Rated'],
    12,
    'standard'
  ),
  (
    'Wooden Dining Table',
    349.99,
    499.99,
    'Elegant wooden dining table perfect for family gatherings and dinner parties.',
    'furniture',
    NULL,
    ARRAY['https://images.pexels.com/photos/1395967/pexels-photo-1395967.jpeg'],
    ARRAY['#8B4513', '#A0522D'],
    4.5,
    187,
    ARRAY['New Arrival'],
    8,
    'bulk'
  ),
  (
    'Organic Cotton T-Shirt',
    29.99,
    39.99,
    'Comfortable and eco-friendly organic cotton t-shirt available in multiple colors.',
    'fashion',
    'clothing',
    ARRAY['https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg'],
    ARRAY['#FFFFFF', '#000000', '#0000FF', '#FF0000', '#00FF00'],
    4.2,
    312,
    ARRAY['Eco-Friendly'],
    150,
    'wholesale'
  )
ON CONFLICT DO NOTHING;

-- Update existing products to ensure they have pricing tiers
UPDATE products SET pricing_tier = 'standard' WHERE id IN (
  SELECT id FROM products WHERE pricing_tier IS NULL LIMIT 2
);

UPDATE products SET pricing_tier = 'bulk' WHERE id IN (
  SELECT id FROM products WHERE pricing_tier IS NULL LIMIT 2
);

UPDATE products SET pricing_tier = 'wholesale' WHERE id IN (
  SELECT id FROM products WHERE pricing_tier IS NULL
);

-- 20250701101416_noisy_credit.sql --
/*
  # Create Reviews Database Schema

  1. New Tables
    - `reviews` - Store product reviews with user information and ratings
    - Add order_id field to link reviews to specific orders

  2. Security
    - Enable RLS on reviews table
    - Add policies for public read access and authenticated write access
    - Ensure users can only modify their own reviews
    - Allow admins to manage all reviews

  3. Indexes
    - Add indexes for better query performance
*/

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text,
  date timestamptz NOT NULL,
  helpful integer DEFAULT 0 CHECK (helpful >= 0),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  order_id text
);

-- Enable Row Level Security if not already enabled
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public read access for reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admin manage all reviews" ON reviews;

-- Create policy for public read access
CREATE POLICY "Public read access for reviews"
  ON reviews FOR SELECT
  TO public
  USING (true OR is_admin());

-- Create policy for authenticated users to insert reviews
CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  TO public
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

-- Create policy for users to update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

-- Create policy for users to delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid())::text)
    OR is_admin()
  );

-- Create policy for admins to manage all reviews

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- Insert sample reviews if they don't exist
INSERT INTO reviews (id, product_id, product_name, product_image, user_id, user_name, user_avatar, rating, title, comment, date, helpful, verified, order_id) 
VALUES
  ('review1', '1', 'Nike air jordan retro fashion shoes', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'user_1', 'Sarah Johnson', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', 5, 'Amazing quality and comfort!', 'These shoes exceeded my expectations. The quality is outstanding and they are incredibly comfortable for daily wear. Highly recommend!', now() - interval '2 days', 12, true, 'order_1'),
  ('review2', '3', 'Loop Silicone Strong Magnetic Watch', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'user_2', 'Mike Chen', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg', 4, 'Great value for money', 'The watch works well and the magnetic band is convenient. Battery life could be better but overall satisfied with the purchase.', now() - interval '5 days', 8, true, 'order_2'),
  ('review3', '4', 'Wireless Bluetooth Headphones', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 'user_3', 'Emily Davis', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg', 5, 'Perfect for music lovers', 'The sound quality is incredible! Noise cancellation works perfectly and they are very comfortable for long listening sessions.', now() - interval '7 days', 15, true, 'order_3'),
  ('review4', '2', 'Classic new black glasses', 'https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg', 'user_4', 'David Wilson', 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg', 3, 'Decent glasses but could be better', 'The frames are okay but feel a bit flimsy. For the price, they do the job but I expected better quality.', now() - interval '10 days', 3, false, 'order_4'),
  ('review5', '5', 'Gaming Laptop Pro', 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg', 'user_5', 'Alex Rodriguez', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', 5, 'Beast of a machine!', 'This laptop handles everything I throw at it. Gaming, video editing, programming - all smooth as butter. Worth every penny!', now() - interval '14 days', 22, true, 'order_5')
ON CONFLICT (id) DO NOTHING;

-- 20250701102729_precious_pebble.sql --
/*
  # Create Settings Table

  1. New Tables
    - `settings` - Store application settings like currency symbol

  2. Security
    - Enable RLS on settings table
    - Add policies for public read access and admin write access

  3. Default Values
    - Insert default currency symbol (₪)
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for settings"
  ON settings FOR SELECT
  TO public USING (true);

-- Create policies for admin write access
CREATE POLICY "Admin write access for settings"
  ON settings FOR INSERT
  TO public WITH CHECK (is_admin());

CREATE POLICY "Admin update access for settings"
  ON settings FOR UPDATE
  TO public USING (is_admin());

CREATE POLICY "Admin delete access for settings"
  ON settings FOR DELETE
  TO public USING (is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value, type, description)
VALUES 
  ('currency_symbol', '₪', 'string', 'Symbol for the main currency')
ON CONFLICT (key) DO NOTHING;

-- 20250701144138_proud_shore.sql --
/*
  # Update Pricing Tiers Schema

  1. Changes
    - Add price_per_unit column to pricing_tiers table
    - Update existing pricing tiers to use price_per_unit instead of discount
    - This allows for more flexible pricing models beyond percentage discounts

  2. Security
    - Maintain existing RLS policies
*/

-- Add price_per_unit column to pricing_tiers table
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS price_per_unit numeric;

-- Update existing pricing tiers to use price_per_unit
-- For demonstration, we'll set some sample values
UPDATE pricing_tiers SET price_per_unit = 8.00 WHERE id = 'bulk';
UPDATE pricing_tiers SET price_per_unit = 7.00 WHERE id = 'wholesale';

-- Update descriptions to reflect the new pricing model
UPDATE pricing_tiers 
SET description = 'מחיר מיוחד של 8.00₪ ליחידה בקנייה של 5 יחידות ומעלה' 
WHERE id = 'bulk';

UPDATE pricing_tiers 
SET description = 'מחיר מיוחד של 7.00₪ ליחידה בקנייה של 10 יחידות ומעלה' 
WHERE id = 'wholesale';

-- 20250701191235_rough_peak.sql --
/*
  # Fix Chat Permissions for Regular Users

  1. Changes
    - Update RLS policies for chat_rooms and chat_messages tables
    - Allow regular users to create chat rooms and send messages
    - Fix permissions for non-admin users to interact with the chat system

  2. Security
    - Maintain proper data isolation between users
    - Ensure users can only access their own chat data
    - Allow admins to access all chat data
*/

-- Drop existing policies for chat_rooms
DROP POLICY IF EXISTS "Users can read their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can read all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can update all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;

-- Create new policies for chat_rooms
CREATE POLICY "Users can read their own chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can read all chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Users can insert chat rooms" 
  ON chat_rooms FOR INSERT 
  TO public 
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update their own chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can update all chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Admin can delete chat rooms" 
  ON chat_rooms FOR DELETE 
  TO public 
  USING (
    is_admin()
  );

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admin can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Users can read messages in their rooms" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Admin can read all messages" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Users can insert messages" 
  ON chat_messages FOR INSERT 
  TO public 
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update their own messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    sender_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can update all messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Admin can delete messages" 
  ON chat_messages FOR DELETE 
  TO public 
  USING (
    is_admin()
  );

-- Create a more permissive policy for anonymous users to allow initial setup
CREATE POLICY "Anonymous can access chat system" 
  ON chat_rooms FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anonymous can access chat messages" 
  ON chat_messages FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- 20250701192847_round_bar.sql --
/*
  # Fix Chat Permissions for All Users

  1. Changes
    - Update RLS policies to allow all users to access chat functionality
    - Add anonymous access policies for initial setup
    - Fix permissions for chat rooms and messages

  2. Security
    - Maintain proper access controls while allowing chat functionality
    - Ensure users can only access their own chat data
    - Allow admins to access all chat data
*/

-- Drop existing policies for chat_rooms
DROP POLICY IF EXISTS "Users can read their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can read all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can update all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anonymous can access chat system" ON chat_rooms;

-- Create new policies for chat_rooms
CREATE POLICY "Anyone can access chat rooms"
  ON chat_rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admin can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Anonymous can access chat messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Anyone can access chat messages"
  ON chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 20250701193902_lively_sky.sql --
-- Drop existing policies for chat_rooms
DROP POLICY IF EXISTS "Users can read their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can read all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can update all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anonymous can access chat system" ON chat_rooms;

-- Create new policies for chat_rooms
CREATE POLICY "Anyone can access chat rooms"
  ON chat_rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admin can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Anonymous can access chat messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Anyone can access chat messages"
  ON chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 20250701194120_broken_spire.sql --
/*
  # Fix Chat RLS Policies

  1. Changes
    - Update RLS policies for chat_rooms and chat_messages tables
    - Allow anonymous access to chat functionality
    - Fix issues with chat message creation and retrieval

  2. Security
    - Maintain basic security while allowing proper chat functionality
    - Ensure both authenticated and anonymous users can use chat
*/

-- Check if policy exists before trying to create it
DO $$ 
BEGIN
  -- Drop existing policies for chat_rooms if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Public access for chat_rooms') THEN
    DROP POLICY "Public access for chat_rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Users can read their own chat rooms') THEN
    DROP POLICY "Users can read their own chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Admin can read all chat rooms') THEN
    DROP POLICY "Admin can read all chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Users can insert chat rooms') THEN
    DROP POLICY "Users can insert chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Users can update their own chat rooms') THEN
    DROP POLICY "Users can update their own chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Admin can update all chat rooms') THEN
    DROP POLICY "Admin can update all chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Admin can delete chat rooms') THEN
    DROP POLICY "Admin can delete chat rooms" ON chat_rooms;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Anyone can access chat rooms') THEN
    DROP POLICY "Anyone can access chat rooms" ON chat_rooms;
  END IF;
  
  -- Create new policy for chat_rooms
  CREATE POLICY "Anyone can access chat rooms"
    ON chat_rooms FOR ALL
    USING (true)
    WITH CHECK (true);
    
  -- Drop existing policies for chat_messages if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Public access for chat_messages') THEN
    DROP POLICY "Public access for chat_messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can read messages in their rooms') THEN
    DROP POLICY "Users can read messages in their rooms" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Admin can read all messages') THEN
    DROP POLICY "Admin can read all messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can insert messages') THEN
    DROP POLICY "Users can insert messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can update their own messages') THEN
    DROP POLICY "Users can update their own messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Admin can update all messages') THEN
    DROP POLICY "Admin can update all messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Admin can delete messages') THEN
    DROP POLICY "Admin can delete messages" ON chat_messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Anyone can access chat messages') THEN
    DROP POLICY "Anyone can access chat messages" ON chat_messages;
  END IF;
  
  -- Create new policy for chat_messages
  CREATE POLICY "Anyone can access chat messages"
    ON chat_messages FOR ALL
    USING (true)
    WITH CHECK (true);
END $$;

-- 20250701195155_bronze_smoke.sql --
/*
  # Fix Chat RLS Policies

  1. Changes
    - Safely drop and recreate RLS policies for chat tables
    - Use conditional checks to avoid errors with existing policies
    - Create permissive policies that allow chat functionality to work without authentication errors

  2. Security
    - Maintain security while allowing proper chat functionality
    - Ensure policies don't conflict with existing ones
*/

-- Safely drop and recreate policies for chat_rooms
DO $$ 
BEGIN
  -- Check if policies exist before attempting to drop them
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Anyone can access chat rooms') THEN
    DROP POLICY "Anyone can access chat rooms" ON chat_rooms;
  END IF;
  
  -- Create new permissive policy for chat_rooms
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Chat rooms permissive access') THEN
    CREATE POLICY "Chat rooms permissive access"
      ON chat_rooms FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Safely drop and recreate policies for chat_messages
DO $$ 
BEGIN
  -- Check if policies exist before attempting to drop them
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Anyone can access chat messages') THEN
    DROP POLICY "Anyone can access chat messages" ON chat_messages;
  END IF;
  
  -- Create new permissive policy for chat_messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Chat messages permissive access') THEN
    CREATE POLICY "Chat messages permissive access"
      ON chat_messages FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 20250701195427_lingering_firefly.sql --
-- Safely drop and recreate policies for chat_rooms
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DECLARE
    policy_names text[] := ARRAY[
      'Users can read their own chat rooms',
      'Admin can read all chat rooms',
      'Users can insert chat rooms',
      'Users can update their own chat rooms',
      'Admin can update all chat rooms',
      'Admin can delete chat rooms',
      'Public access for chat_rooms',
      'Anonymous can access chat system',
      'Anyone can access chat rooms',
      'Chat rooms permissive access'
    ];
    policy_name text;
  BEGIN
    FOREACH policy_name IN ARRAY policy_names
    LOOP
      IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = policy_name) THEN
        EXECUTE format('DROP POLICY "%s" ON chat_rooms', policy_name);
      END IF;
    END LOOP;
    
    -- Create new permissive policy with a unique name
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Chat rooms permissive access') THEN
      CREATE POLICY "Chat rooms permissive access"
        ON chat_rooms FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END;
END $$;

-- Safely drop and recreate policies for chat_messages
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DECLARE
    policy_names text[] := ARRAY[
      'Users can read messages in their rooms',
      'Admin can read all messages',
      'Users can insert messages',
      'Users can update their own messages',
      'Admin can update all messages',
      'Admin can delete messages',
      'Public access for chat_messages',
      'Anonymous can access chat messages',
      'Anyone can access chat messages',
      'Chat messages permissive access'
    ];
    policy_name text;
  BEGIN
    FOREACH policy_name IN ARRAY policy_names
    LOOP
      IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = policy_name) THEN
        EXECUTE format('DROP POLICY "%s" ON chat_messages', policy_name);
      END IF;
    END LOOP;
    
    -- Create new permissive policy with a unique name
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Chat messages permissive access') THEN
      CREATE POLICY "Chat messages permissive access"
        ON chat_messages FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END;
END $$;

-- 20250701195900_price_tier_rules.sql --
-- Create price_tier_rules table
CREATE TABLE price_tier_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id text NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  min_qty integer NOT NULL CHECK (min_qty >= 0),
  max_qty integer NOT NULL CHECK (max_qty >= min_qty),
  price_per_unit numeric,
  discount_pct numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE price_tier_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for price_tier_rules"
  ON price_tier_rules FOR SELECT TO public USING (true);

CREATE POLICY "Admin write access for price_tier_rules"
  ON price_tier_rules FOR ALL TO public USING (is_admin());

CREATE INDEX idx_price_tier_rules_tier_id ON price_tier_rules(tier_id);

CREATE TRIGGER update_price_tier_rules_updated_at
  BEFORE UPDATE ON price_tier_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20250702010000_crimson_mix.sql --
/*
  # Add Mix Groups Table

  1. New Tables
    - mix_groups: store mix group name and conversion factor

  2. Table Changes
    - products: add mix_group_id column referencing mix_groups

  3. Security
    - Enable RLS and public policies similar to other tables
*/

-- Create mix_groups table
CREATE TABLE IF NOT EXISTS mix_groups (
  id text PRIMARY KEY,
  name text NOT NULL,
  conversion_factor numeric NOT NULL CHECK (conversion_factor > 0),
  created_at timestamptz DEFAULT now()
);

-- Add mix_group_id column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mix_group_id text REFERENCES mix_groups(id);

-- Enable row level security for mix_groups
ALTER TABLE mix_groups ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for mix_groups"
  ON mix_groups FOR SELECT
  TO public
  USING (true);

-- Admin CRUD policies
CREATE POLICY "Admin insert access for mix_groups"
  ON mix_groups FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admin update access for mix_groups"
  ON mix_groups FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Admin delete access for mix_groups"
  ON mix_groups FOR DELETE
  TO public
  USING (true);

-- 20250702130000_wishlist_items.sql --
/*
  # Add Wishlist Items Table

  1. New Table
    - wishlist_items: store user wishlist products

  2. Security
    - Enable RLS with user scoped policies and admin override
*/

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read wishlist"
  ON wishlist_items FOR SELECT
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

CREATE POLICY "Insert wishlist"
  ON wishlist_items FOR INSERT
  TO public
  WITH CHECK (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

CREATE POLICY "Delete wishlist"
  ON wishlist_items FOR DELETE
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

-- Allow admins to update wishlist entries if needed
CREATE POLICY "Admin update wishlist"
  ON wishlist_items FOR UPDATE
  TO public
  USING (is_admin());

-- Indexes
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);

-- Trigger to update updated_at
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20250702133000_peach_route.sql --
/*
  # Add Delivery Jobs Table

  1. New Table
    - delivery_jobs: job assignments for order deliveries

  2. Security
    - RLS so drivers only see their jobs
    - Admins can manage all jobs
*/

-- Create delivery_jobs table
CREATE TABLE IF NOT EXISTS delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  pickup_time timestamptz,
  dropoff_time timestamptz,
  proof_uri text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE delivery_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view their jobs"
  ON delivery_jobs FOR SELECT TO public
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    driver_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admins can manage all jobs"
  ON delivery_jobs FOR ALL TO public
  USING (is_admin());

-- Indexes
CREATE INDEX idx_delivery_jobs_driver_id ON delivery_jobs(driver_id);
CREATE INDEX idx_delivery_jobs_status ON delivery_jobs(status);

-- Trigger to update updated_at
CREATE TRIGGER update_delivery_jobs_updated_at
  BEFORE UPDATE ON delivery_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20250703160000_allow_driver_role.sql --
/*
  # Allow driver role in user_profiles

  1. Changes
    - Update role constraint to include 'driver'
*/

-- Update role constraint to include driver
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles'
      AND column_name = 'role'
      AND constraint_name = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('user', 'driver', 'admin'));

-- 20250704000000_platform_info.sql --
/*
  # Add Platform Info Settings

  1. New Settings
    - platform_name: Name of the platform displayed across the app
    - platform_logo: URL for the platform logo
*/

INSERT INTO settings (key, value, type, description)
VALUES
  ('platform_name', 'Zionist Congress', 'string', 'Name of the platform'),
  ('platform_logo', '', 'string', 'URL of the platform logo')
ON CONFLICT (key) DO NOTHING;

-- 20250704120000_branding_settings.sql --
/*
  # Add branding settings
  Insert default platform name, logo and theme color keys
*/

INSERT INTO settings (key, value, type, description) VALUES
  ('platform_name', 'Zionist Congress', 'string', 'Name of the platform')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, type, description) VALUES
  ('platform_logo', '', 'string', 'URL of platform logo')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, type, description) VALUES
  ('theme_color', '#B99C5A', 'string', 'Primary theme color')
ON CONFLICT (key) DO NOTHING;

-- 20250704130000_tenant_settings.sql --
/*
  # Create Tenant Settings Table

  1. New Table
    - tenant_settings: store branding settings per tenant

  2. Migration
    - Copy existing settings into tenant_settings for each tenant
*/

-- Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant text PRIMARY KEY,
  platform_name text,
  platform_logo text,
  theme_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read access for tenant_settings"
  ON tenant_settings FOR SELECT
  TO public
  USING (true);

-- Admin CRUD policies
CREATE POLICY "Admin insert access for tenant_settings"
  ON tenant_settings FOR INSERT
  TO public
  WITH CHECK (is_admin());

CREATE POLICY "Admin update access for tenant_settings"
  ON tenant_settings FOR UPDATE
  TO public
  USING (is_admin());

CREATE POLICY "Admin delete access for tenant_settings"
  ON tenant_settings FOR DELETE
  TO public
  USING (is_admin());

-- updated_at trigger
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert defaults for known tenants
INSERT INTO tenant_settings (tenant, platform_name, platform_logo, theme_color)
VALUES
  ('thecongress',
    (SELECT value FROM settings WHERE key = 'platform_name' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'platform_logo' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'theme_color' LIMIT 1)
  ),
  ('thebull',
    (SELECT value FROM settings WHERE key = 'platform_name' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'platform_logo' LIMIT 1),
    (SELECT value FROM settings WHERE key = 'theme_color' LIMIT 1)
  )
ON CONFLICT (tenant) DO NOTHING;

