// ============= Internal Function Authentication =============
// Shared authentication utilities for internal Edge Functions
// Implements defense-in-depth for internal-only functions

/**
 * Authentication strategies for internal functions:
 * 1. Shared Secret (X-Internal-Secret header) - for function-to-function calls
 * 2. Service Role JWT - for scheduled/cron tasks
 * 3. Cron verification (CF-Connecting-IP or X-Cron-Signature) - for scheduled tasks
 */

// ============= Types =============

export interface AuthResult {
  isAuthorized: boolean;
  error?: string;
  caller?: 'function' | 'cron' | 'service';
}

// ============= Configuration =============

const INTERNAL_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Expected headers for cron jobs (Supabase uses CF Workers)
const CRON_HEADERS = ['CF-Connecting-IP', 'X-Cron-Signature', 'User-Agent'];

// ============= Auth Validators =============

/**
 * Validates shared secret authentication (for internal function calls)
 */
export function validateSharedSecret(req: Request): AuthResult {
  const secret = req.headers.get('X-Internal-Secret');

  if (!INTERNAL_SECRET) {
    console.error('[internal-auth] INTERNAL_FUNCTION_SECRET not configured');
    return {
      isAuthorized: false,
      error: 'Internal authentication not configured'
    };
  }

  if (!secret) {
    return {
      isAuthorized: false,
      error: 'Missing X-Internal-Secret header'
    };
  }

  if (secret !== INTERNAL_SECRET) {
    return {
      isAuthorized: false,
      error: 'Invalid internal secret'
    };
  }

  return { isAuthorized: true, caller: 'function' };
}

/**
 * Validates service role JWT (for scheduled tasks and admin operations)
 */
export function validateServiceRole(req: Request): AuthResult {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return {
      isAuthorized: false,
      error: 'Missing Authorization header'
    };
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[internal-auth] SUPABASE_SERVICE_ROLE_KEY not configured');
    return {
      isAuthorized: false,
      error: 'Service role authentication not configured'
    };
  }

  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return {
      isAuthorized: false,
      error: 'Invalid service role key'
    };
  }

  return { isAuthorized: true, caller: 'service' };
}

/**
 * Validates cron job authentication (for scheduled tasks)
 * Checks for CF Workers cron-specific headers
 */
export function validateCronRequest(req: Request): AuthResult {
  // Check for cron-specific headers
  const hasCronHeaders = CRON_HEADERS.some(header => {
    const value = req.headers.get(header);
    return value !== null;
  });

  if (!hasCronHeaders) {
    return {
      isAuthorized: false,
      error: 'Missing cron-specific headers'
    };
  }

  // Additional validation: User-Agent should contain "Cloudflare" for CF Workers cron
  const userAgent = req.headers.get('User-Agent') || '';
  const isCFWorker = userAgent.toLowerCase().includes('cloudflare');

  if (isCFWorker) {
    return { isAuthorized: true, caller: 'cron' };
  }

  // Fallback: Check for service role as backup auth for cron
  return validateServiceRole(req);
}

// ============= Middleware Functions =============

/**
 * Validates internal function call authentication
 * Use this for pipeline executors and internal utilities
 */
export function validateInternalCall(req: Request): AuthResult {
  // Try shared secret first (primary method for function-to-function)
  const secretAuth = validateSharedSecret(req);
  if (secretAuth.isAuthorized) {
    return secretAuth;
  }

  // Fallback to service role (for admin operations)
  const serviceAuth = validateServiceRole(req);
  if (serviceAuth.isAuthorized) {
    return serviceAuth;
  }

  // Return the error from shared secret check (primary method)
  return secretAuth;
}

/**
 * Validates scheduled task authentication
 * Use this for cron jobs and scheduled functions
 */
export function validateScheduledTask(req: Request): AuthResult {
  // Try cron headers first
  const cronAuth = validateCronRequest(req);
  if (cronAuth.isAuthorized) {
    return cronAuth;
  }

  // Fallback to shared secret (for manual triggers)
  const secretAuth = validateSharedSecret(req);
  if (secretAuth.isAuthorized) {
    return secretAuth;
  }

  // Return cron auth error (primary method for scheduled tasks)
  return cronAuth;
}

// ============= Response Helpers =============

export function unauthorizedResponse(error?: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: error || 'Invalid authentication credentials',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export function forbiddenResponse(error?: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message: error || 'You do not have permission to access this resource',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

// ============= Logging Helpers =============

export function logAuthAttempt(
  functionName: string,
  result: AuthResult,
  requestId?: string
): void {
  const prefix = requestId ? `[${functionName}:${requestId}]` : `[${functionName}]`;

  if (result.isAuthorized) {
    console.log(`${prefix} Authorized call from ${result.caller}`);
  } else {
    console.warn(`${prefix} Unauthorized call attempt: ${result.error}`);
  }
}

// ============= Helper for pipeline-orchestrator integration =============

/**
 * Creates the internal secret header for invoking internal functions
 * Use this when calling internal functions from pipeline-orchestrator
 */
export function createInternalHeaders(): Record<string, string> {
  if (!INTERNAL_SECRET) {
    throw new Error('INTERNAL_FUNCTION_SECRET not configured');
  }

  return {
    'X-Internal-Secret': INTERNAL_SECRET,
    'Content-Type': 'application/json',
  };
}
