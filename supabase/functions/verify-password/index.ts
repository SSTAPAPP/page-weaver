import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Dynamic CORS based on environment
function getCorsHeaders(): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  const env = Deno.env.get('ENVIRONMENT') || 'development';
  return {
    'Access-Control-Allow-Origin': env === 'production' ? allowedOrigin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const app = new Hono().basePath('/verify-password');

// Server-side password hashing with environment salt
async function hashPassword(password: string): Promise<string> {
  const salt = Deno.env.get('ADMIN_PASSWORD_SALT') || 'ffk-shop-2024-salt';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify JWT and return authenticated user ID
async function verifyAuth(c: any): Promise<{ userId: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  return { userId: user.id };
}

// DB-based rate limiting via check_rate_limit RPC
async function checkRateLimit(ip: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `password_verify:${ip}`,
    p_max: 5,
    p_window_seconds: 60,
  });
  if (error) {
    console.error('Rate limit check failed:', error);
    return true; // fail open to avoid blocking legitimate requests
  }
  return data === true;
}

// Get Supabase client with service role for secure operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Handle CORS preflight
app.options('*', (c) => {
  return new Response(null, { headers: getCorsHeaders() });
});

// Verify password endpoint (requires auth)
app.post('/verify', async (c) => {
  const corsHeaders = getCorsHeaders();
  try {
    const auth = await verifyAuth(c);
    if (!auth) {
      return c.json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!(await checkRateLimit(clientIp))) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { password } = await c.req.json();
    
    if (!password) {
      return c.json({ 
        success: false, 
        error: 'Password is required' 
      }, 400, corsHeaders);
    }
    
    const inputHash = await hashPassword(password);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.rpc('verify_admin_password', {
      input_password_hash: inputHash
    });
    
    if (error) {
      console.error('Error verifying password:', error);
      return c.json({ 
        success: false, 
        error: 'Verification failed' 
      }, 500, corsHeaders);
    }
    
    return c.json({ 
      success: data === true
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error verifying password:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Update password endpoint (requires auth)
app.post('/update-password', async (c) => {
  const corsHeaders = getCorsHeaders();
  try {
    const auth = await verifyAuth(c);
    if (!auth) {
      return c.json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!(await checkRateLimit(clientIp))) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!newPassword) {
      return c.json({ 
        success: false, 
        error: 'New password is required' 
      }, 400, corsHeaders);
    }
    
    const supabase = getSupabaseClient();
    
    if (currentPassword) {
      const currentHash = await hashPassword(currentPassword);
      const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_password', {
        input_password_hash: currentHash
      });
      
      if (verifyError || !isValid) {
        return c.json({ 
          success: false, 
          error: 'Current password is incorrect' 
        }, 401, corsHeaders);
      }
    }
    
    const newHash = await hashPassword(newPassword);
    const { error } = await supabase.rpc('update_admin_password', {
      new_password_hash: newHash
    });
    
    if (error) {
      console.error('Error updating password:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to update password' 
      }, 500, corsHeaders);
    }
    
    return c.json({ 
      success: true
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Delete member with refund (requires auth)
app.post('/delete-member', async (c) => {
  const corsHeaders = getCorsHeaders();
  try {
    const auth = await verifyAuth(c);
    if (!auth) {
      return c.json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!(await checkRateLimit(clientIp))) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { password, memberId, refundAmount, refundDescription } = await c.req.json();
    
    if (!password || !memberId) {
      return c.json({ 
        success: false, 
        error: 'Password and member ID are required' 
      }, 400, corsHeaders);
    }
    
    const inputHash = await hashPassword(password);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.rpc('admin_delete_member_with_refund', {
      p_password_hash: inputHash,
      p_member_id: memberId,
      p_refund_amount: refundAmount || 0,
      p_refund_description: refundDescription || 'Member deletion refund'
    });
    
    if (error) {
      console.error('Error deleting member:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to delete member' 
      }, 500, corsHeaders);
    }
    
    return c.json(data, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error deleting member:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Void transaction (requires auth)
app.post('/void-transaction', async (c) => {
  const corsHeaders = getCorsHeaders();
  try {
    const auth = await verifyAuth(c);
    if (!auth) {
      return c.json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!(await checkRateLimit(clientIp))) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { password, transactionId } = await c.req.json();
    
    if (!password || !transactionId) {
      return c.json({ 
        success: false, 
        error: 'Password and transaction ID are required' 
      }, 400, corsHeaders);
    }
    
    const inputHash = await hashPassword(password);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.rpc('admin_void_transaction', {
      p_password_hash: inputHash,
      p_transaction_id: transactionId
    });
    
    if (error) {
      console.error('Error voiding transaction:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to void transaction' 
      }, 500, corsHeaders);
    }
    
    return c.json(data, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error voiding transaction:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Refund transaction (requires auth)
app.post('/refund-transaction', async (c) => {
  const corsHeaders = getCorsHeaders();
  try {
    const auth = await verifyAuth(c);
    if (!auth) {
      return c.json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!(await checkRateLimit(clientIp))) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { 
      password, 
      transactionId, 
      memberId, 
      memberName,
      originalAmount,
      description,
      subTransactions,
      paymentMethod
    } = await c.req.json();
    
    if (!password || !transactionId || !memberId) {
      return c.json({ 
        success: false, 
        error: 'Password, transaction ID, and member ID are required' 
      }, 400, corsHeaders);
    }
    
    const inputHash = await hashPassword(password);
    const supabase = getSupabaseClient();
    
    // Verify admin password server-side
    const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_password', {
      input_password_hash: inputHash
    });
    
    if (verifyError || !isValid) {
      return c.json({ 
        success: false, 
        error: 'Invalid admin password' 
      }, 401, corsHeaders);
    }
    
    const fundTrail: string[] = [];
    let totalRefundAmount = originalAmount || 0;
    
    // Process subTransactions for refunds
    if (subTransactions && subTransactions.length > 0) {
      for (const sub of subTransactions) {
        if (sub.type === 'card' && sub.cardId) {
          const { data: card } = await supabase
            .from('member_cards')
            .select('remaining_count')
            .eq('id', sub.cardId)
            .single();
          
          if (card) {
            await supabase
              .from('member_cards')
              .update({ remaining_count: card.remaining_count + 1 })
              .eq('id', sub.cardId);
          }
          fundTrail.push(`次卡退回1次 (¥${sub.amount})`);
        }
        
        if (sub.type === 'balance') {
          await supabase.rpc('increment_member_balance', {
            p_member_id: memberId,
            p_amount: sub.amount,
          });
          fundTrail.push(`余额退回 ¥${sub.amount}`);
        }
        
        if (sub.type === 'price_diff') {
          const paymentMethodMap: Record<string, string> = {
            balance: "余额", wechat: "微信", alipay: "支付宝", cash: "现金"
          };
          fundTrail.push(`⚠️ 补差价 ¥${sub.amount} 需手动退还 (${paymentMethodMap[sub.paymentMethod || 'cash']})`);
        }
      }
    } else {
      if (paymentMethod === 'balance') {
        await supabase.rpc('increment_member_balance', {
          p_member_id: memberId,
          p_amount: originalAmount,
        });
        fundTrail.push(`余额退回 ¥${originalAmount}`);
      } else if (paymentMethod && paymentMethod !== 'balance') {
        const paymentMethodMap: Record<string, string> = {
          wechat: "微信", alipay: "支付宝", cash: "现金"
        };
        fundTrail.push(`⚠️ 需手动退还${paymentMethodMap[paymentMethod]} ¥${originalAmount}`);
      }
    }
    
    const priceDiffAmount = subTransactions?.find((s: { type: string }) => s.type === 'price_diff')?.amount || 0;
    totalRefundAmount = originalAmount + priceDiffAmount;
    
    await supabase
      .from('transactions')
      .update({ voided: true })
      .eq('id', transactionId);
    
    const priceDiffSub = subTransactions?.find((s: { type: string }) => s.type === 'price_diff');
    const manualRefundNote = priceDiffSub 
      ? ` [需手动退还${priceDiffSub.paymentMethod === 'wechat' ? '微信' : priceDiffSub.paymentMethod === 'alipay' ? '支付宝' : '现金'}¥${priceDiffSub.amount}]`
      : '';
    
    await supabase
      .from('transactions')
      .insert({
        member_id: memberId,
        member_name: memberName,
        type: 'refund',
        amount: totalRefundAmount,
        description: `退款 - ${description}${manualRefundNote}`,
        related_transaction_id: transactionId,
        sub_transactions: subTransactions || null,
      });
    
    await supabase
      .from('audit_logs')
      .insert({
        action: 'TRANSACTION_REFUNDED',
        category: 'transaction',
        details: `Transaction ${transactionId} refunded with amount ${totalRefundAmount}`,
        metadata: { 
          transaction_id: transactionId, 
          refund_amount: totalRefundAmount,
          fund_trail: fundTrail
        }
      });
    
    return c.json({ 
      success: true, 
      refund_amount: totalRefundAmount,
      fund_trail: fundTrail
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error refunding transaction:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Password verification service',
    version: '4.0.3'
  }, 200, getCorsHeaders());
});

Deno.serve(app.fetch);
