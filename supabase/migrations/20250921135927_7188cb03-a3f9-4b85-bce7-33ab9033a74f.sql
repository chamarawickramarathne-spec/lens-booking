-- Fix security issues from previous migration

-- 1. Fix the security definer view - remove security_barrier and use a regular view
DROP VIEW IF EXISTS public.public_galleries;

-- Create a regular view without security definer
CREATE VIEW public.public_galleries AS 
SELECT 
  id,
  title,
  description,
  photographer_id,
  client_id,
  booking_id,
  is_public,
  created_at,
  updated_at,
  expiry_date
  -- Deliberately exclude access_code from public view
FROM public.galleries 
WHERE is_public = true;

-- 2. Fix the function search path issue
CREATE OR REPLACE FUNCTION public.verify_gallery_access_code(gallery_id UUID, provided_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow access code verification for galleries that have access codes
  RETURN EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE id = gallery_id 
    AND access_code IS NOT NULL 
    AND access_code = provided_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Simplify RLS policies to be more secure
-- Drop the complex policies that might cause issues
DROP POLICY IF EXISTS "Public galleries viewable without access codes" ON public.galleries;
DROP POLICY IF EXISTS "Gallery access verification" ON public.galleries;

-- Create a simple, secure policy that only allows photographers to see their own galleries
-- Public access will go through the public_galleries view instead
CREATE POLICY "Photographers can access their galleries with sensitive data" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() = photographer_id);

-- Grant appropriate access to the view
GRANT SELECT ON public.public_galleries TO authenticated, anon;

-- Revoke direct access to galleries table for non-owners to prevent access_code exposure
REVOKE SELECT ON public.galleries FROM anon;