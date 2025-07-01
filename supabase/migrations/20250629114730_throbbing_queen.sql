-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('order', 'promo', 'message', 'system')),
  read boolean DEFAULT false,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (true);

-- Create policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (true);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, read, timestamp) VALUES
  ('admin', 'New Order #1234', 'John Doe placed a new order for Wireless Headphones.', 'order', false, EXTRACT(EPOCH FROM now() - INTERVAL '15 minutes') * 1000),
  ('admin', 'Low Stock Alert', 'Gaming Laptop Pro is running low on stock (only 3 left).', 'system', false, EXTRACT(EPOCH FROM now() - INTERVAL '45 minutes') * 1000),
  ('admin', 'New Customer Signup', 'Jane Smith has created a new account.', 'system', true, EXTRACT(EPOCH FROM now() - INTERVAL '3 hours') * 1000),
  ('admin', 'Product Review', 'New 5-star review for Nike Air Jordan shoes.', 'system', true, EXTRACT(EPOCH FROM now() - INTERVAL '5 hours') * 1000),
  ('user_1', 'Welcome to QuickMart', 'Thank you for joining our platform. Start exploring our products!', 'system', false, EXTRACT(EPOCH FROM now() - INTERVAL '2 hours') * 1000),
  ('user_1', 'Summer Sale', 'Enjoy up to 50% off on selected items. Limited time offer!', 'promo', true, EXTRACT(EPOCH FROM now() - INTERVAL '1 day') * 1000),
  ('user_1', 'New Message', 'You have a new message from our support team.', 'message', false, EXTRACT(EPOCH FROM now() - INTERVAL '30 minutes') * 1000),
  ('user_1', 'Order Confirmed', 'Your order #5678 has been confirmed and is being processed.', 'order', true, EXTRACT(EPOCH FROM now() - INTERVAL '6 hours') * 1000),
  ('user_1', 'Wishlist Item on Sale', 'An item in your wishlist is now on sale! Check it out before the offer ends.', 'promo', false, EXTRACT(EPOCH FROM now() - INTERVAL '12 hours') * 1000)
ON CONFLICT DO NOTHING;