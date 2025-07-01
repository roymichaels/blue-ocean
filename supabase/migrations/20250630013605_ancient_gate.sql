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