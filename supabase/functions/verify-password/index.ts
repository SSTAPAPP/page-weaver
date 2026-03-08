import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Dynamic CORS based on environment
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

const app = new Hono().basePath('/verify-password');

// Check if a hash is legacy SHA-256 format (64-char hex)
function isLegacySha256(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

// Legacy SHA-256 hash for migration purposes only
async function legacySha256Hash(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// bcrypt password hashing (secure)
async function hashPassword(password: string): Promise<string> {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Verify password against stored hash (supports bcrypt + legacy SHA-256 migration)
async function verifyPasswordAgainstHash(password: string, storedHash: string): Promise<{ valid: boolean; needsMigration: boolean }> {
  if (isLegacySha256(storedHash)) {
    // Legacy SHA-256 verification for migration
    const salt = Deno.env.get('ADMIN_PASSWORD_SALT');
    if (!salt) {
      throw new Error('ADMIN_PASSWORD_SALT env var is required for legacy hash migration');
    }
    const inputHash = await legacySha256Hash(password, salt);
    return { valid: inputHash === storedHash, needsMigration: true };
  }
  // bcrypt verification
  try {
    const valid = bcrypt.compareSync(password, storedHash);
    return { valid, needsMigration: false };
  } catch {
    return { valid: false, needsMigration: false };
  }
}

// Fetch stored admin password hash from DB
async function getStoredPasswordHash(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_admin_password_hash');
  if (error) {
    console.error('Failed to get admin password hash:', error);
    return null;
  }
  return data;
}

// Update stored hash to bcrypt after migration
async function updateStoredHash(newHash: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('update_admin_password', {
    new_password_hash: newHash,
  });
  if (error) {
    console.error('Failed to update password hash after migration:', error);
  }
}

// Verify admin password with automatic bcrypt migration
async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = await getStoredPasswordHash();
  
  // No password set = first-time setup, allow access
  if (!storedHash || storedHash === '') {
    return true;
  }
  
  const { valid, needsMigration } = await verifyPasswordAgainstHash(password, storedHash);
  
  // Auto-migrate SHA-256 to bcrypt on successful verification
  if (valid && needsMigration) {
    const bcryptHash = await hashPassword(password);
    await updateStoredHash(bcryptHash);
    console.log('Successfully migrated admin password from SHA-256 to bcrypt');
  }
  
  return valid;
}

// Verify JWT and return authenticated user ID
async function verifyAuth(c: { req: { header: (name: string) => string | undefined } }): Promise<{ userId: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return null;
  }

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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Auth verification failed:', response.status, errorText);
    return null;
  }

  const user = await response.json();
  if (!user?.id) {
    return null;
  }

  return { userId: user.id };
}

// DB-based rate limiting via check_rate_limit RPC — FAIL CLOSED
async function checkRateLimit(ip: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `password_verify:${ip}`,
    p_max: 5,
    p_window_seconds: 60,
  });
  if (error) {
    console.error('Rate limit check failed:', error);
    return false; // fail closed — deny access on error for security
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
  const origin = c.req.header('origin') || '';
  return new Response(null, { headers: getCorsHeaders(origin) });
});

// Verify password endpoint (requires auth)
app.post('/verify', async (c) => {
  const corsHeaders = getCorsHeaders(c.req.header('origin') || '');
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
    
    const isValid = await verifyAdminPassword(password);
    
    return c.json({ 
      success: isValid
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
  const corsHeaders = getCorsHeaders(c.req.header('origin') || '');
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
    
    // Verify current password if provided
    if (currentPassword) {
      const isValid = await verifyAdminPassword(currentPassword);
      if (!isValid) {
        return c.json({ 
          success: false, 
          error: 'Current password is incorrect' 
        }, 401, corsHeaders);
      }
    }
    
    // Hash new password with bcrypt
    const newHash = await hashPassword(newPassword);
    await updateStoredHash(newHash);
    
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
  const corsHeaders = getCorsHeaders(c.req.header('origin') || '');
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
    
    // Verify admin password in edge function
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid admin password' }, 401, corsHeaders);
    }
    
    const supabase = getSupabaseClient();
    
    // Get member info
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();
    
    if (memberErr || !member) {
      return c.json({ success: false, error: 'Member not found' }, 404, corsHeaders);
    }
    
    // Create refund transaction if amount > 0
    if (refundAmount > 0) {
      await supabase.from('transactions').insert({
        member_id: memberId,
        member_name: member.name,
        type: 'refund',
        amount: refundAmount,
        description: refundDescription || 'Member deletion refund',
      });
    }
    
    // Delete member cards
    await supabase.from('member_cards').delete().eq('member_id', memberId);
    
    // Delete member
    await supabase.from('members').delete().eq('id', memberId);
    
    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'MEMBER_DELETED_WITH_REFUND',
      category: 'member',
      details: `Member ${member.name} deleted with refund of ${refundAmount}`,
      metadata: { member_id: memberId, member_name: member.name, refund_amount: refundAmount },
    });
    
    return c.json({ success: true, member_name: member.name, refund_amount: refundAmount }, 200, corsHeaders);
    
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
  const corsHeaders = getCorsHeaders(c.req.header('origin') || '');
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
    
    // Verify admin password in edge function
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid admin password' }, 401, corsHeaders);
    }
    
    const supabase = getSupabaseClient();
    
    // Get transaction
    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (txnErr || !txn) {
      return c.json({ success: false, error: 'Transaction not found' }, 404, corsHeaders);
    }
    
    if (txn.voided) {
      return c.json({ success: false, error: 'Transaction already voided' }, 400, corsHeaders);
    }
    
    // Void the transaction
    await supabase.from('transactions').update({ voided: true }).eq('id', transactionId);
    
    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'TRANSACTION_VOIDED',
      category: 'transaction',
      details: `Transaction ${transactionId} voided`,
      metadata: { transaction_id: transactionId, amount: txn.amount, type: txn.type },
    });
    
    return c.json({ success: true, transaction_id: transactionId }, 200, corsHeaders);
    
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
  const corsHeaders = getCorsHeaders(c.req.header('origin') || '');
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
    
    // Verify admin password in edge function
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid admin password' }, 401, corsHeaders);
    }
    
    const supabase = getSupabaseClient();
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
    version: '5.0.0'
  }, 200, getCorsHeaders(c.req.header('origin') || ''));
});

Deno.serve(app.fetch);
