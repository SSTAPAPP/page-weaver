CREATE OR REPLACE FUNCTION public.update_admin_password(new_password_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.shop_settings
  SET admin_password_hash = new_password_hash,
      updated_at = now()
  WHERE id = (SELECT id FROM public.shop_settings LIMIT 1);
  RETURN TRUE;
END;
$function$;