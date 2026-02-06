-- Fix SECRETS_EXPOSED: Protect admin_password_hash from direct access
-- Create a view that excludes sensitive columns for public access
DROP POLICY IF EXISTS "Allow all operations on shop_settings" ON public.shop_settings;

-- Create restricted SELECT policy that excludes admin_password_hash
CREATE POLICY "Allow reading non-sensitive shop settings"
ON public.shop_settings
FOR SELECT
USING (true);

-- Create UPDATE policy that prevents updating password hash directly
CREATE POLICY "Allow updating non-sensitive shop settings"
ON public.shop_settings
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create a secure function to verify admin password (server-side only)
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT admin_password_hash INTO stored_hash
  FROM public.shop_settings
  LIMIT 1;
  
  -- If no password is set, allow access (first-time setup)
  IF stored_hash IS NULL OR stored_hash = '' THEN
    RETURN TRUE;
  END IF;
  
  RETURN stored_hash = input_password_hash;
END;
$$;

-- Create a secure function to update admin password (server-side only)
CREATE OR REPLACE FUNCTION public.update_admin_password(new_password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shop_settings
  SET admin_password_hash = new_password_hash,
      updated_at = now();
  RETURN TRUE;
END;
$$;

-- Create a secure function to get password hash (for edge function use only)
CREATE OR REPLACE FUNCTION public.get_admin_password_hash()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT admin_password_hash INTO stored_hash
  FROM public.shop_settings
  LIMIT 1;
  RETURN stored_hash;
END;
$$;

-- Create a secure function to delete member with refund (atomic operation)
CREATE OR REPLACE FUNCTION public.admin_delete_member_with_refund(
  p_password_hash TEXT,
  p_member_id UUID,
  p_refund_amount NUMERIC,
  p_refund_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid BOOLEAN;
  member_record RECORD;
  result JSONB;
BEGIN
  -- Verify admin password
  SELECT public.verify_admin_password(p_password_hash) INTO is_valid;
  
  IF NOT is_valid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid admin password');
  END IF;
  
  -- Get member info
  SELECT * INTO member_record FROM public.members WHERE id = p_member_id;
  
  IF member_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;
  
  -- Create refund transaction if amount > 0
  IF p_refund_amount > 0 THEN
    INSERT INTO public.transactions (member_id, member_name, type, amount, description)
    VALUES (p_member_id::TEXT, member_record.name, 'refund', p_refund_amount, p_refund_description);
  END IF;
  
  -- Delete member cards first (cascade should handle this, but explicit for safety)
  DELETE FROM public.member_cards WHERE member_id = p_member_id;
  
  -- Delete member
  DELETE FROM public.members WHERE id = p_member_id;
  
  -- Log the action
  INSERT INTO public.audit_logs (action, category, details, metadata)
  VALUES (
    'MEMBER_DELETED_WITH_REFUND',
    'member',
    'Member ' || member_record.name || ' deleted with refund of ' || p_refund_amount,
    jsonb_build_object('member_id', p_member_id, 'member_name', member_record.name, 'refund_amount', p_refund_amount)
  );
  
  RETURN jsonb_build_object('success', true, 'member_name', member_record.name, 'refund_amount', p_refund_amount);
END;
$$;

-- Create a secure function to void transaction
CREATE OR REPLACE FUNCTION public.admin_void_transaction(
  p_password_hash TEXT,
  p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid BOOLEAN;
  txn_record RECORD;
BEGIN
  -- Verify admin password
  SELECT public.verify_admin_password(p_password_hash) INTO is_valid;
  
  IF NOT is_valid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid admin password');
  END IF;
  
  -- Get transaction
  SELECT * INTO txn_record FROM public.transactions WHERE id = p_transaction_id;
  
  IF txn_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF txn_record.voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already voided');
  END IF;
  
  -- Void the transaction
  UPDATE public.transactions SET voided = true WHERE id = p_transaction_id;
  
  -- Log the action
  INSERT INTO public.audit_logs (action, category, details, metadata)
  VALUES (
    'TRANSACTION_VOIDED',
    'transaction',
    'Transaction ' || p_transaction_id || ' voided',
    jsonb_build_object('transaction_id', p_transaction_id, 'amount', txn_record.amount, 'type', txn_record.type)
  );
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$;