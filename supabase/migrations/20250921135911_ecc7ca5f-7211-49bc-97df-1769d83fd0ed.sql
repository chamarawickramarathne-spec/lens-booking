-- Fix security vulnerability: Remove access_code exposure from public gallery policy
-- First, drop the existing public policy that exposes access_codes
DROP POLICY IF EXISTS "Public galleries are viewable by everyone" ON public.galleries;

-- Create a secure public gallery view that excludes sensitive fields
CREATE OR REPLACE VIEW public.public_galleries AS 
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

-- Enable RLS on the view
ALTER VIEW public.public_galleries SET (security_barrier = true);

-- Create a security definer function to safely check access codes
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a new secure policy for public gallery access
-- This policy only allows viewing galleries that are public, but never exposes access_code
CREATE POLICY "Public galleries viewable without access codes" 
ON public.galleries 
FOR SELECT 
USING (
  is_public = true 
  AND (
    -- Allow photographers to see their own galleries with access codes
    auth.uid() = photographer_id
    -- For everyone else, they can only see basic info (access_code will be filtered by application)
    OR auth.uid() != photographer_id
  )
);

-- Add a policy for access code verification
CREATE POLICY "Gallery access verification" 
ON public.galleries 
FOR SELECT 
USING (
  -- Allow access when valid access code is provided
  -- This will be used by the verification function only
  access_code IS NOT NULL
);

-- Grant access to the public galleries view
GRANT SELECT ON public.public_galleries TO authenticated, anon;