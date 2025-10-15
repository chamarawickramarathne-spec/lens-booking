-- First drop the trigger
DROP TRIGGER IF EXISTS update_invoice_on_payment_update ON public.payment_schedules;

-- Then drop the function
DROP FUNCTION IF EXISTS public.update_invoice_on_payment_completion();