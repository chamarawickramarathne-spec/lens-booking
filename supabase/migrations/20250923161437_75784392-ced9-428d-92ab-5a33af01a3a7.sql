-- Add new booking statuses and create function for automatic invoice creation
-- Update booking status enum to include new statuses
ALTER TABLE public.bookings 
ALTER COLUMN status TYPE text;

-- Add check constraint for valid booking statuses
ALTER TABLE public.bookings 
ADD CONSTRAINT booking_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'cancel_by_client'));

-- Create function to automatically create invoice when booking is confirmed
CREATE OR REPLACE FUNCTION public.create_invoice_for_confirmed_booking()
RETURNS TRIGGER AS $$
DECLARE
  invoice_number TEXT;
  client_rec RECORD;
BEGIN
  -- Only create invoice when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get client information
    SELECT * INTO client_rec FROM public.clients WHERE id = NEW.client_id;
    
    -- Generate invoice number
    invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    
    -- Create draft invoice
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
      COALESCE(NEW.total_amount, 0),
      0,
      COALESCE(NEW.total_amount, 0),
      'draft',
      'Auto-generated invoice for confirmed booking: ' || NEW.title
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic invoice creation
CREATE TRIGGER create_invoice_on_booking_confirmation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invoice_for_confirmed_booking();

-- Create function to cancel related invoices when booking is cancelled
CREATE OR REPLACE FUNCTION public.cancel_invoice_for_cancelled_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancel related invoices when booking is cancelled or cancelled by client
  IF NEW.status IN ('cancelled', 'cancel_by_client') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'cancel_by_client')) THEN
    
    UPDATE public.invoices 
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE booking_id = NEW.id 
    AND photographer_id = NEW.photographer_id
    AND status != 'paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invoice cancellation
CREATE TRIGGER cancel_invoice_on_booking_cancellation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_invoice_for_cancelled_booking();