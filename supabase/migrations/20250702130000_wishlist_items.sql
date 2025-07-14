/*
  # Add Wishlist Items Table

  1. New Table
    - wishlist_items: store user wishlist products

  2. Security
    - Enable RLS with user scoped policies and admin override
*/

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read wishlist"
  ON wishlist_items FOR SELECT
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

CREATE POLICY "Insert wishlist"
  ON wishlist_items FOR INSERT
  TO public
  WITH CHECK (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

CREATE POLICY "Delete wishlist"
  ON wishlist_items FOR DELETE
  TO public
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND user_id = (SELECT auth.uid())::text
    )
    OR is_admin()
  );

-- Allow admins to update wishlist entries if needed
CREATE POLICY "Admin update wishlist"
  ON wishlist_items FOR UPDATE
  TO public
  USING (is_admin());

-- Indexes
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);

-- Trigger to update updated_at
CREATE TRIGGER update_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
