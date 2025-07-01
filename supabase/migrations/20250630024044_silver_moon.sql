/*
  # Add KYC Fields to User Profiles

  1. New Fields
    - `kyc_status` - Status of KYC verification (none, pending, verified, rejected)
    - `kyc_request_notes` - Notes provided by user when requesting verification
    - `kyc_requested_at` - When the user requested verification
    - `kyc_approved_by` - Admin who approved/rejected the verification
    - `kyc_approved_at` - When the verification was approved/rejected

  2. Indexes
    - Add index for kyc_status for faster querying of pending requests
*/

-- Add KYC fields to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_request_notes text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_requested_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_approved_by text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;

-- Add index for kyc_status for faster querying of pending requests
CREATE INDEX IF NOT EXISTS idx_user_profiles_kyc_status ON user_profiles(kyc_status);