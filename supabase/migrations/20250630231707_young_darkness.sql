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

-- Create proper policies for products
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

-- Create proper policies for categories
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

-- Create proper policies for subcategories
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

-- Create proper policies for hero_banners
CREATE POLICY "Public read access for hero_banners" 
  ON hero_banners FOR SELECT 
  TO public 
  USING (is_active = true);

CREATE POLICY "Admin read access for hero_banners" 
  ON hero_banners FOR SELECT 
  TO public 
  USING (is_admin());

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
DROP POLICY IF EXISTS "Users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;

-- Create proper policies for reviews
CREATE POLICY "Public read access for reviews" 
  ON reviews FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can insert reviews" 
  ON reviews FOR INSERT 
  TO public 
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Users can update their own reviews" 
  ON reviews FOR UPDATE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own reviews" 
  ON reviews FOR DELETE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Admin manage all reviews" 
  ON reviews FOR ALL 
  TO public 
  USING (is_admin());

-- Fix user_profiles table policies
DROP POLICY IF EXISTS "Public access for user_profiles" ON user_profiles;

-- Create proper policies for user_profiles
CREATE POLICY "Users can read their own profile" 
  ON user_profiles FOR SELECT 
  TO public 
  USING (auth.uid() IS NOT NULL AND matrix_user_id = auth.uid()::text);

CREATE POLICY "Admin can read all profiles" 
  ON user_profiles FOR SELECT 
  TO public 
  USING (is_admin());

CREATE POLICY "Users can insert their own profile" 
  ON user_profiles FOR INSERT 
  TO public 
  WITH CHECK (auth.uid() IS NOT NULL AND matrix_user_id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR UPDATE 
  TO public 
  USING (auth.uid() IS NOT NULL AND matrix_user_id = auth.uid()::text);

CREATE POLICY "Admin can update all profiles" 
  ON user_profiles FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin can delete profiles" 
  ON user_profiles FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix chat_rooms table policies
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;

-- Create proper policies for chat_rooms
CREATE POLICY "Users can read their own chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Admin can read all chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (is_admin());

CREATE POLICY "Users can insert chat rooms" 
  ON chat_rooms FOR INSERT 
  TO public 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Admin can update all chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin can delete chat rooms" 
  ON chat_rooms FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix chat_messages table policies
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;

-- Create proper policies for chat_messages
CREATE POLICY "Users can read messages in their rooms" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (
    auth.uid() IS NOT NULL AND 
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admin can read all messages" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (is_admin());

CREATE POLICY "Users can insert messages" 
  ON chat_messages FOR INSERT 
  TO public 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (
      sender_id = auth.uid()::text OR
      room_id IN (
        SELECT id FROM chat_rooms WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (
    auth.uid() IS NOT NULL AND 
    sender_id = auth.uid()::text
  );

CREATE POLICY "Admin can update all messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin can delete messages" 
  ON chat_messages FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix notifications table policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create proper policies for notifications
CREATE POLICY "Users can read their own notifications" 
  ON notifications FOR SELECT 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Admin can read all notifications" 
  ON notifications FOR SELECT 
  TO public 
  USING (is_admin());

CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Admin can update all notifications" 
  ON notifications FOR UPDATE 
  TO public 
  USING (is_admin());

CREATE POLICY "Admin can insert notifications" 
  ON notifications FOR INSERT 
  TO public 
  WITH CHECK (is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete notifications" 
  ON notifications FOR DELETE 
  TO public 
  USING (is_admin());

-- Fix pricing_tiers table policies
DROP POLICY IF EXISTS "Public read access for pricing_tiers" ON pricing_tiers;

-- Create proper policies for pricing_tiers
CREATE POLICY "Public read access for pricing_tiers" 
  ON pricing_tiers FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin write access for pricing_tiers" 
  ON pricing_tiers FOR ALL 
  TO public 
  USING (is_admin());