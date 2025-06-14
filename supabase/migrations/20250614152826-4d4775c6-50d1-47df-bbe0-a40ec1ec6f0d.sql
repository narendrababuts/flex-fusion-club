
-- 1. Add missing columns if they don't exist.
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS device_ip TEXT,
  ADD COLUMN IF NOT EXISTS check_in TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS hours_worked NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_due NUMERIC;

-- 2. Ensure row-level security is enabled.
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 3. Remove existing access policy (if it exists), and then create garage isolation policy.
DROP POLICY IF EXISTS "Garage isolation" ON attendance;
CREATE POLICY "Garage isolation"
  ON attendance
  FOR ALL
  USING (garage_id::text = (auth.jwt() ->> 'garage_id'));

-- 4. Trigger for automatic hours and salary calculation on check-out.
CREATE OR REPLACE FUNCTION public.compute_attendance_metrics()
RETURNS trigger AS $$
DECLARE
  rate NUMERIC;
BEGIN
  -- Only calculate if check_out is being set AND check_in exists
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    rate := COALESCE((SELECT hourly_rate FROM staff WHERE id = NEW.staff_id), 0);
    NEW.hours_worked := ROUND(EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600, 2);
    NEW.salary_due := ROUND(NEW.hours_worked * rate, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_metrics ON attendance;

CREATE TRIGGER trg_compute_metrics
  BEFORE UPDATE OF check_out ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_attendance_metrics();

-- 5. Add primary key on id if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='attendance'
      AND constraint_type='PRIMARY KEY'
  ) THEN
    ALTER TABLE attendance ADD PRIMARY KEY (id);
  END IF;
END
$$;

-- 6. Create index on garage_id
CREATE INDEX IF NOT EXISTS idx_attendance_garage ON attendance (garage_id);
