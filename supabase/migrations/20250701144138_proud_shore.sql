/*
  # Update Pricing Tiers Schema

  1. Changes
    - Add price_per_unit column to pricing_tiers table
    - Update existing pricing tiers to use price_per_unit instead of discount
    - This allows for more flexible pricing models beyond percentage discounts

  2. Security
    - Maintain existing RLS policies
*/

-- Add price_per_unit column to pricing_tiers table
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS price_per_unit numeric;

-- Update existing pricing tiers to use price_per_unit
-- For demonstration, we'll set some sample values
UPDATE pricing_tiers SET price_per_unit = 8.00 WHERE id = 'bulk';
UPDATE pricing_tiers SET price_per_unit = 7.00 WHERE id = 'wholesale';

-- Update descriptions to reflect the new pricing model
UPDATE pricing_tiers 
SET description = 'מחיר מיוחד של 8.00₪ ליחידה בקנייה של 5 יחידות ומעלה' 
WHERE id = 'bulk';

UPDATE pricing_tiers 
SET description = 'מחיר מיוחד של 7.00₪ ליחידה בקנייה של 10 יחידות ומעלה' 
WHERE id = 'wholesale';