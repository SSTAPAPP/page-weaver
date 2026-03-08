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

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  const user = await response.json();
  if (!user?.id) return null;
  return { userId: user.id };
}

interface CartItemInput {
  serviceId: string;
  serviceName: string;
  price: number;
  useCard: boolean;
  cardId?: string;
}

interface CheckoutRequest {
  memberId?: string;
  memberName: string;
  cart: CartItemInput[];
  paymentMethod: string;
  isWalkIn: boolean;
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
    const { memberId, memberName, cart, paymentMethod, isWalkIn } = body;

    if (!cart || cart.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Cart is empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!memberName || typeof memberName !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid member name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // ── Server-side price validation ──
    // Fetch actual service prices from DB to prevent client-side tampering
    const serviceIds = [...new Set(cart.map(item => item.serviceId))];
    const { data: dbServices, error: svcErr } = await supabase
      .from('services')
      .select('id, price, name')
      .in('id', serviceIds)
      .eq('is_active', true);

    if (svcErr || !dbServices) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to validate services' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceMap = new Map(dbServices.map(s => [s.id, s.price]));

    // Validate all service IDs exist and are active
    for (const item of cart) {
      if (!priceMap.has(item.serviceId)) {
        return new Response(JSON.stringify({
          success: false,
          error: `Service ${item.serviceName} is no longer available`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build server-validated cart with DB prices (ignore client prices)
    const validatedCart = cart.map(item => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      price: priceMap.get(item.serviceId)!, // Use DB price, not client price
      useCard: item.useCard,
      cardId: item.cardId || null,
    }));

    // ── Server-side amount calculation ──
    let serverCardDeductTotal = 0;
    let serverNeedPayTotal = 0;

    for (const item of validatedCart) {
      if (!isWalkIn && item.useCard && item.cardId) {
        serverCardDeductTotal += item.price;
      } else {
        serverNeedPayTotal += item.price;
      }
    }

    // For members: calculate balance deduction server-side
    let serverBalanceDeduct = 0;
    if (!isWalkIn && memberId) {
      const { data: member, error: memErr } = await supabase
        .from('members')
        .select('balance')
        .eq('id', memberId)
        .single();

      if (memErr || !member) {
        return new Response(JSON.stringify({ success: false, error: 'Member not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      serverBalanceDeduct = Math.min(member.balance || 0, serverNeedPayTotal);
    }

    const serverCashNeed = serverNeedPayTotal - serverBalanceDeduct;
    const serverTotal = serverCardDeductTotal + serverNeedPayTotal;

    // Determine actual member_id for walk-ins
    const effectiveMemberId = isWalkIn
      ? `walk-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      : memberId;

    if (!effectiveMemberId) {
      return new Response(JSON.stringify({ success: false, error: 'Member ID is required for non-walk-in checkout' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Call atomic RPC ──
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_checkout', {
      p_member_id: effectiveMemberId,
      p_member_name: memberName,
      p_is_walk_in: isWalkIn,
      p_cart: JSON.stringify(validatedCart),
      p_payment_method: paymentMethod || 'cash',
      p_balance_deduct: serverBalanceDeduct,
      p_cash_need: serverCashNeed,
      p_card_deduct_total: serverCardDeductTotal,
      p_total: serverTotal,
    });

    if (rpcErr) {
      console.error('process_checkout RPC failed:', rpcErr);
      return new Response(JSON.stringify({
        success: false,
        error: rpcErr.message || 'Checkout transaction failed',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

    if (!result?.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result?.error || 'Checkout failed',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      transaction_id: result.transaction_id,
      order_id: result.order_id,
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
