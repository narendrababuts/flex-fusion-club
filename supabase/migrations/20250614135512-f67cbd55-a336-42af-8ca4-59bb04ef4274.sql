
-- 1. Enable the "uuid-ossp" extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the `leads` table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID REFERENCES garages(id) ON DELETE CASCADE,
  customer_name TEXT,
  phone_number TEXT,
  vehicle_info TEXT,
  enquiry_type TEXT,           -- e.g., Service, Repair
  source TEXT,                 -- e.g., Walk‑in, WhatsApp, Referral
  status TEXT DEFAULT 'Active',-- “Interested”, “Not Interested”, “Active”
  last_followup TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 3. Row Level Security: Only allow access to leads for the current user's own garage

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads only accessible for garage" ON public.leads
  FOR ALL
  USING (
    garage_id = (
      SELECT id FROM garages WHERE owner_user_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    garage_id = (
      SELECT id FROM garages WHERE owner_user_id = auth.uid() LIMIT 1
    )
  );

