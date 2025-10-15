-- Remove the security definer function and use a simpler approach
-- Drop the security definer function that's causing issues
DROP FUNCTION IF EXISTS public.verify_gallery_access_code(UUID, TEXT);

-- Check what views exist and might be causing the security definer view warning
-- The view we created should be fine, but let's verify the exact structure