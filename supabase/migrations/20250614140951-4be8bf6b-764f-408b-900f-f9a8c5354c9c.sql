
-- **Enhance the leads table for rich enquiry/capture (future-proof CRM)**

-- 1. Add new vehicle info fields
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS license_plate TEXT;

-- 2. Add new enquiry meta fields
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS enquiry_date TIMESTAMP DEFAULT now(),
  ADD COLUMN IF NOT EXISTS enquiry_details TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES staff(id),
  ADD COLUMN IF NOT EXISTS next_followup TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- 3. Add notes array (timestamped entries as TEXT for now, to keep simple—can be expanded to composite type or a new table if needed)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS notes TEXT[];

-- 4. Ensure last_contacted uses consistent naming (optional; can also alias last_followup to last_contacted if preferred, but we will keep both for compat)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP;

-- 5. Update RLS and policies are **already in place, no changes needed.**

-- 6. Existing fields (customer_name, phone_number, etc.) remain untouched for backward compatibility.

-- 7. No data loss; all new fields are nullable or have safe defaults.

