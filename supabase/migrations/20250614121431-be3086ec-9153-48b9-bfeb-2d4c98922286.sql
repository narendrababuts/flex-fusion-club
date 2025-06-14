
-- Enable Row Level Security on expenses if not yet ON
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT expenses for their own garages
CREATE POLICY "Garage users can select expenses" ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM garages
      WHERE id = expenses.garage_id
        AND owner_user_id = auth.uid()
    )
  );

-- Allow users to INSERT expenses for their own garages
CREATE POLICY "Garage users can insert expenses" ON public.expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM garages
      WHERE id = expenses.garage_id
        AND owner_user_id = auth.uid()
    )
  );

-- Allow users to UPDATE expenses for their own garages
CREATE POLICY "Garage users can update expenses" ON public.expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM garages
      WHERE id = expenses.garage_id
        AND owner_user_id = auth.uid()
    )
  );

-- Allow users to DELETE expenses for their own garages
CREATE POLICY "Garage users can delete expenses" ON public.expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM garages
      WHERE id = expenses.garage_id
        AND owner_user_id = auth.uid()
    )
  );
