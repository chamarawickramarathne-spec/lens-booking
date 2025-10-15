-- Fix invoice status check constraint by removing it first, then adding the correct one
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add the correct check constraint with all valid status values
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'pending', 'paid', 'cancelled', 'cancel_by_client'));