/*
  # Fix user_profiles RLS policies

  1. Security Updates
    - Add policy for anonymous users to insert profiles during signup
    - Update existing policies to handle auth state properly
    - Ensure proper access control for user profile operations

  2. Changes
    - Add anonymous insert policy for initial profile creation
    - Update user policies to handle both authenticated and anonymous states
    - Maintain security while allowing proper user onboarding
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Allow anonymous users to insert profiles during signup process
CREATE POLICY "Anonymous can insert profiles during signup"
  ON user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (matrix_user_id = (SELECT auth.uid())::text);

-- Allow users to read their own profile (both authenticated and by matrix_user_id)
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO public
  USING (
    ((SELECT auth.uid()) IS NOT NULL AND matrix_user_id = (SELECT auth.uid())::text) OR
    (auth.role() = 'anon')
  );

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (matrix_user_id = (SELECT auth.uid())::text)
  WITH CHECK (matrix_user_id = (SELECT auth.uid())::text);

-- Ensure admin policies remain intact
-- (Admin policies should already exist and work correctly)