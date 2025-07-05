/*
  # Allow driver role in user_profiles

  1. Changes
    - Update role constraint to include 'driver'
*/

-- Update role constraint to include driver
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles'
      AND column_name = 'role'
      AND constraint_name = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('user', 'driver', 'admin'));
