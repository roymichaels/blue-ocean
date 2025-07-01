-- Add orderId column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id text;

-- Create index for order_id for faster querying
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);