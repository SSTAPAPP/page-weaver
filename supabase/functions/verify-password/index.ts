import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const app = new Hono();

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Handle CORS preflight
app.options('*', (c) => {
  return new Response(null, { headers: corsHeaders });
});

// Hash function matching client-side implementation
async function hashPassword(password: string): Promise<string> {
  const SALT = 'ffk-shop-2024-salt';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get Supabase client with service role for secure operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Verify password endpoint
app.post('/verify', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
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
    
    // Use the secure database function to verify password
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
      success: data === true,
      hash: data === true ? inputHash : undefined // Return hash only if valid (for first-time setup migration)
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error verifying password:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Update password endpoint
app.post('/update-password', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
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
    
    // Verify current password first (if provided)
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
    
    // Update to new password
    const newHash = await hashPassword(newPassword);
    const { data, error } = await supabase.rpc('update_admin_password', {
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
      success: true,
      hash: newHash
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500, corsHeaders);
  }
});

// Delete member with refund - secure server-side operation
app.post('/delete-member', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
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
    
    // Use the secure database function for atomic delete with refund
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

// Void transaction - secure server-side operation
app.post('/void-transaction', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
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
    
    // Use the secure database function for atomic void
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

// Legacy endpoint for backwards compatibility
app.post('/', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return c.json({ 
        success: false, 
        error: 'Too many attempts. Please try again later.' 
      }, 429, corsHeaders);
    }
    
    const { password, storedHash } = await c.req.json();
    
    if (!password) {
      return c.json({ 
        success: false, 
        error: 'Password is required' 
      }, 400, corsHeaders);
    }
    
    const inputHash = await hashPassword(password);
    
    // If storedHash is provided, compare directly (legacy mode)
    if (storedHash) {
      const isValid = storedHash === inputHash;
      return c.json({ 
        success: isValid,
        hash: inputHash
      }, 200, corsHeaders);
    }
    
    // Otherwise use secure database function
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
      success: data === true,
      hash: inputHash
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error verifying password:', error);
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
    version: '2.0.0'
  }, 200, corsHeaders);
});

Deno.serve(app.fetch);
