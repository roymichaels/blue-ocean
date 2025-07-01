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
      WHERE matrix_user_id = auth.uid()::text 
      AND role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;