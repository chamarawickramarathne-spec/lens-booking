-- Drop the trigger and function for invoice cancellation on booking cancellation
DROP TRIGGER IF EXISTS cancel_invoice_on_booking_cancellation ON public.bookings;
DROP FUNCTION IF EXISTS public.cancel_invoice_for_cancelled_booking();

-- Update the invoice creation function to create separate deposit invoice if deposit amount exists
CREATE OR REPLACE FUNCTION public.create_invoice_for_confirmed_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invoice_number TEXT;
  deposit_invoice_number TEXT;
  remaining_amount NUMERIC;
BEGIN
  -- Only create invoice when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Generate invoice number for main invoice
    invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    
    -- Calculate remaining amount (total - deposit)
    remaining_amount := COALESCE(NEW.total_amount, 0) - COALESCE(NEW.deposit_amount, 0);
    
    -- Create main invoice for remaining amount (or total if no deposit)
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
      status,
      notes
    ) VALUES (
      invoice_number,
      NEW.client_id,
      NEW.photographer_id,
      NEW.id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      CASE 
        WHEN NEW.deposit_amount IS NOT NULL AND NEW.deposit_amount > 0 
        THEN remaining_amount 
        ELSE COALESCE(NEW.total_amount, 0) 
      END,
      0,
      CASE 
        WHEN NEW.deposit_amount IS NOT NULL AND NEW.deposit_amount > 0 
        THEN remaining_amount 
        ELSE COALESCE(NEW.total_amount, 0) 
      END,
      'draft',
      CASE 
        WHEN NEW.deposit_amount IS NOT NULL AND NEW.deposit_amount > 0 
        THEN 'Final payment invoice for booking: ' || NEW.title
        ELSE 'Invoice for booking: ' || NEW.title
      END
    );
    
    -- Create separate deposit invoice if deposit amount exists
    IF NEW.deposit_amount IS NOT NULL AND NEW.deposit_amount > 0 THEN
      deposit_invoice_number := 'DEP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
      
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
        deposit_invoice_number,
        NEW.client_id,
        NEW.photographer_id,
        NEW.id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days', -- Deposit due earlier
        NEW.deposit_amount,
        0,
        NEW.deposit_amount,
        NEW.deposit_amount,
        'draft',
        'Deposit invoice for booking: ' || NEW.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;