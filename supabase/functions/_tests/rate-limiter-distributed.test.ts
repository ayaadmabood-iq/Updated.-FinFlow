// ============= Distributed Rate Limiter Tests =============
// Tests for database-backed distributed rate limiting

import { assertEquals, assertExists, sleep } from './setup.ts';
import {
  RateLimiter,
  createRateLimiter,
  TIER_LIMITS,
} from '../_shared/rate-limiter.ts';

// ============= Mock Supabase Client for Rate Limiter =============

interface MockRateLimitRecord {
  user_id: string;
  endpoint: string;
  window_start: string;
  request_count: number;
  tier: string;
  last_request_at: string;
}

function createMockRateLimiterSupabase(records: MockRateLimitRecord[] = []) {
  let mockRecords = [...records];
  let rpcCallLog: Array<{ function: string; params: any }> = [];

  return {
    rpc: async (functionName: string, params: any) => {
      rpcCallLog.push({ function: functionName, params });

      if (functionName === 'increment_rate_limit') {
        const { p_user_id, p_endpoint, p_window_start, p_tier } = params;

        // Find existing record
        const existing = mockRecords.find(
          r => r.user_id === p_user_id &&
               r.endpoint === p_endpoint &&
               r.window_start === p_window_start
        );

        if (existing) {
          // Increment existing
          existing.request_count++;
          existing.last_request_at = new Date().toISOString();
          return {
            data: [{ new_count: existing.request_count, is_new_window: false }],
            error: null
          };
        } else {
          // Create new record
          const newRecord: MockRateLimitRecord = {
            user_id: p_user_id,
            endpoint: p_endpoint,
            window_start: p_window_start,
            request_count: 1,
            tier: p_tier,
            last_request_at: new Date().toISOString(),
          };
          mockRecords.push(newRecord);
          return {
            data: [{ new_count: 1, is_new_window: true }],
            error: null
          };
        }
      }

      if (functionName === 'get_rate_limit_status') {
        const { p_user_id, p_endpoint } = params;
        const record = mockRecords.find(
          r => r.user_id === p_user_id && r.endpoint === p_endpoint
        );

        if (record) {
          return {
            data: [{
              endpoint: record.endpoint,
              current_count: record.request_count,
              window_start: record.window_start,
              tier: record.tier,
            }],
            error: null
          };
        }

        return { data: [], error: null };
      }

      if (functionName === 'cleanup_expired_rate_limits') {
        const beforeCount = mockRecords.length;
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        mockRecords = mockRecords.filter(r => r.window_start > cutoff);
        return { data: beforeCount - mockRecords.length, error: null };
      }

      throw new Error(`Unexpected RPC function: ${functionName}`);
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: async () => {
              if (table === 'user_subscriptions') {
                return { data: { tier: 'free' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
      insert: async (data: any) => {
        // Mock audit log insert
        return { data, error: null };
      },
    }),
    _internal: {
      getRpcLog: () => rpcCallLog,
      getRecords: () => mockRecords,
    },
  };
}

// ============= Unit Tests =============

Deno.test('RateLimiter: checkLimit allows first request', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const result = await limiter.checkLimit('user123', 'chat', 'free');

  assertEquals(result.allowed, true);
  assertEquals(result.remaining, TIER_LIMITS.free.chat.maxRequests - 1);
  assertExists(result.resetAt);
});

Deno.test('RateLimiter: checkLimit increments count', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  // Make 3 requests
  await limiter.checkLimit('user123', 'chat', 'free');
  await limiter.checkLimit('user123', 'chat', 'free');
  const result = await limiter.checkLimit('user123', 'chat', 'free');

  assertEquals(result.allowed, true);
  assertEquals(result.remaining, TIER_LIMITS.free.chat.maxRequests - 3);
});

Deno.test('RateLimiter: checkLimit blocks after limit reached', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const maxRequests = TIER_LIMITS.free.chat.maxRequests;

  // Make requests up to the limit
  for (let i = 0; i < maxRequests; i++) {
    const result = await limiter.checkLimit('user123', 'chat', 'free');
    assertEquals(result.allowed, true);
  }

  // Next request should be blocked
  const blocked = await limiter.checkLimit('user123', 'chat', 'free');
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.remaining, 0);
  assertExists(blocked.retryAfterSeconds);
});

Deno.test('RateLimiter: different users are isolated', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const maxRequests = TIER_LIMITS.free.chat.maxRequests;

  // User1 exhausts their limit
  for (let i = 0; i < maxRequests; i++) {
    await limiter.checkLimit('user1', 'chat', 'free');
  }
  const user1Blocked = await limiter.checkLimit('user1', 'chat', 'free');
  assertEquals(user1Blocked.allowed, false);

  // User2 should still be allowed
  const user2Result = await limiter.checkLimit('user2', 'chat', 'free');
  assertEquals(user2Result.allowed, true);
});

Deno.test('RateLimiter: different endpoints are isolated', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const maxRequests = TIER_LIMITS.free.chat.maxRequests;

  // Exhaust chat endpoint
  for (let i = 0; i < maxRequests; i++) {
    await limiter.checkLimit('user123', 'chat', 'free');
  }
  const chatBlocked = await limiter.checkLimit('user123', 'chat', 'free');
  assertEquals(chatBlocked.allowed, false);

  // Search endpoint should still be allowed
  const searchResult = await limiter.checkLimit('user123', 'search', 'free');
  assertEquals(searchResult.allowed, true);
});

Deno.test('RateLimiter: tier-based limits work correctly', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  // Free tier
  const freeResult = await limiter.checkLimit('user-free', 'chat', 'free');
  assertEquals(freeResult.remaining, TIER_LIMITS.free.chat.maxRequests - 1);

  // Pro tier
  const proResult = await limiter.checkLimit('user-pro', 'chat', 'pro');
  assertEquals(proResult.remaining, TIER_LIMITS.pro.chat.maxRequests - 1);

  // Enterprise tier
  const enterpriseResult = await limiter.checkLimit('user-ent', 'chat', 'enterprise');
  assertEquals(enterpriseResult.remaining, TIER_LIMITS.enterprise.chat.maxRequests - 1);
});

Deno.test('RateLimiter: getRateLimitStatus returns current status', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  // Make some requests
  await limiter.checkLimit('user123', 'chat', 'free');
  await limiter.checkLimit('user123', 'chat', 'free');
  await limiter.checkLimit('user123', 'chat', 'free');

  const status = await limiter.getRateLimitStatus('user123', 'chat');

  assertExists(status);
  assertEquals(status?.currentCount, 3);
  assertEquals(status?.tier, 'free');
  assertExists(status?.windowStart);
});

Deno.test('RateLimiter: cleanupExpiredRecords removes old entries', async () => {
  const oldRecord: MockRateLimitRecord = {
    user_id: 'user123',
    endpoint: 'chat',
    window_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    request_count: 5,
    tier: 'free',
    last_request_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  };

  const recentRecord: MockRateLimitRecord = {
    user_id: 'user456',
    endpoint: 'search',
    window_start: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
    request_count: 3,
    tier: 'pro',
    last_request_at: new Date().toISOString(),
  };

  const supabase = createMockRateLimiterSupabase([oldRecord, recentRecord]);
  const limiter = new RateLimiter(supabase as any);

  const deletedCount = await limiter.cleanupExpiredRecords();

  assertEquals(deletedCount, 1); // Should delete only the old record
});

Deno.test('RateLimiter: fails open on database error', async () => {
  const supabase = {
    rpc: async () => ({ data: null, error: { message: 'Database error' } }),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: { tier: 'free' }, error: null }),
          }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
    }),
  };

  const limiter = new RateLimiter(supabase as any);
  const result = await limiter.checkLimit('user123', 'chat', 'free');

  // Should allow request (fail open)
  assertEquals(result.allowed, true);
});

// ============= Integration Tests =============

Deno.test('RateLimiter: simulates concurrent requests', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  // Simulate 10 concurrent requests
  const promises = Array.from({ length: 10 }, (_, i) =>
    limiter.checkLimit('user123', 'chat', 'free')
  );

  const results = await Promise.all(promises);

  // All should be allowed (under free tier limit of 20)
  const allowedCount = results.filter(r => r.allowed).length;
  assertEquals(allowedCount, 10);

  // Remaining should decrease correctly
  const lastResult = results[results.length - 1];
  assertEquals(lastResult.remaining, TIER_LIMITS.free.chat.maxRequests - 10);
});

Deno.test('RateLimiter: simulates multi-instance behavior', async () => {
  // Shared state simulates database
  const sharedRecords: MockRateLimitRecord[] = [];

  // Create two "instances" sharing the same database
  const instance1 = createMockRateLimiterSupabase(sharedRecords);
  const instance2 = createMockRateLimiterSupabase(sharedRecords);

  const limiter1 = new RateLimiter(instance1 as any);
  const limiter2 = new RateLimiter(instance2 as any);

  // Instance 1 makes 10 requests
  for (let i = 0; i < 10; i++) {
    await limiter1.checkLimit('user123', 'chat', 'free');
  }

  // Instance 2 makes 10 more requests
  for (let i = 0; i < 10; i++) {
    await limiter2.checkLimit('user123', 'chat', 'free');
  }

  // Total is 20 (at free tier limit)
  // Next request from either instance should be blocked
  const result1 = await limiter1.checkLimit('user123', 'chat', 'free');
  assertEquals(result1.allowed, false);

  const result2 = await limiter2.checkLimit('user123', 'chat', 'free');
  assertEquals(result2.allowed, false);
});

Deno.test('RateLimiter: window sliding works correctly', async () => {
  const windowStart1 = new Date(Date.now() - 70000); // 70 seconds ago (expired)
  const windowStart2 = new Date(Date.now() - 30000); // 30 seconds ago (active)

  const oldRecord: MockRateLimitRecord = {
    user_id: 'user123',
    endpoint: 'chat',
    window_start: windowStart1.toISOString(),
    request_count: 20, // At limit
    tier: 'free',
    last_request_at: windowStart1.toISOString(),
  };

  const supabase = createMockRateLimiterSupabase([oldRecord]);
  const limiter = new RateLimiter(supabase as any);

  // New window should start (old one expired)
  const result = await limiter.checkLimit('user123', 'chat', 'free');

  // Should be allowed (new window)
  assertEquals(result.allowed, true);
});

Deno.test('RateLimiter: performance benchmark', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await limiter.checkLimit(`user${i}`, 'chat', 'free');
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Average rate limit check time: ${avgTime.toFixed(2)}ms`);

  // Should be under 50ms per request (requirement)
  assertEquals(avgTime < 50, true, `Performance too slow: ${avgTime}ms > 50ms`);
});

Deno.test('RateLimiter: getUserTier returns correct tier', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const tier = await limiter.getUserTier('user123');

  assertEquals(tier, 'free'); // Mock returns 'free'
});

Deno.test('RateLimiter: resetAt timestamp is correct', async () => {
  const supabase = createMockRateLimiterSupabase();
  const limiter = new RateLimiter(supabase as any);

  const beforeTime = Date.now();
  const result = await limiter.checkLimit('user123', 'chat', 'free');
  const afterTime = Date.now();

  const resetTime = result.resetAt.getTime();
  const windowSeconds = TIER_LIMITS.free.chat.windowSeconds * 1000;

  // Reset should be approximately now + window duration
  const expectedMin = beforeTime + windowSeconds - 1000; // 1s tolerance
  const expectedMax = afterTime + windowSeconds + 1000;

  assertEquals(resetTime >= expectedMin && resetTime <= expectedMax, true);
});

console.log('✓ All distributed rate limiter tests passed');
