-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_access_level integer NOT NULL DEFAULT 0,
ADD COLUMN active_date date,
ADD COLUMN expire_date date;

-- Create a function to check if user is free account
CREATE OR REPLACE FUNCTION public.is_free_account(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT user_access_level = 0 
     FROM public.profiles 
     WHERE user_id = user_uuid),
    true
  );
$$;

-- Function to enforce client limit for free users
CREATE OR REPLACE FUNCTION public.enforce_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_count integer;
  is_free boolean;
BEGIN
  SELECT public.is_free_account(NEW.photographer_id) INTO is_free;
  
  IF is_free THEN
    SELECT COUNT(*) INTO client_count
    FROM public.clients
    WHERE photographer_id = NEW.photographer_id;
    
    IF client_count >= 1 THEN
      RAISE EXCEPTION 'Free account users can only create 1 client. Please upgrade to create more.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to enforce booking limit for free users
CREATE OR REPLACE FUNCTION public.enforce_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_count integer;
  is_free boolean;
BEGIN
  SELECT public.is_free_account(NEW.photographer_id) INTO is_free;
  
  IF is_free THEN
    SELECT COUNT(*) INTO booking_count
    FROM public.bookings
    WHERE photographer_id = NEW.photographer_id;
    
    IF booking_count >= 1 THEN
      RAISE EXCEPTION 'Free account users can only create 1 booking. Please upgrade to create more.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to enforce invoice limit for free users
CREATE OR REPLACE FUNCTION public.enforce_invoice_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_count integer;
  is_free boolean;
BEGIN
  SELECT public.is_free_account(NEW.photographer_id) INTO is_free;
  
  IF is_free THEN
    SELECT COUNT(*) INTO invoice_count
    FROM public.invoices
    WHERE photographer_id = NEW.photographer_id;
    
    IF invoice_count >= 1 THEN
      RAISE EXCEPTION 'Free account users can only create 1 invoice. Please upgrade to create more.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers to enforce limits
CREATE TRIGGER enforce_client_limit_trigger
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_limit();

CREATE TRIGGER enforce_booking_limit_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_limit();

CREATE TRIGGER enforce_invoice_limit_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_limit();

-- Function to downgrade expired paid accounts to free
CREATE OR REPLACE FUNCTION public.downgrade_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET user_access_level = 0,
      active_date = NULL,
      expire_date = NULL
  WHERE user_access_level > 0
    AND expire_date IS NOT NULL
    AND expire_date < CURRENT_DATE;
END;
$$;