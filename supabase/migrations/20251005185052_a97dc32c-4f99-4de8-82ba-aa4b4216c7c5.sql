-- Add currency_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency_type text DEFAULT 'USD' NOT NULL;