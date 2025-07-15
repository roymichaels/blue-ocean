/*
  # Add user_pins table for storing hashed PINs

  1. Table
    - user_pins: stores hashed PIN linked to user_profiles

  2. Security
    - Enable RLS; users can read and update only their own pin

  3. Helpers
    - verify_pin(pin text) function comparing provided pin with stored hash
    - update_user_pins_updated_at trigger
*/

-- Create user_pins table
CREATE TABLE IF NOT EXISTS user_pins (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- Policy: allow users to manage their own pin
CREATE POLICY "Users manage their own pin"
  ON user_pins FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid())::uuid)
  WITH CHECK (user_id = (SELECT auth.uid())::uuid);

-- Admin override
CREATE POLICY "Admins manage all pins"
  ON user_pins FOR ALL
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Verification function
CREATE OR REPLACE FUNCTION verify_pin(pin text)
RETURNS jsonb AS $$
DECLARE
  stored text;
BEGIN
  SELECT pin_hash INTO stored
  FROM user_pins
  WHERE user_id = (SELECT auth.uid())::uuid;

  IF stored IS NULL THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  RETURN jsonb_build_object('success', crypt(pin, stored) = stored);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_user_pins_updated_at
  BEFORE UPDATE ON user_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
