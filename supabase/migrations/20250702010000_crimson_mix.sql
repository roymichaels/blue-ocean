/*
  # Add Mix Groups Table

  1. New Tables
    - mix_groups: store mix group name and conversion factor

  2. Table Changes
    - products: add mix_group_id column referencing mix_groups

  3. Security
    - Enable RLS and public policies similar to other tables
*/

-- Create mix_groups table
CREATE TABLE IF NOT EXISTS mix_groups (
  id text PRIMARY KEY,
  name text NOT NULL,
  conversion_factor numeric NOT NULL CHECK (conversion_factor > 0),
  created_at timestamptz DEFAULT now()
);

-- Add mix_group_id column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mix_group_id text REFERENCES mix_groups(id);

-- Enable row level security for mix_groups
ALTER TABLE mix_groups ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for mix_groups"
  ON mix_groups FOR SELECT
  TO public
  USING (true);

-- Admin CRUD policies
CREATE POLICY "Admin insert access for mix_groups"
  ON mix_groups FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admin update access for mix_groups"
  ON mix_groups FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Admin delete access for mix_groups"
  ON mix_groups FOR DELETE
  TO public
  USING (true);
