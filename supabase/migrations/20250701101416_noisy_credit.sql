/*
  # Create Reviews Database Schema

  1. New Tables
    - `reviews` - Store product reviews with user information and ratings
    - Add order_id field to link reviews to specific orders

  2. Security
    - Enable RLS on reviews table
    - Add policies for public read access and authenticated write access
    - Ensure users can only modify their own reviews
    - Allow admins to manage all reviews

  3. Indexes
    - Add indexes for better query performance
*/

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_image text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  comment text,
  date timestamptz NOT NULL,
  helpful integer DEFAULT 0 CHECK (helpful >= 0),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  order_id text
);

-- Enable Row Level Security if not already enabled
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public read access for reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admin manage all reviews" ON reviews;

-- Create policy for public read access
CREATE POLICY "Public read access for reviews" 
  ON reviews FOR SELECT 
  TO public 
  USING (true);

-- Create policy for authenticated users to insert reviews
CREATE POLICY "Users can insert reviews" 
  ON reviews FOR INSERT 
  TO public 
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Create policy for users to update their own reviews
CREATE POLICY "Users can update their own reviews" 
  ON reviews FOR UPDATE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Create policy for users to delete their own reviews
CREATE POLICY "Users can delete their own reviews" 
  ON reviews FOR DELETE 
  TO public 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Create policy for admins to manage all reviews
CREATE POLICY "Admin manage all reviews" 
  ON reviews FOR ALL 
  TO public 
  USING (is_admin());

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- Insert sample reviews if they don't exist
INSERT INTO reviews (id, product_id, product_name, product_image, user_id, user_name, user_avatar, rating, title, comment, date, helpful, verified, order_id) 
VALUES
  ('review1', '1', 'Nike air jordan retro fashion shoes', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'user_1', 'Sarah Johnson', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg', 5, 'Amazing quality and comfort!', 'These shoes exceeded my expectations. The quality is outstanding and they are incredibly comfortable for daily wear. Highly recommend!', now() - interval '2 days', 12, true, 'order_1'),
  ('review2', '3', 'Loop Silicone Strong Magnetic Watch', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'user_2', 'Mike Chen', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg', 4, 'Great value for money', 'The watch works well and the magnetic band is convenient. Battery life could be better but overall satisfied with the purchase.', now() - interval '5 days', 8, true, 'order_2'),
  ('review3', '4', 'Wireless Bluetooth Headphones', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 'user_3', 'Emily Davis', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg', 5, 'Perfect for music lovers', 'The sound quality is incredible! Noise cancellation works perfectly and they are very comfortable for long listening sessions.', now() - interval '7 days', 15, true, 'order_3'),
  ('review4', '2', 'Classic new black glasses', 'https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg', 'user_4', 'David Wilson', 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg', 3, 'Decent glasses but could be better', 'The frames are okay but feel a bit flimsy. For the price, they do the job but I expected better quality.', now() - interval '10 days', 3, false, 'order_4'),
  ('review5', '5', 'Gaming Laptop Pro', 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg', 'user_5', 'Alex Rodriguez', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', 5, 'Beast of a machine!', 'This laptop handles everything I throw at it. Gaming, video editing, programming - all smooth as butter. Worth every penny!', now() - interval '14 days', 22, true, 'order_5')
ON CONFLICT (id) DO NOTHING;