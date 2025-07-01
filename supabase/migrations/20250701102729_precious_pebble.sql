/*
  # Create Settings Table

  1. New Tables
    - `settings` - Store application settings like currency symbol

  2. Security
    - Enable RLS on settings table
    - Add policies for public read access and admin write access

  3. Default Values
    - Insert default currency symbol (₪)
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for settings"
  ON settings FOR SELECT
  TO public USING (true);

-- Create policies for admin write access
CREATE POLICY "Admin write access for settings"
  ON settings FOR INSERT
  TO public WITH CHECK (is_admin());

CREATE POLICY "Admin update access for settings"
  ON settings FOR UPDATE
  TO public USING (is_admin());

CREATE POLICY "Admin delete access for settings"
  ON settings FOR DELETE
  TO public USING (is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value, type, description)
VALUES 
  ('currency_symbol', '₪', 'string', 'Symbol for the main currency')
ON CONFLICT (key) DO NOTHING;