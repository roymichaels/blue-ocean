/*
  # Add Delivery Jobs Table

  1. New Table
    - delivery_jobs: job assignments for order deliveries

  2. Security
    - RLS so drivers only see their jobs
    - Admins can manage all jobs
*/

-- Create delivery_jobs table
CREATE TABLE IF NOT EXISTS delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  pickup_time timestamptz,
  dropoff_time timestamptz,
  proof_uri text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE delivery_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view their jobs"
  ON delivery_jobs FOR SELECT TO public
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    driver_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admins can manage all jobs"
  ON delivery_jobs FOR ALL TO public
  USING (is_admin());

-- Indexes
CREATE INDEX idx_delivery_jobs_driver_id ON delivery_jobs(driver_id);
CREATE INDEX idx_delivery_jobs_status ON delivery_jobs(status);

-- Trigger to update updated_at
CREATE TRIGGER update_delivery_jobs_updated_at
  BEFORE UPDATE ON delivery_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
