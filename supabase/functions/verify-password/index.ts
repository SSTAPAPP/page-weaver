import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const app = new Hono();

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

// Verify password
app.post('/', async (c) => {
  try {
    const { password, storedHash } = await c.req.json();
    
    if (!password) {
      return c.json({ 
        success: false, 
        error: 'Password is required' 
      }, 400);
    }
    
    const inputHash = await hashPassword(password);
    
    // Compare with stored hash
    const isValid = storedHash === inputHash;
    
    return c.json({ 
      success: isValid,
      hash: inputHash // Return hash for first-time setup
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Error verifying password:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500);
  }
});

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Password verification service'
  }, 200, corsHeaders);
});

Deno.serve(app.fetch);
