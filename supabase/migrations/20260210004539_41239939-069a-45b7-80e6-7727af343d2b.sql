
-- ===== 修复9: Rate Limits Table + RPC =====
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - only accessed via service role from Edge Functions

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
  FROM public.rate_limits WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, now());
    RETURN TRUE;
  END IF;

  IF now() > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN TRUE;
  END IF;

  IF v_count >= p_max THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$;

-- ===== 修复2: Atomic Balance Operations =====
CREATE OR REPLACE FUNCTION public.increment_member_balance(
  p_member_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE public.members
  SET balance = balance + p_amount, updated_at = now()
  WHERE id = p_member_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found: %', p_member_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_member_balance(
  p_member_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT balance INTO v_current_balance FROM public.members WHERE id = p_member_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found: %', p_member_id;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: current=%, requested=%', v_current_balance, p_amount;
  END IF;

  UPDATE public.members
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_member_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- ===== 修复1: Atomic Checkout RPC =====
CREATE OR REPLACE FUNCTION public.process_checkout(
  p_member_id TEXT,
  p_member_name TEXT,
  p_is_walk_in BOOLEAN,
  p_cart JSONB,
  p_payment_method TEXT,
  p_balance_deduct NUMERIC,
  p_cash_need NUMERIC,
  p_card_deduct_total NUMERIC,
  p_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item JSONB;
  v_sub_transactions JSONB := '[]'::JSONB;
  v_service_names TEXT := '';
  v_main_type TEXT;
  v_main_description TEXT;
  v_order_services JSONB := '[]'::JSONB;
  v_order_payments JSONB := '[]'::JSONB;
  v_transaction_id UUID;
  v_order_id UUID;
BEGIN
  -- Process each cart item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    -- Build service names
    IF v_service_names != '' THEN
      v_service_names := v_service_names || ', ';
    END IF;
    v_service_names := v_service_names || (v_item->>'serviceName');

    -- Add to order services
    v_order_services := v_order_services || jsonb_build_object(
      'serviceId', v_item->>'serviceId',
      'serviceName', v_item->>'serviceName',
      'price', (v_item->>'price')::NUMERIC,
      'useCard', (v_item->>'useCard')::BOOLEAN,
      'cardId', v_item->>'cardId'
    );

    -- Deduct card if applicable
    IF (v_item->>'useCard')::BOOLEAN AND v_item->>'cardId' IS NOT NULL THEN
      UPDATE public.member_cards
      SET remaining_count = remaining_count - 1
      WHERE id = (v_item->>'cardId')::UUID AND remaining_count > 0;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Card deduction failed for card %', v_item->>'cardId';
      END IF;

      v_sub_transactions := v_sub_transactions || jsonb_build_object(
        'type', 'card',
        'amount', (v_item->>'price')::NUMERIC,
        'cardId', v_item->>'cardId'
      );
    END IF;
  END LOOP;

  -- Deduct balance if applicable
  IF NOT p_is_walk_in AND p_balance_deduct > 0 THEN
    UPDATE public.members
    SET balance = balance - p_balance_deduct, updated_at = now()
    WHERE id = p_member_id::UUID AND balance >= p_balance_deduct;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Balance deduction failed for member %', p_member_id;
    END IF;

    v_sub_transactions := v_sub_transactions || jsonb_build_object(
      'type', 'balance',
      'amount', p_balance_deduct
    );
  END IF;

  -- Add price diff sub-transaction if applicable
  IF p_cash_need > 0 THEN
    v_sub_transactions := v_sub_transactions || jsonb_build_object(
      'type', 'price_diff',
      'amount', p_cash_need,
      'paymentMethod', p_payment_method
    );
  END IF;

  -- Determine transaction type and description
  IF p_is_walk_in THEN
    v_main_type := 'consume';
    v_main_description := '散客消费 - ' || v_service_names;
  ELSE
    IF p_card_deduct_total > 0 THEN
      v_main_type := 'card_deduct';
    ELSE
      v_main_type := 'consume';
    END IF;
    IF p_cash_need > 0 THEN
      v_main_description := v_service_names || ' (含补差价¥' || p_cash_need || ')';
    ELSE
      v_main_description := v_service_names;
    END IF;
  END IF;

  -- Insert transaction
  INSERT INTO public.transactions (
    member_id, member_name, type, amount,
    payment_method, description, voided, sub_transactions
  ) VALUES (
    p_member_id,
    p_member_name,
    v_main_type,
    CASE WHEN p_is_walk_in THEN p_total
         ELSE p_card_deduct_total + p_balance_deduct END,
    CASE WHEN p_is_walk_in THEN p_payment_method
         WHEN p_balance_deduct > 0 THEN 'balance'
         ELSE NULL END,
    v_main_description,
    false,
    CASE WHEN jsonb_array_length(v_sub_transactions) > 0 THEN v_sub_transactions ELSE NULL END
  ) RETURNING id INTO v_transaction_id;

  -- Build order payments
  IF p_card_deduct_total > 0 THEN
    v_order_payments := v_order_payments || jsonb_build_object('method', 'card', 'amount', p_card_deduct_total);
  END IF;
  IF p_balance_deduct > 0 THEN
    v_order_payments := v_order_payments || jsonb_build_object('method', 'balance', 'amount', p_balance_deduct);
  END IF;
  IF p_cash_need > 0 THEN
    v_order_payments := v_order_payments || jsonb_build_object('method', p_payment_method, 'amount', p_cash_need);
  END IF;
  IF p_is_walk_in AND p_card_deduct_total = 0 AND p_balance_deduct = 0 THEN
    v_order_payments := v_order_payments || jsonb_build_object('method', p_payment_method, 'amount', p_total);
  END IF;

  -- Insert order
  INSERT INTO public.orders (
    member_id, member_name, services, total_amount, payments
  ) VALUES (
    p_member_id,
    p_member_name,
    v_order_services,
    p_total,
    v_order_payments
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'order_id', v_order_id
  );
END;
$$;

-- Clean up old rate limit records periodically (optional index)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);
