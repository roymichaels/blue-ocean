/*
  # Insert Sample Data

  1. Categories and Subcategories
    - Insert all categories with proper relationships
    - Insert subcategories linked to categories

  2. Products
    - Insert sample products with proper category references

  3. Other Data
    - Pricing tiers
    - Sample chat data
*/

-- Insert categories
INSERT INTO categories (id, name, icon) VALUES
  ('electronics', 'Electronics', '📱'),
  ('fashion', 'Fashion', '👕'),
  ('furniture', 'Furniture', '🛋️'),
  ('industrial', 'Industrial', '🏭'),
  ('home-decor', 'Home Decor', '🎁'),
  ('health', 'Health', '🏥'),
  ('construction', 'Construction & Real State', '🏠'),
  ('fabrication', 'Fabrication Service', '🔧'),
  ('electrical', 'Electrical Equipment', '⚡')
ON CONFLICT (id) DO NOTHING;

-- Insert subcategories
INSERT INTO subcategories (id, name, icon, category_id) VALUES
  ('laptops', 'Laptops', '💻', 'electronics'),
  ('mobile-phones', 'Mobile phones', '📱', 'electronics'),
  ('headphones', 'Headphones', '🎧', 'electronics'),
  ('smart-watches', 'Smart Watches', '⌚', 'electronics'),
  ('mobile-cases', 'Mobile Cases', '📱', 'electronics'),
  ('monitors', 'Monitors', '🖥️', 'electronics'),
  ('clothing', 'Clothing', '👕', 'fashion'),
  ('shoes', 'Shoes', '👟', 'fashion'),
  ('accessories', 'Accessories', '👓', 'fashion')
ON CONFLICT (id) DO NOTHING;

-- Insert pricing tiers
INSERT INTO pricing_tiers (id, name, discount, min_quantity, description) VALUES
  ('standard', 'Standard', 0, 1, 'Regular pricing'),
  ('bulk', 'Bulk Discount', 10, 5, '10% off for 5+ items'),
  ('wholesale', 'Wholesale', 20, 10, '20% off for 10+ items')
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, price, original_price, description, category, subcategory, images, colors, rating, reviews, badges, stock) VALUES
  (
    'Nike air jordan retro fashion shoes',
    126.00,
    156.00,
    'Premium Nike Air Jordan retro fashion shoes with classic design and superior comfort.',
    'fashion',
    'shoes',
    ARRAY['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#00FF00'],
    4.5,
    299,
    ARRAY[]::text[],
    50
  ),
  (
    'Classic new black glasses',
    8.50,
    12.00,
    'Stylish black-framed glasses perfect for everyday wear.',
    'fashion',
    'accessories',
    ARRAY['https://images.pexels.com/photos/947885/pexels-photo-947885.jpeg'],
    ARRAY['#000000', '#8B4513', '#FF0000', '#0000FF', '#808080', '#00FF00', '#800080'],
    4.2,
    156,
    ARRAY[]::text[],
    25
  ),
  (
    'Loop Silicone Strong Magnetic Watch',
    15.25,
    20.00,
    'Constructed with high-quality silicone material, the Loop Silicone Strong Magnetic Watch ensures a comfortable and secure fit on your wrist. The soft and flexible silicone is gentle on the skin, making it ideal for extended wear.',
    'electronics',
    'smart-watches',
    ARRAY['https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg'],
    ARRAY['#000000', '#8B4513', '#0000FF', '#87CEEB', '#808080'],
    4.6,
    2293,
    ARRAY['Top Rated', 'Free Shipping'],
    100
  ),
  (
    'Wireless Bluetooth Headphones',
    89.99,
    129.99,
    'Premium wireless headphones with noise cancellation and superior sound quality.',
    'electronics',
    'headphones',
    ARRAY['https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg'],
    ARRAY['#000000', '#FFFFFF', '#FF0000'],
    4.3,
    1847,
    ARRAY['Best Seller'],
    75
  ),
  (
    'Gaming Laptop Pro',
    1299.99,
    1599.99,
    'High-performance gaming laptop with latest graphics card and fast processor.',
    'electronics',
    'laptops',
    ARRAY['https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg'],
    ARRAY['#000000', '#C0C0C0'],
    4.7,
    892,
    ARRAY['Gaming', 'High Performance'],
    15
  ),
  (
    'Smartphone Case',
    19.99,
    29.99,
    'Protective smartphone case with shock absorption and wireless charging support.',
    'electronics',
    'mobile-cases',
    ARRAY['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
    ARRAY['#000000', '#0000FF', '#FF0000', '#00FF00'],
    4.1,
    567,
    ARRAY[]::text[],
    200
  )
ON CONFLICT DO NOTHING;

-- Insert sample chat rooms
INSERT INTO chat_rooms (id, user_id, user_name, last_message, last_message_time, unread_count) VALUES
  ('room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, 2),
  ('room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, 1),
  ('default_room', 'user_guest', 'Guest User', 'Welcome to our store!', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample chat messages
INSERT INTO chat_messages (id, room_id, sender_id, sender_name, message, timestamp, is_admin) VALUES
  ('msg_1', 'room_1', 'user_1', 'John Doe', 'Hi, I have a question about the smartwatch', EXTRACT(EPOCH FROM now() - INTERVAL '5 minutes') * 1000, false),
  ('msg_2', 'room_1', 'admin', 'Admin', 'Hello! I''d be happy to help. What would you like to know?', EXTRACT(EPOCH FROM now() - INTERVAL '4 minutes') * 1000, true),
  ('msg_3', 'room_2', 'user_2', 'Jane Smith', 'Is this product still available?', EXTRACT(EPOCH FROM now() - INTERVAL '10 minutes') * 1000, false),
  ('msg_4', 'default_room', 'admin', 'Admin', 'Welcome to our store! How can I help you today?', EXTRACT(EPOCH FROM now() - INTERVAL '1 hour') * 1000, true)
ON CONFLICT (id) DO NOTHING;