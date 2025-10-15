-- Fix security definer functions by setting search_path

-- Update create_invoice_for_confirmed_booking function
CREATE OR REPLACE FUNCTION public.create_invoice_for_confirmed_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update create_payment_schedules_for_invoice function
CREATE OR REPLACE FUNCTION public.create_payment_schedules_for_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  booking_rec RECORD;
BEGIN
  -- Get booking details if invoice is linked to a booking
  IF NEW.booking_id IS NOT NULL THEN
    SELECT * INTO booking_rec FROM public.bookings WHERE id = NEW.booking_id;
    
    -- Create payment schedule for deposit if exists
    IF booking_rec.deposit_amount IS NOT NULL AND booking_rec.deposit_amount > 0 THEN
      INSERT INTO public.payment_schedules (
        photographer_id,
        invoice_id,
        payment_name,
        schedule_type,
        amount,
        due_date,
        notes
      ) VALUES (
        NEW.photographer_id,
        NEW.id,
        'Deposit Payment',
        'deposit',
        booking_rec.deposit_amount,
        NEW.issue_date,
        'Deposit payment for booking: ' || booking_rec.title
      );
    END IF;
    
    -- Create payment schedule for remaining amount
    IF booking_rec.total_amount IS NOT NULL AND booking_rec.total_amount > 0 THEN
      INSERT INTO public.payment_schedules (
        photographer_id,
        invoice_id,
        payment_name,
        schedule_type,
        amount,
        due_date,
        notes
      ) VALUES (
        NEW.photographer_id,
        NEW.id,
        'Final Payment',
        'final',
        booking_rec.total_amount - COALESCE(booking_rec.deposit_amount, 0),
        NEW.due_date,
        'Final payment for booking: ' || booking_rec.title
      );
    END IF;
  ELSE
    -- Create single payment schedule for total invoice amount
    INSERT INTO public.payment_schedules (
      photographer_id,
      invoice_id,
      payment_name,
      schedule_type,
      amount,
      due_date,
      notes
    ) VALUES (
      NEW.photographer_id,
      NEW.id,
      'Invoice Payment',
      'invoice',
      NEW.total_amount,
      NEW.due_date,
      'Payment for invoice: ' || NEW.invoice_number
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;