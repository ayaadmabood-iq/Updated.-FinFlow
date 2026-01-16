import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageApiKeyRequest {
  action: 'get-status' | 'set' | 'remove' | 'get-key';
  provider?: 'openai' | 'anthropic';
  apiKey?: string;
}

// Get encryption key from environment - NO fallback to ensure security
function getEncryptionKey(): CryptoKey | null {
  const keyBase64 = Deno.env.get('API_KEY_ENCRYPTION_SECRET');
  if (!keyBase64) {
    console.error('API_KEY_ENCRYPTION_SECRET environment variable is not set');
    return null;
  }
  return null; // Will be imported as crypto key
}

// AES-256-GCM encryption using Web Crypto API
async function encrypt(text: string): Promise<string> {
  const keyBase64 = Deno.env.get('API_KEY_ENCRYPTION_SECRET');
  if (!keyBase64) {
    throw new Error('Encryption key not configured. Please set API_KEY_ENCRYPTION_SECRET.');
  }

  // Derive a 256-bit key from the secret using SHA-256
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyBase64),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lovable-api-key-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate a random 12-byte IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  );

  // Combine IV and ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedBase64: string): Promise<string> {
  const keyBase64 = Deno.env.get('API_KEY_ENCRYPTION_SECRET');
  if (!keyBase64) {
    throw new Error('Encryption key not configured. Please set API_KEY_ENCRYPTION_SECRET.');
  }

  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyBase64),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('lovable-api-key-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode base64 and split IV from ciphertext
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key. The key may be corrupted or the encryption secret may have changed.');
  }
}

// Input validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ['get-status', 'set', 'remove', 'get-key'] as const;
const VALID_PROVIDERS = ['openai', 'anthropic'] as const;

function validateRequest(body: unknown): { valid: true; data: ManageApiKeyRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { action, provider, apiKey } = body as Record<string, unknown>;

  if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return { valid: false, error: 'Invalid action. Must be one of: get-status, set, remove, get-key' };
  }

  if (provider !== undefined) {
    if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
      return { valid: false, error: 'Invalid provider. Must be one of: openai, anthropic' };
    }
  }

  if (apiKey !== undefined) {
    if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 500) {
      return { valid: false, error: 'Invalid API key format. Must be between 10 and 500 characters.' };
    }
  }

  return {
    valid: true,
    data: {
      action: action as ManageApiKeyRequest['action'],
      provider: provider as ManageApiKeyRequest['provider'],
      apiKey: apiKey as ManageApiKeyRequest['apiKey'],
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, provider, apiKey } = validation.data;

    console.log(`API Key action: ${action} for user: ${user.id}, provider: ${provider || 'n/a'}`);

    switch (action) {
      case 'get-status': {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('openai_key_set, anthropic_key_set')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching API key status:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({
            openaiKeySet: data?.openai_key_set || false,
            anthropicKeySet: data?.anthropic_key_set || false,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set': {
        if (!provider || !apiKey) {
          return new Response(
            JSON.stringify({ error: 'Missing provider or apiKey' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate API key format
        if (provider === 'openai' && !apiKey.startsWith('sk-')) {
          return new Response(
            JSON.stringify({ error: 'Invalid OpenAI API key format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate Anthropic key format
        if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
          return new Response(
            JSON.stringify({ error: 'Invalid Anthropic API key format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Encrypt the API key using AES-256-GCM
        const encrypted = await encrypt(apiKey);

        const { error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id: user.id,
            [`${provider}_key_encrypted`]: encrypted,
            [`${provider}_key_set`]: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('Error setting API key:', error);
          throw error;
        }

        console.log(`API key set successfully for provider: ${provider}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove': {
        if (!provider) {
          return new Response(
            JSON.stringify({ error: 'Missing provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('user_api_keys')
          .update({
            [`${provider}_key_encrypted`]: null,
            [`${provider}_key_set`]: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error removing API key:', error);
          throw error;
        }

        console.log(`API key removed for provider: ${provider}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-key': {
        if (!provider) {
          return new Response(
            JSON.stringify({ error: 'Missing provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('user_api_keys')
          .select('openai_key_encrypted, anthropic_key_encrypted')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching API key:', error);
          throw error;
        }

        const encrypted = provider === 'openai' 
          ? data?.openai_key_encrypted 
          : data?.anthropic_key_encrypted;
        if (!encrypted) {
          return new Response(
            JSON.stringify({ apiKey: null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Decrypt the API key using AES-256-GCM
        const decrypted = await decrypt(encrypted);

        return new Response(
          JSON.stringify({ apiKey: decrypted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in manage-api-keys:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
