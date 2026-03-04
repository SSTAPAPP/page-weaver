import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  const env = Deno.env.get('ENVIRONMENT') || 'development';
  
  let origin = '*';
  if (env === 'production') {
    if (requestOrigin && (
      requestOrigin === `https://${allowedOrigin}` ||
      requestOrigin.endsWith('.lovable.app') ||
      requestOrigin.endsWith('.lovableproject.com')
    )) {
      origin = requestOrigin;
    } else {
      origin = `https://${allowedOrigin}`;
    }
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id };
}

interface CartItem {
  serviceId: string;
  serviceName: string;
  price: number;
  useCard: boolean;
  cardId?: string;
}

interface CheckoutRequest {
  memberId?: string;
  memberName: string;
  cart: CartItem[];
  paymentMethod: string;
  isWalkIn: boolean;
  balanceDeduct: number;
  cardDeductTotal: number;
  cashNeed: number;
  total: number;
  cardUsageMap: Record<string, number>; // cardId -> deduct count
  subTransactions?: { type: string; amount: number; paymentMethod?: string; cardId?: string }[];
  transactionType?: string;
  transactionDescription?: string;
  payments: { method: string; amount: number }[];
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CheckoutRequest = await req.json();
    const {
      memberId, memberName, cart, paymentMethod, isWalkIn,
      balanceDeduct, cardDeductTotal, cashNeed, total,
      cardUsageMap, subTransactions, transactionType,
      transactionDescription, payments,
    } = body;

    if (!cart || cart.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Cart is empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseClient();

    // 1. Process card deductions atomically
    if (!isWalkIn && cardUsageMap) {
      for (const [cardId, deductCount] of Object.entries(cardUsageMap)) {
        if (deductCount > 0) {
          // Use atomic decrement to avoid race conditions
          const { data: card, error: cardErr } = await supabase
            .from('member_cards')
            .select('remaining_count')
            .eq('id', cardId)
            .single();

          if (cardErr || !card) {
            return new Response(JSON.stringify({ success: false, error: `Card ${cardId} not found` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (card.remaining_count < deductCount) {
            return new Response(JSON.stringify({ success: false, error: `Card has insufficient remaining count` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const { error: updateErr } = await supabase
            .from('member_cards')
            .update({ remaining_count: card.remaining_count - deductCount })
            .eq('id', cardId);

          if (updateErr) {
            return new Response(JSON.stringify({ success: false, error: 'Failed to deduct card' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // 2. Process balance deduction
    if (!isWalkIn && memberId && balanceDeduct > 0) {
      const { error: balErr } = await supabase.rpc('decrement_member_balance', {
        p_member_id: memberId,
        p_amount: balanceDeduct,
      });

      if (balErr) {
        console.error('Balance deduction failed:', balErr);
        return new Response(JSON.stringify({ success: false, error: 'Failed to deduct balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Create transaction
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .insert({
        member_id: memberId || `walk-in-${Date.now()}`,
        member_name: memberName,
        type: transactionType || 'consume',
        amount: cardDeductTotal + balanceDeduct,
        payment_method: balanceDeduct > 0 ? 'balance' : (cashNeed > 0 ? paymentMethod : undefined),
        description: transactionDescription || '',
        sub_transactions: subTransactions || null,
        voided: false,
      })
      .select('id')
      .single();

    if (txErr) {
      console.error('Transaction creation failed:', txErr);
      return new Response(JSON.stringify({ success: false, error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create order
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        member_id: memberId || txData?.id,
        member_name: memberName,
        services: cart.map(item => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          price: item.price,
          useCard: item.useCard,
          cardId: item.cardId,
        })),
        total_amount: total,
        payments,
      })
      .select('id')
      .single();

    if (orderErr) {
      console.error('Order creation failed:', orderErr);
      // Transaction already created, log the error but don't fail
    }

    return new Response(JSON.stringify({
      success: true,
      transaction_id: txData?.id,
      order_id: orderData?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
