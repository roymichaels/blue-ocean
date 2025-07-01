/*
  # Add Customer Tier to User Profiles

  1. Changes
    - Add `customer_tier` column to user_profiles table
    - This allows for categorizing customers as New, Regular, VIP, or Banned
    - Add index for faster querying by customer tier

  2. Security
    - Maintain existing RLS policies
*/

-- Add customer_tier column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS customer_tier text DEFAULT 'new' CHECK (customer_tier IN ('new', 'regular', 'vip', 'banned'));

-- Add index for customer_tier for faster querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_customer_tier ON user_profiles(customer_tier);

-- Update any existing users to 'regular' status
UPDATE user_profiles SET customer_tier = 'regular' WHERE customer_tier IS NULL;