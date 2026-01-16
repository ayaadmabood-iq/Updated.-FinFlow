// ============= Edge Function Utilities =============
// Centralized utilities for all Edge Functions
// Provides: auth, error handling, response builders, API clients
// ALL Edge Functions should use these utilities

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= CORS Headers =============

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export const allHeaders = { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' };

// ============= Client Factories =============

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    serviceClient = createClient(url, key);
  }
  return serviceClient;
}

export function createUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// ============= Auth Validation =============

export interface AuthResult {
  success: boolean;
  userId: string | null;
  email: string | null;
  error?: string;
}

export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, userId: null, email: null, error: 'Missing or invalid Authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { success: false, userId: null, email: null, error: 'Invalid or expired token' };
    }
    
    return { success: true, userId: user.id, email: user.email || null };
  } catch (err) {
    console.error('[auth] Token validation error:', err);
    return { success: false, userId: null, email: null, error: 'Token validation failed' };
  }
}

export async function requireAuth(req: Request): Promise<{ userId: string; email: string | null } | Response> {
  const result = await validateAuth(req);
  
  if (!result.success || !result.userId) {
    return errorResponse(result.error || 'Unauthorized', 401);
  }
  
  return { userId: result.userId, email: result.email };
}

// ============= Ownership Verification =============

export async function verifyProjectAccess(userId: string, projectId: string): Promise<{ allowed: boolean; error?: string }> {
  const supabase = getServiceClient();
  
  // Check direct ownership
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();
  
  if (!project) {
    return { allowed: false, error: 'Project not found' };
  }
  
  if (project.owner_id === userId) {
    return { allowed: true };
  }
  
  // Check team access
  const { data: shares } = await supabase
    .from('project_shares')
    .select('team_id')
    .eq('project_id', projectId);
  
  if (shares && shares.length > 0) {
    const teamIds = shares.map(s => s.team_id);
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .in('team_id', teamIds)
      .limit(1);
    
    if (membership && membership.length > 0) {
      return { allowed: true };
    }
  }
  
  return { allowed: false, error: 'Access denied' };
}

export async function verifyDocumentAccess(userId: string, documentId: string): Promise<{ allowed: boolean; projectId?: string; error?: string }> {
  const supabase = getServiceClient();
  
  const { data: doc } = await supabase
    .from('documents')
    .select('owner_id, project_id')
    .eq('id', documentId)
    .single();
  
  if (!doc) {
    return { allowed: false, error: 'Document not found' };
  }
  
  // Direct ownership
  if (doc.owner_id === userId) {
    return { allowed: true, projectId: doc.project_id };
  }
  
  // Project access
  const projectAccess = await verifyProjectAccess(userId, doc.project_id);
  if (projectAccess.allowed) {
    return { allowed: true, projectId: doc.project_id };
  }
  
  return { allowed: false, error: 'Access denied' };
}

// ============= Response Builders =============

export function successResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: allHeaders,
  });
}

export function errorResponse(message: string, status = 400, details?: Record<string, unknown>): Response {
  const body = {
    error: message,
    ...details,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: allHeaders,
  });
}

export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function streamResponse(body: ReadableStream): Response {
  return new Response(body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
  });
}

// ============= Error Handling =============

export interface EdgeError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function createError(message: string, status = 400, code?: string): EdgeError {
  const error = new Error(message) as EdgeError;
  error.status = status;
  error.code = code;
  return error;
}

export function handleError(error: unknown): Response {
  console.error('[edge-function] Error:', error);
  
  if (error instanceof Response) {
    return error;
  }
  
  if (error && typeof error === 'object' && 'status' in error) {
    const edgeError = error as EdgeError;
    return errorResponse(
      edgeError.message || 'An error occurred',
      edgeError.status || 500,
      { code: edgeError.code }
    );
  }
  
  const message = error instanceof Error ? error.message : 'Unknown error';
  return errorResponse(message, 500);
}

// ============= Request Parsing =============

export async function parseJSON<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw createError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }
}

export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter(field => body[field] === undefined || body[field] === null);
  if (missing.length > 0) {
    throw createError(`Missing required fields: ${missing.join(', ')}`, 400, 'MISSING_FIELDS');
  }
}

// ============= Rate Limiting Integration =============

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { requestsPerMinute: 10, requestsPerHour: 100 },
  starter: { requestsPerMinute: 30, requestsPerHour: 500 },
  pro: { requestsPerMinute: 60, requestsPerHour: 2000 },
  enterprise: { requestsPerMinute: 200, requestsPerHour: 10000 },
};

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  tier: string = 'free'
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const config = DEFAULT_RATE_LIMITS[tier] || DEFAULT_RATE_LIMITS.free;
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - 60000).toISOString();
  
  const { count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .ilike('action', `${endpoint}%`)
    .gte('created_at', windowStart);
  
  const current = count || 0;
  const remaining = Math.max(0, config.requestsPerMinute - current);
  const allowed = current < config.requestsPerMinute;
  
  return {
    allowed,
    remaining,
    resetAt: new Date(Date.now() + 60000).toISOString(),
  };
}

// ============= Logging =============

export interface LogContext {
  userId?: string;
  projectId?: string;
  documentId?: string;
  endpoint: string;
  duration?: number;
  status?: string;
}

export async function logRequest(context: LogContext): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('audit_logs').insert({
      user_id: context.userId || '00000000-0000-0000-0000-000000000000',
      user_name: 'Edge Function',
      action: context.endpoint,
      resource_type: 'api',
      resource_id: context.projectId || context.documentId || 'system',
      resource_name: context.endpoint,
      details: {
        duration_ms: context.duration,
        status: context.status,
      },
    });
  } catch (err) {
    console.error('[logging] Failed to log request:', err);
  }
}

// ============= Handler Wrapper =============

export type EdgeHandler = (req: Request, context: { userId: string; email: string | null }) => Promise<Response>;

export function createHandler(
  handler: EdgeHandler,
  options: {
    requireAuth?: boolean;
    rateLimit?: string;
    endpoint: string;
  } = { requireAuth: true, endpoint: 'unknown' }
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return corsResponse();
    }
    
    try {
      // Auth check
      let userId: string | undefined;
      let email: string | null = null;
      
      if (options.requireAuth !== false) {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) {
          return authResult;
        }
        userId = authResult.userId;
        email = authResult.email;
      }
      
      // Rate limit check
      if (options.rateLimit && userId) {
        const rateCheck = await checkRateLimit(userId, options.endpoint);
        if (!rateCheck.allowed) {
          return errorResponse('Rate limit exceeded', 429, {
            remaining: rateCheck.remaining,
            resetAt: rateCheck.resetAt,
          });
        }
      }
      
      // Execute handler
      const response = await handler(req, { userId: userId!, email });
      
      // Log success
      await logRequest({
        userId,
        endpoint: options.endpoint,
        duration: Date.now() - startTime,
        status: 'success',
      });
      
      return response;
    } catch (error) {
      // Log error
      await logRequest({
        userId: undefined,
        endpoint: options.endpoint,
        duration: Date.now() - startTime,
        status: 'error',
      });
      
      return handleError(error);
    }
  };
}

// ============= Batch Operations =============

export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  batchSize = 100
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = getServiceClient();
  let inserted = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from(table)
      .insert(batch as never[])
      .select('id');
    
    if (error) {
      errors.push(`Batch ${i / batchSize}: ${error.message}`);
    } else {
      inserted += count || batch.length;
    }
  }
  
  return { inserted, errors };
}

export async function batchUpdate<T extends Record<string, unknown>>(
  table: string,
  updates: Array<{ id: string; data: T }>,
  batchSize = 50
): Promise<{ updated: number; errors: string[] }> {
  const supabase = getServiceClient();
  let updated = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    // Use Promise.all for parallel updates within batch
    const results = await Promise.all(
      batch.map(({ id, data }) =>
        supabase.from(table).update(data as never).eq('id', id)
      )
    );
    
    for (const { error } of results) {
      if (error) {
        errors.push(error.message);
      } else {
        updated++;
      }
    }
  }
  
  return { updated, errors };
}

// ============= Database Query Helpers =============

export async function fetchWithRelations<T>(
  table: string,
  id: string,
  select: string
): Promise<T | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`[db] Failed to fetch ${table}:`, error);
    return null;
  }
  
  return data as T;
}

export async function fetchBatch<T>(
  table: string,
  ids: string[],
  select = '*'
): Promise<T[]> {
  if (ids.length === 0) return [];
  
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .in('id', ids);
  
  if (error) {
    console.error(`[db] Failed to fetch batch from ${table}:`, error);
    return [];
  }
  
  return (data || []) as T[];
}
