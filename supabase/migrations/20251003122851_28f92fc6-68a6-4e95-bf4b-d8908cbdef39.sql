-- Drop the trigger first, then the function, then recreate both
DROP TRIGGER IF EXISTS create_invoice_on_booking_confirmation ON public.bookings;
DROP FUNCTION IF EXISTS public.create_invoice_for_confirmed_booking();

-- Recreate the function to create only one invoice with total and deposit
CREATE OR REPLACE FUNCTION public.create_invoice_for_confirmed_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invoice_number TEXT;
BEGIN
  -- Only create invoice when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Generate invoice number
    invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    
    -- Create single invoice with total amount and deposit amount
    INSERT INTO public.invoices (
      invoice_number,
      client_id,
      photographer_id,
      booking_id,
      issue_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      deposit_amount,
      status,
      notes
    ) VALUES (
      invoice_number,
      NEW.client_id,
      NEW.photographer_id,
      NEW.id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      COALESCE(NEW.total_amount, 0),
      0,
      COALESCE(NEW.total_amount, 0),
      COALESCE(NEW.deposit_amount, 0),
      'draft',
      'Invoice for booking: ' || NEW.title
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER create_invoice_on_booking_confirmation
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invoice_for_confirmed_booking();