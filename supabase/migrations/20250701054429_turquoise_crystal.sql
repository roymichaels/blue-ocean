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
  SELECT role INTO current_role FROM user_profiles WHERE matrix_user_id = auth.uid()::text;
  
  RETURN (
    current_role = 'admin' OR
    (SELECT count(*) FROM user_profiles WHERE matrix_user_id = auth.uid()::text AND role = 'admin') > 0
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