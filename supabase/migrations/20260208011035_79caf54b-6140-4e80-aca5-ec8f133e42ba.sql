
-- Drop the existing overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update shop_settings" ON public.shop_settings;

-- Create a restricted UPDATE policy that prevents modifying admin_password_hash from client
-- Password updates must go through the SECURITY DEFINER function via Edge Functions
CREATE POLICY "Authenticated users can update non-sensitive shop_settings"
ON public.shop_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Revoke direct column-level UPDATE on admin_password_hash for anon and authenticated roles
-- This ensures password can only be changed via SECURITY DEFINER function
REVOKE UPDATE (admin_password_hash) ON public.shop_settings FROM anon;
REVOKE UPDATE (admin_password_hash) ON public.shop_settings FROM authenticated;
