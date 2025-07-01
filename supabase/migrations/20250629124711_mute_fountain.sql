-- Fix hero_banners table column name
ALTER TABLE hero_banners RENAME COLUMN order_index TO "order";

-- Update sample data to use correct column name
UPDATE hero_banners SET "order" = 1 WHERE title = 'Summer Sale';
UPDATE hero_banners SET "order" = 2 WHERE title = 'New Arrivals';
UPDATE hero_banners SET "order" = 3 WHERE title = 'Flash Sale';