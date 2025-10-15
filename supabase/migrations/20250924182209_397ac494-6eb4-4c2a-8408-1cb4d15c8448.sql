-- Add client status and deposit amount to invoices
ALTER TABLE public.clients ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.invoices ADD COLUMN deposit_amount NUMERIC DEFAULT 0;

-- Update payment schedules to support paid_amount and proper completion tracking
ALTER TABLE public.payment_schedules ADD COLUMN paid_amount NUMERIC DEFAULT 0;

-- Add check constraint for client status
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check 
CHECK (status IN ('active', 'blacklisted'));

-- Create function to handle client deletion with cascade
CREATE OR REPLACE FUNCTION public.delete_client_cascade(client_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete related payment schedules first
  DELETE FROM public.payment_schedules WHERE booking_id IN (
    SELECT id FROM public.bookings WHERE client_id = client_uuid
  );
  DELETE FROM public.payment_schedules WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE client_id = client_uuid
  );
  
  -- Delete related invoices
  DELETE FROM public.invoices WHERE client_id = client_uuid;
  
  -- Delete related bookings
  DELETE FROM public.bookings WHERE client_id = client_uuid;
  
  -- Finally delete the client
  DELETE FROM public.clients WHERE id = client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-create payment schedules when invoice is created
CREATE OR REPLACE FUNCTION public.create_payment_schedules_for_invoice()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating payment schedules
CREATE TRIGGER create_payment_schedules_on_invoice_insert
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_schedules_for_invoice();

-- Create function to update invoice status when payment schedules are completed
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_amount_due NUMERIC;
  total_paid_amount NUMERIC;
  invoice_id_var UUID;
BEGIN
  -- Get invoice_id from the payment schedule
  invoice_id_var := COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  IF invoice_id_var IS NOT NULL THEN
    -- Calculate total amounts for this invoice
    SELECT 
      COALESCE(SUM(amount), 0),
      COALESCE(SUM(paid_amount), 0)
    INTO total_amount_due, total_paid_amount
    FROM public.payment_schedules 
    WHERE invoice_id = invoice_id_var;
    
    -- If fully paid, update invoice status
    IF total_paid_amount >= total_amount_due THEN
      UPDATE public.invoices 
      SET 
        status = 'paid',
        payment_date = CURRENT_DATE
      WHERE id = invoice_id_var;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment completion
CREATE TRIGGER update_invoice_on_payment_update
  AFTER UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_on_payment_completion();