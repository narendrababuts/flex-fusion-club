
-- Add pdf_url column to the invoices table for storing cloud PDF links
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS pdf_url text;
