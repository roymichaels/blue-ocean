/*
  # Add User PIN Support

  Create a user_pins table to securely store hashed PINs and a
  verify_pin() helper for verifying user-provided PIN values.
*/

-- create table
CREATE TABLE IF NOT EXISTS user_pins (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(matrix_user_id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner access for user_pins"
  ON user_pins FOR ALL TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE TRIGGER update_user_pins_updated_at
  BEFORE UPDATE ON user_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- verification function
CREATE OR REPLACE FUNCTION verify_pin(pin TEXT)
RETURNS JSONB AS $$
DECLARE stored TEXT;
BEGIN
  SELECT pin_hash INTO stored FROM user_pins WHERE user_id = (auth.uid())::text;
  RETURN jsonb_build_object(
    'success',
    stored IS NOT NULL AND crypt(pin, stored) = stored
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
