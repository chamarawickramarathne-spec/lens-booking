-- Final fix: Use a simple approach to prevent access_code exposure
-- Drop the view approach and instead fix the RLS policies directly
DROP VIEW IF EXISTS public.public_galleries;

-- The core issue: access_code should never be visible to unauthorized users
-- Solution: Modify the existing RLS policy to be more restrictive

-- First, let's see what policies exist now and clean them up
DROP POLICY IF EXISTS "Photographers can access their galleries with sensitive data" ON public.galleries;

-- Restore the basic policies but with proper security
-- Photographers can view/manage their own galleries (including access_code)
CREATE POLICY "Photographers can view their own galleries" 
ON public.galleries 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their own galleries" 
ON public.galleries 
FOR UPDATE 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create galleries" 
ON public.galleries 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

-- CRITICAL: No policy for public access to the galleries table directly
-- This means access_code will never be exposed through direct table queries

-- Instead, create a function that returns safe gallery data for public access
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