
-- Create expenses table for automatic expense tracking
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id UUID REFERENCES garages(id),
  tenant_id UUID DEFAULT (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid,
  type TEXT NOT NULL, -- 'inventory_purchase', 'cogs', 'manual'
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  related_id UUID, -- reference to inventory.id or job_card.id
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses table
CREATE POLICY "Users can view their garage expenses" ON expenses
  FOR SELECT USING (garage_id IN (SELECT id FROM garages WHERE tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid));

CREATE POLICY "Users can insert their garage expenses" ON expenses
  FOR INSERT WITH CHECK (garage_id IN (SELECT id FROM garages WHERE tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid));

CREATE POLICY "Users can update their garage expenses" ON expenses
  FOR UPDATE USING (garage_id IN (SELECT id FROM garages WHERE tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid));

CREATE POLICY "Users can delete their garage expenses" ON expenses
  FOR DELETE USING (garage_id IN (SELECT id FROM garages WHERE tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid));

-- Function to automatically create expense entry when inventory is added
CREATE OR REPLACE FUNCTION create_inventory_purchase_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert expense record for inventory purchase
  INSERT INTO expenses (
    garage_id, 
    tenant_id,
    type, 
    item_name, 
    quantity, 
    unit_cost, 
    total_cost, 
    related_id,
    description
  ) VALUES (
    NEW.garage_id,
    NEW.tenant_id,
    'inventory_purchase',
    NEW.item_name,
    NEW.quantity,
    NEW.unit_price,
    NEW.quantity * NEW.unit_price,
    NEW.id,
    'Automatic expense for inventory purchase: ' || NEW.item_name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory purchases
CREATE TRIGGER inventory_purchase_expense_trigger
  AFTER INSERT ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_purchase_expense();

-- Function to create COGS expense when job card is completed
CREATE OR REPLACE FUNCTION create_cogs_expense()
RETURNS TRIGGER AS $$
DECLARE
  part_record JSONB;
  inventory_record RECORD;
BEGIN
  -- Only process when status changes to 'Completed'
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    -- Process each part used in the job
    FOR part_record IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.parts, '[]'::jsonb))
    LOOP
      -- Try to find matching inventory item to get cost
      SELECT * INTO inventory_record 
      FROM inventory 
      WHERE garage_id = NEW.garage_id 
        AND item_name = (part_record->>'name')
      LIMIT 1;
      
      -- Create COGS expense entry
      INSERT INTO expenses (
        garage_id,
        tenant_id,
        type,
        item_name,
        quantity,
        unit_cost,
        total_cost,
        related_id,
        description
      ) VALUES (
        NEW.garage_id,
        NEW.tenant_id,
        'cogs',
        (part_record->>'name'),
        COALESCE((part_record->>'quantity')::INTEGER, 0),
        COALESCE(inventory_record.unit_price, (part_record->>'unitPrice')::NUMERIC, 0),
        COALESCE((part_record->>'quantity')::INTEGER, 0) * COALESCE(inventory_record.unit_price, (part_record->>'unitPrice')::NUMERIC, 0),
        NEW.id,
        'Cost of Goods Sold for job: ' || NEW.customer_name || ' - ' || NEW.car_number
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for COGS tracking
CREATE TRIGGER job_completion_cogs_trigger
  AFTER UPDATE ON job_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_cogs_expense();
