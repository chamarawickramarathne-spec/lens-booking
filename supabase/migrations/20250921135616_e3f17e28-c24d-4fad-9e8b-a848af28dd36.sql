-- Create payment_schedules table
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  invoice_id UUID REFERENCES public.invoices(id),
  schedule_type TEXT NOT NULL DEFAULT 'custom', -- deposit, milestone, final, custom
  payment_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Photographers can view their own payment schedules" 
ON public.payment_schedules 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create payment schedules" 
ON public.payment_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own payment schedules" 
ON public.payment_schedules 
FOR UPDATE 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete their own payment schedules" 
ON public.payment_schedules 
FOR DELETE 
USING (auth.uid() = photographer_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_schedules_updated_at
BEFORE UPDATE ON public.payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();