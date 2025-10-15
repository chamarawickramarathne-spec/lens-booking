-- Clean up duplicate policies and ensure proper security
-- Remove all existing policies first
DROP POLICY IF EXISTS "Photographers can view their own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can access their galleries with sensitive data" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Photographers can update their own galleries" ON public.galleries;

-- Create clean, secure policies
-- Only photographers can access their own galleries (with all sensitive data)
CREATE POLICY "Photographers can view their own galleries" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own galleries" 
ON public.galleries 
FOR UPDATE 
USING (auth.uid() = photographer_id);

-- IMPORTANT: No public policy means access_code is never exposed to unauthorized users

-- Create a safe function for public gallery access (without access_code)
CREATE OR REPLACE FUNCTION public.get_public_gallery_info(gallery_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  photographer_id UUID,
  client_id UUID,
  booking_id UUID,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expiry_date DATE
) 
LANGUAGE SQL 
STABLE 
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.title,
    g.description,
    g.photographer_id,
    g.client_id,
    g.booking_id,
    g.is_public,
    g.created_at,
    g.updated_at,
    g.expiry_date
  FROM public.galleries g
  WHERE g.is_public = true
  AND (gallery_id IS NULL OR g.id = gallery_id);
$$;