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