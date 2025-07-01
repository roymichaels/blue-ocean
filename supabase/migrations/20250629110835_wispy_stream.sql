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