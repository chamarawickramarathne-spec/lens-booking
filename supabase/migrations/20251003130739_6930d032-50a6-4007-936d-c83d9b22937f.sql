-- Update the function to set search_path for security
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  invoice_id_var UUID;
  is_final_payment BOOLEAN;
  amount_due NUMERIC;
  amount_paid NUMERIC;
BEGIN
  -- Get invoice_id and schedule_type from the payment schedule
  invoice_id_var := COALESCE(NEW.invoice_id, OLD.invoice_id);
  is_final_payment := COALESCE(NEW.schedule_type, OLD.schedule_type) = 'final';
  
  -- Only proceed if this is a final payment and it has an invoice_id
  IF invoice_id_var IS NOT NULL AND is_final_payment THEN
    -- Get the amount and paid amount for this final payment schedule
    amount_due := COALESCE(NEW.amount, OLD.amount);
    amount_paid := COALESCE(NEW.paid_amount, OLD.paid_amount, 0);
    
    -- If final payment is fully paid, update invoice status
    IF amount_paid >= amount_due THEN
      UPDATE public.invoices 
      SET 
        status = 'paid',
        payment_date = CURRENT_DATE
      WHERE id = invoice_id_var;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;