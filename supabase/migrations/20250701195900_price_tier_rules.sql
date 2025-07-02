-- Create price_tier_rules table
CREATE TABLE price_tier_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id text NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  min_qty integer NOT NULL CHECK (min_qty >= 0),
  max_qty integer NOT NULL CHECK (max_qty >= min_qty),
  price_per_unit numeric,
  discount_pct numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE price_tier_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for price_tier_rules"
  ON price_tier_rules FOR SELECT TO public USING (true);

CREATE POLICY "Admin write access for price_tier_rules"
  ON price_tier_rules FOR ALL TO public USING (is_admin());

CREATE INDEX idx_price_tier_rules_tier_id ON price_tier_rules(tier_id);

CREATE TRIGGER update_price_tier_rules_updated_at
  BEFORE UPDATE ON price_tier_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
