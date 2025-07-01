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