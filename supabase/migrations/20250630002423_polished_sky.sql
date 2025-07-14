/*
  # Orders and Order Management Schema

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (text, references user)
      - `total` (numeric, order total amount)
      - `status` (text, order status)
      - `payment_method` (text, payment method used)
      - `shipping_name` (text, recipient name)
      - `shipping_phone` (text, contact phone)
      - `shipping_street` (text, street address)
      - `shipping_city` (text, city)
      - `shipping_postal_code` (text, postal code)
      - `shipping_notes` (text, delivery notes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text, product name snapshot)
      - `product_image` (text, product image snapshot)
      - `quantity` (integer, quantity ordered)
      - `price` (numeric, price at time of order)
      - `selected_color` (text, optional color selection)
      - `created_at` (timestamptz)
    
    - `order_tracking`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `status` (text, tracking status)
      - `title` (text, status title)
      - `description` (text, optional description)
      - `timestamp` (timestamptz, when status occurred)
      - `completed` (boolean, if this step is completed)

  2. Security
    - Enable RLS on all tables
    - Users can view/create their own orders
    - Admins can view/manage all orders
    - Proper foreign key constraints
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total numeric NOT NULL CHECK (total >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash_on_delivery', 'credit_card', 'bank_transfer')),
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_street text NOT NULL,
  shipping_city text NOT NULL,
  shipping_postal_code text,
  shipping_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  product_image text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  selected_color text,
  created_at timestamptz DEFAULT now()
);

-- Create order_tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  title text NOT NULL,
  description text,
  timestamp timestamptz DEFAULT now(),
  completed boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Read orders"
  ON orders FOR SELECT
  USING (
    user_id = auth.uid()::text OR
    (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text OR
    (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Update orders"
  ON orders FOR UPDATE
  USING (
    user_id = auth.uid()::text OR
    (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

-- Create policies for order_items
CREATE POLICY "Read order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()::text)
    OR (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()::text)
    OR (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

-- Create policies for order_tracking
-- Order tracking policies merged with admin access

-- Admin policies (using proper PostgreSQL syntax)
CREATE POLICY "Delete orders"
  ON orders FOR DELETE
  USING (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin');

CREATE POLICY "Update order items"
  ON order_items FOR UPDATE
  USING (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin');

CREATE POLICY "Delete order items"
  ON order_items FOR DELETE
  USING (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin');

CREATE POLICY "Read order tracking"
  ON order_tracking FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()::text)
    OR (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Insert order tracking"
  ON order_tracking FOR INSERT
  WITH CHECK (
    true OR (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Update order tracking"
  ON order_tracking FOR UPDATE
  USING (
    true OR (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin')
  );

CREATE POLICY "Delete order tracking"
  ON order_tracking FOR DELETE
  USING (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'admin');

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_status ON order_tracking(status);