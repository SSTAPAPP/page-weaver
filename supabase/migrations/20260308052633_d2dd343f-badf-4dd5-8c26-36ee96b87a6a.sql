CREATE OR REPLACE FUNCTION public.process_checkout(p_member_id text, p_member_name text, p_is_walk_in boolean, p_cart jsonb, p_payment_method text, p_balance_deduct numeric, p_cash_need numeric, p_card_deduct_total numeric, p_total numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    IF v_service_names != '' THEN
      v_service_names := v_service_names || ', ';
    END IF;
    v_service_names := v_service_names || (v_item->>'serviceName');

    v_order_services := v_order_services || jsonb_build_object(
      'serviceId', v_item->>'serviceId',
      'serviceName', v_item->>'serviceName',
      'price', (v_item->>'price')::NUMERIC,
      'useCard', (v_item->>'useCard')::BOOLEAN,
      'cardId', v_item->>'cardId'
    );

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

  -- price_diff sub-transaction ONLY for members, NOT walk-ins
  IF NOT p_is_walk_in AND p_cash_need > 0 THEN
    v_sub_transactions := v_sub_transactions || jsonb_build_object(
      'type', 'price_diff',
      'amount', p_cash_need,
      'paymentMethod', p_payment_method
    );
  END IF;

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

  INSERT INTO public.transactions (
    member_id, member_name, type, amount,
    payment_method, description, voided, sub_transactions
  ) VALUES (
    p_member_id, p_member_name, v_main_type,
    CASE WHEN p_is_walk_in THEN p_total
         ELSE p_card_deduct_total + p_balance_deduct END,
    CASE WHEN p_is_walk_in THEN p_payment_method
         WHEN p_balance_deduct > 0 THEN 'balance'
         ELSE NULL END,
    v_main_description, false,
    CASE WHEN jsonb_array_length(v_sub_transactions) > 0 THEN v_sub_transactions ELSE NULL END
  ) RETURNING id INTO v_transaction_id;

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

  INSERT INTO public.orders (
    member_id, member_name, services, total_amount, payments
  ) VALUES (
    p_member_id, p_member_name, v_order_services, p_total, v_order_payments
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'order_id', v_order_id
  );
END;
$function$;