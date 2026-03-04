-- Revoke execute from authenticated role so clients cannot call it
REVOKE EXECUTE ON FUNCTION public.get_admin_password_hash() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_password_hash() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_password_hash() FROM public;