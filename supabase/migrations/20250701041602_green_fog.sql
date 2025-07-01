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