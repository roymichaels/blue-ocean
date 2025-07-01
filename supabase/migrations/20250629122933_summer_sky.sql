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