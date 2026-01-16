// ============= Distributed Rate Limiting Middleware for Edge Functions =============
// Provides tier-based rate limiting with database-backed sliding window implementation
// Now supports multiple Edge Function instances with PostgreSQL storage

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export interface UserTier {
  tier: 'free' | 'pro' | 'enterprise';
  customLimits?: Partial<Record<string, RateLimitConfig>>;
}

// ============= Rate Limit Configurations =============

// Default limits by tier (requests per minute)
export const TIER_LIMITS: Record<string, Record<string, RateLimitConfig>> = {
  free: {
    chat: { maxRequests: 20, windowSeconds: 60 },
    search: { maxRequests: 30, windowSeconds: 60 },
    document_upload: { maxRequests: 10, windowSeconds: 60 },
    document_process: { maxRequests: 5, windowSeconds: 60 },
    api_ingest: { maxRequests: 100, windowSeconds: 60 },
    generate: { maxRequests: 10, windowSeconds: 60 },
    default: { maxRequests: 60, windowSeconds: 60 },
  },
  pro: {
    chat: { maxRequests: 60, windowSeconds: 60 },
    search: { maxRequests: 100, windowSeconds: 60 },
    document_upload: { maxRequests: 30, windowSeconds: 60 },
    document_process: { maxRequests: 20, windowSeconds: 60 },
    api_ingest: { maxRequests: 500, windowSeconds: 60 },
    generate: { maxRequests: 30, windowSeconds: 60 },
    default: { maxRequests: 200, windowSeconds: 60 },
  },
  enterprise: {
    chat: { maxRequests: 200, windowSeconds: 60 },
    search: { maxRequests: 500, windowSeconds: 60 },
    document_upload: { maxRequests: 100, windowSeconds: 60 },
    document_process: { maxRequests: 50, windowSeconds: 60 },
    api_ingest: { maxRequests: 2000, windowSeconds: 60 },
    generate: { maxRequests: 100, windowSeconds: 60 },
    default: { maxRequests: 1000, windowSeconds: 60 },
  },
};

// ============= Rate Limiter Class =============

export class RateLimiter {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check if a request should be allowed based on rate limits
   * Now uses database-backed storage for distributed rate limiting
   */
  async checkLimit(
    userId: string,
    endpoint: string,
    tier: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<RateLimitResult> {
    const config = TIER_LIMITS[tier]?.[endpoint] || TIER_LIMITS[tier]?.default || TIER_LIMITS.free.default;
    const now = new Date();
    const windowStartMs = now.getTime() - (config.windowSeconds * 1000);
    const windowStart = new Date(windowStartMs);

    try {
      // Use atomic increment function to handle concurrent requests
      const { data, error } = await this.supabase.rpc('increment_rate_limit', {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_window_start: windowStart.toISOString(),
        p_tier: tier,
      });

      if (error) {
        console.error('[rate-limiter] Database error:', error);
        // Fail open on database errors (allow request but log)
        await this.logError(userId, endpoint, 'database_error', error.message);
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
        };
      }

      const result = Array.isArray(data) ? data[0] : data;
      const currentCount = result?.new_count || 0;

      // Check if within limit
      if (currentCount <= config.maxRequests) {
        return {
          allowed: true,
          remaining: Math.max(0, config.maxRequests - currentCount),
          resetAt: new Date(windowStart.getTime() + config.windowSeconds * 1000),
        };
      }

      // Rate limited
      const resetAt = new Date(windowStart.getTime() + config.windowSeconds * 1000);
      const retryAfterSeconds = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

      // Log rate limit hit
      await this.logRateLimitHit(userId, endpoint, tier, currentCount);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds,
      };
    } catch (error) {
      console.error('[rate-limiter] Unexpected error:', error);
      // Fail open on unexpected errors (allow request but log)
      await this.logError(userId, endpoint, 'unexpected_error', error instanceof Error ? error.message : 'Unknown error');
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      };
    }
  }

  /**
   * Get current rate limit status for a user (for debugging/monitoring)
   */
  async getRateLimitStatus(
    userId: string,
    endpoint: string
  ): Promise<{
    currentCount: number;
    windowStart: Date;
    tier: string;
  } | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_rate_limit_status', {
        p_user_id: userId,
        p_endpoint: endpoint,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const result = Array.isArray(data) ? data[0] : data;
      return {
        currentCount: result.current_count,
        windowStart: new Date(result.window_start),
        tier: result.tier,
      };
    } catch (error) {
      console.error('[rate-limiter] Error getting status:', error);
      return null;
    }
  }

  /**
   * Get user's subscription tier from database
   */
  async getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
    try {
      const { data } = await this.supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (data?.tier && ['free', 'pro', 'enterprise'].includes(data.tier)) {
        return data.tier as 'free' | 'pro' | 'enterprise';
      }

      return 'free';
    } catch {
      return 'free';
    }
  }

  /**
   * Log rate limit hit for monitoring
   */
  private async logRateLimitHit(
    userId: string,
    endpoint: string,
    tier: string,
    requestCount: number
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: userId,
        user_name: 'Rate Limiter',
        action: 'rate_limit_exceeded',
        resource_type: 'api',
        resource_id: endpoint,
        resource_name: `Rate limit hit: ${endpoint}`,
        severity_level: 'warn',
        details: {
          endpoint,
          tier,
          requestCount,
          timestamp: new Date().toISOString()
        },
      });
    } catch (err) {
      console.warn('[rate-limiter] Failed to log rate limit hit:', err);
    }
  }

  /**
   * Log errors for monitoring
   */
  private async logError(
    userId: string,
    endpoint: string,
    errorType: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: userId,
        user_name: 'Rate Limiter',
        action: 'rate_limiter_error',
        resource_type: 'api',
        resource_id: endpoint,
        resource_name: `Rate limiter error: ${errorType}`,
        severity_level: 'error',
        details: {
          endpoint,
          errorType,
          errorMessage,
          timestamp: new Date().toISOString()
        },
      });
    } catch (err) {
      console.warn('[rate-limiter] Failed to log error:', err);
    }
  }

  /**
   * Cleanup expired rate limit records (should be called periodically)
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_rate_limits');

      if (error) {
        console.error('[rate-limiter] Cleanup error:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('[rate-limiter] Cleanup failed:', error);
      return 0;
    }
  }
}

// ============= Factory Function =============

export function createRateLimiter(supabase: SupabaseClient): RateLimiter {
  return new RateLimiter(supabase);
}

// ============= Middleware Helper =============

/**
 * Rate limit middleware for Edge Functions
 * Returns a Response if rate limited, null if allowed
 *
 * API remains unchanged - now uses database-backed storage
 */
export async function rateLimitMiddleware(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const limiter = createRateLimiter(supabase);
  const tier = await limiter.getUserTier(userId);
  const result = await limiter.checkLimit(userId, endpoint, tier);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please retry after ${result.retryAfterSeconds} seconds.`,
        retryAfter: result.retryAfterSeconds,
        resetAt: result.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfterSeconds),
          'X-RateLimit-Limit': String(TIER_LIMITS[tier]?.[endpoint]?.maxRequests || TIER_LIMITS[tier]?.default.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
        },
      }
    );
  }

  return null;
}

// ============= Rate Limit Headers Helper =============

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult,
  tier: 'free' | 'pro' | 'enterprise',
  endpoint: string
): Record<string, string> {
  const config = TIER_LIMITS[tier]?.[endpoint] || TIER_LIMITS[tier]?.default || TIER_LIMITS.free.default;

  return {
    ...headers,
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  };
}

// ============= Backwards Compatibility =============
// The public API remains identical to the previous in-memory version
// Existing Edge Functions using this module will continue to work without changes

/**
 * Legacy function for backwards compatibility
 * @deprecated Use checkLimit instead
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const limiter = createRateLimiter(supabase);
  const tier = await limiter.getUserTier(userId);
  return limiter.checkLimit(userId, endpoint, tier);
}
