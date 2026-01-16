/**
 * Idempotency Middleware
 *
 * Prevents duplicate operations by tracking idempotency keys.
 * Clients can include X-Idempotency-Key header to ensure operations are executed only once.
 *
 * Features:
 * - Optional (backwards compatible)
 * - Configurable TTL (default 24 hours)
 * - Minimal latency impact (<10ms)
 * - Automatic cleanup of expired keys
 * - Concurrent request handling
 *
 * Usage:
 * ```typescript
 * const { isIdempotent, cachedResponse } = await checkIdempotency(
 *   supabase,
 *   idempotencyKey,
 *   userId
 * );
 *
 * if (isIdempotent && cachedResponse) {
 *   return new Response(cachedResponse.response, {
 *     status: cachedResponse.status_code,
 *     headers: { 'X-Idempotency-Replay': 'true' }
 *   });
 * }
 *
 * // Execute operation...
 *
 * await storeIdempotencyResult(supabase, idempotencyKey, userId, result);
 * ```
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface IdempotencyConfig {
  ttlSeconds?: number; // Default: 86400 (24 hours)
  maxRetries?: number; // Default: 3
  retryDelay?: number; // Default: 100ms
}

export interface IdempotencyCheckResult {
  isIdempotent: boolean;
  cachedResponse: {
    response: string;
    status_code: number;
    headers: Record<string, string>;
  } | null;
  isNew: boolean;
}

export interface IdempotencyResult {
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
}

const DEFAULT_CONFIG: Required<IdempotencyConfig> = {
  ttlSeconds: 86400, // 24 hours
  maxRetries: 3,
  retryDelay: 100, // milliseconds
};

/**
 * Check if a request with this idempotency key has been processed before
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key for this operation
 * @param userId - User ID for scoping
 * @param config - Optional configuration
 * @returns Idempotency check result
 */
export async function checkIdempotency(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  config: IdempotencyConfig = {}
): Promise<IdempotencyCheckResult> {
  const startTime = Date.now();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Query for existing idempotency key
    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .single();

    const checkTime = Date.now() - startTime;
    console.log(`Idempotency check took ${checkTime}ms`);

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - this is a new request
        return {
          isIdempotent: false,
          cachedResponse: null,
          isNew: true,
        };
      }
      throw error;
    }

    // Check if key has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Key expired, treat as new request
      await deleteIdempotencyKey(supabase, idempotencyKey, userId);
      return {
        isIdempotent: false,
        cachedResponse: null,
        isNew: true,
      };
    }

    // Check status
    if (data.status === 'processing') {
      // Request is currently being processed
      // Wait and retry to get the result
      return await waitForCompletion(
        supabase,
        idempotencyKey,
        userId,
        mergedConfig
      );
    }

    if (data.status === 'completed') {
      // Return cached response
      return {
        isIdempotent: true,
        cachedResponse: {
          response: data.response,
          status_code: data.status_code,
          headers: data.response_headers || {},
        },
        isNew: false,
      };
    }

    if (data.status === 'failed') {
      // Previous request failed, allow retry
      await deleteIdempotencyKey(supabase, idempotencyKey, userId);
      return {
        isIdempotent: false,
        cachedResponse: null,
        isNew: true,
      };
    }

    // Unknown status
    return {
      isIdempotent: false,
      cachedResponse: null,
      isNew: false,
    };

  } catch (error) {
    console.error('Error checking idempotency:', error);
    // On error, allow request to proceed
    return {
      isIdempotent: false,
      cachedResponse: null,
      isNew: false,
    };
  }
}

/**
 * Create idempotency key entry to mark request as processing
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key
 * @param userId - User ID
 * @param config - Optional configuration
 * @returns Success boolean
 */
export async function createIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  config: IdempotencyConfig = {}
): Promise<boolean> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + mergedConfig.ttlSeconds);

    const { error } = await supabase
      .from('idempotency_keys')
      .insert({
        idempotency_key: idempotencyKey,
        user_id: userId,
        status: 'processing',
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        // Key already exists (race condition)
        return false;
      }
      throw error;
    }

    return true;

  } catch (error) {
    console.error('Error creating idempotency key:', error);
    return false;
  }
}

/**
 * Store the result of an idempotent operation
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key
 * @param userId - User ID
 * @param result - Operation result
 * @returns Success boolean
 */
export async function storeIdempotencyResult(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  result: IdempotencyResult
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('idempotency_keys')
      .update({
        status: 'completed',
        response: result.response,
        status_code: result.statusCode,
        response_headers: result.headers || {},
        completed_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;

  } catch (error) {
    console.error('Error storing idempotency result:', error);
    return false;
  }
}

/**
 * Mark an idempotent operation as failed
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key
 * @param userId - User ID
 * @param errorMessage - Error message
 * @returns Success boolean
 */
export async function markIdempotencyFailed(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  errorMessage: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('idempotency_keys')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;

  } catch (error) {
    console.error('Error marking idempotency failed:', error);
    return false;
  }
}

/**
 * Delete an idempotency key
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key
 * @param userId - User ID
 */
async function deleteIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string
): Promise<void> {
  await supabase
    .from('idempotency_keys')
    .delete()
    .eq('idempotency_key', idempotencyKey)
    .eq('user_id', userId);
}

/**
 * Wait for concurrent request to complete and return its result
 *
 * @param supabase - Supabase client
 * @param idempotencyKey - Unique key
 * @param userId - User ID
 * @param config - Configuration
 * @returns Idempotency check result
 */
async function waitForCompletion(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  config: Required<IdempotencyConfig>
): Promise<IdempotencyCheckResult> {
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    // Wait before checking
    await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)));

    // Check status again
    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      continue;
    }

    if (data.status === 'completed') {
      return {
        isIdempotent: true,
        cachedResponse: {
          response: data.response,
          status_code: data.status_code,
          headers: data.response_headers || {},
        },
        isNew: false,
      };
    }

    if (data.status === 'failed') {
      // Allow retry
      await deleteIdempotencyKey(supabase, idempotencyKey, userId);
      return {
        isIdempotent: false,
        cachedResponse: null,
        isNew: true,
      };
    }
  }

  // Timeout waiting for completion
  // Treat as new request to avoid blocking
  return {
    isIdempotent: false,
    cachedResponse: null,
    isNew: false,
  };
}

/**
 * Clean up expired idempotency keys
 * Should be called periodically (e.g., via cron job)
 *
 * @param supabase - Supabase client
 * @returns Number of keys deleted
 */
export async function cleanupExpiredKeys(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw error;
    }

    const count = data?.length || 0;
    console.log(`Cleaned up ${count} expired idempotency keys`);
    return count;

  } catch (error) {
    console.error('Error cleaning up expired keys:', error);
    return 0;
  }
}

/**
 * Extract idempotency key from request headers
 *
 * @param req - Request object
 * @returns Idempotency key or null
 */
export function getIdempotencyKey(req: Request): string | null {
  return req.headers.get('X-Idempotency-Key') ||
         req.headers.get('x-idempotency-key') ||
         null;
}

/**
 * Validate idempotency key format
 *
 * @param key - Idempotency key
 * @returns True if valid
 */
export function isValidIdempotencyKey(key: string | null): boolean {
  if (!key) return false;

  // Must be 8-64 characters
  if (key.length < 8 || key.length > 64) {
    return false;
  }

  // Must contain only alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Generate a random idempotency key (for client use)
 *
 * @returns Random idempotency key
 */
export function generateIdempotencyKey(): string {
  return `idem_${crypto.randomUUID()}`;
}
