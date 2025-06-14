
-- Step 1: Enable RLS on the promotions table
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing all-access policies if they exist
DROP POLICY IF EXISTS "Allow all operations on promotions" ON public.promotions;

-- Step 3: Create a policy enforcing garage-based access for all operations
CREATE POLICY "Garage based access"
ON public.promotions
FOR ALL
USING (
  garage_id::text = (auth.jwt() ->> 'garage_id')
)
WITH CHECK (
  garage_id::text = (auth.jwt() ->> 'garage_id')
);

