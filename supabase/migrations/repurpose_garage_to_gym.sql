
-- ========================
-- Garage → Gym SaaS Migration
-- STEP 1: Rename Tables
ALTER TABLE garages RENAME TO branches;
ALTER TABLE staff RENAME TO trainers;
ALTER TABLE garage_services RENAME TO class_types;
ALTER TABLE attendance RENAME TO member_attendance;
ALTER TABLE inventory RENAME TO equipment_inventory;
ALTER TABLE promotions RENAME TO promotion_codes;
ALTER TABLE job_cards RENAME TO membership_sessions;

-- STEP 2: Rename FKs and columns for consistency
ALTER TABLE trainers RENAME COLUMN garage_id TO branch_id;
ALTER TABLE equipment_inventory RENAME COLUMN garage_id TO branch_id;
ALTER TABLE member_attendance RENAME COLUMN garage_id TO branch_id;
ALTER TABLE class_types RENAME COLUMN garage_id TO branch_id;
ALTER TABLE invoice_items RENAME COLUMN garage_id TO branch_id;
ALTER TABLE invoices RENAME COLUMN garage_id TO branch_id;
ALTER TABLE promotion_codes RENAME COLUMN garage_id TO branch_id;
ALTER TABLE membership_sessions RENAME COLUMN garage_id TO branch_id;
ALTER TABLE membership_sessions RENAME COLUMN job_card_id TO session_id;
ALTER TABLE membership_sessions RENAME COLUMN staff_id TO trainer_id;

-- STEP 3: Create new tables
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  branch_id uuid REFERENCES branches(id),
  plan_id uuid REFERENCES membership_plans(id),
  join_date date NOT NULL,
  expiry_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  plan text,
  created_at timestamptz DEFAULT now()
);

-- STEP 4: Update RLS to use new branch_id consistently
-- For each RLS policy on former "garage_id" columns,
-- Replace with "branch_id". Example:
-- USING (branch_id = auth.uid()) -- actual logic will depend on your structure

-- STEP 5: Data migration (preserve foreign-keys etc.)
-- Example: If you have legacy 'garage_id', ensure you copy to new 'branch_id' where relevant.
-- Can be run only if columns are not renamed above:
-- UPDATE trainers SET branch_id = garage_id;
-- Repeat for other tables as required.

-- STEP 6: Update ENUMs or references as needed (if used in original schema).

-- STEP 7: (Optional) Clean up
-- Drop legacy columns or duplicated data, vacuum/analyze.

