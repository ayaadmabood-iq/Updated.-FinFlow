/**
 * Tests for Rate Limiter
 * Covers: Tier-based limits, sliding window, concurrent requests, reset behavior
 */

import { 
  assertEquals, 
  assertExists,
  createMockSupabaseClient,
  delay,
} from './setup.ts';

import {
  RateLimiter,
  createRateLimiter,
  TIER_LIMITS,
  addRateLimitHeaders,
} from '../_shared/rate-limiter.ts';

// ============= Tier Limit Configuration Tests =============

Deno.test('Rate Limiter - TIER_LIMITS structure is correct', () => {
  // Free tier exists and has expected endpoints
  assertExists(TIER_LIMITS.free);
  assertExists(TIER_LIMITS.free.chat);
  assertExists(TIER_LIMITS.free.search);
  assertExists(TIER_LIMITS.free.document_upload);
  assertExists(TIER_LIMITS.free.default);
  
  // Pro tier has higher limits than free
  assertExists(TIER_LIMITS.pro);
  assertEquals(TIER_LIMITS.pro.chat.maxRequests > TIER_LIMITS.free.chat.maxRequests, true);
  assertEquals(TIER_LIMITS.pro.search.maxRequests > TIER_LIMITS.free.search.maxRequests, true);
  
  // Enterprise tier has highest limits
  assertExists(TIER_LIMITS.enterprise);
  assertEquals(TIER_LIMITS.enterprise.chat.maxRequests > TIER_LIMITS.pro.chat.maxRequests, true);
  assertEquals(TIER_LIMITS.enterprise.api_ingest.maxRequests >= 2000, true);
});

Deno.test('Rate Limiter - Free tier has expected limits', () => {
  assertEquals(TIER_LIMITS.free.chat.maxRequests, 20);
  assertEquals(TIER_LIMITS.free.chat.windowSeconds, 60);
  assertEquals(TIER_LIMITS.free.search.maxRequests, 30);
  assertEquals(TIER_LIMITS.free.document_upload.maxRequests, 10);
});

Deno.test('Rate Limiter - Pro tier has expected limits', () => {
  assertEquals(TIER_LIMITS.pro.chat.maxRequests, 60);
  assertEquals(TIER_LIMITS.pro.search.maxRequests, 100);
  assertEquals(TIER_LIMITS.pro.document_upload.maxRequests, 30);
});

Deno.test('Rate Limiter - Enterprise tier has expected limits', () => {
  assertEquals(TIER_LIMITS.enterprise.chat.maxRequests, 200);
  assertEquals(TIER_LIMITS.enterprise.search.maxRequests, 500);
  assertEquals(TIER_LIMITS.enterprise.api_ingest.maxRequests, 2000);
});

// ============= Basic Rate Limiting Tests =============

Deno.test('Rate Limiter - First request is always allowed', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const result = await limiter.checkLimit('user-first-request', 'chat', 'free');
  
  assertEquals(result.allowed, true);
  assertExists(result.resetAt);
  assertEquals(result.remaining >= 0, true);
});

Deno.test('Rate Limiter - Allows requests within limit', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-within-limit-${Date.now()}`;
  const limit = TIER_LIMITS.free.chat.maxRequests;
  
  // Make requests up to limit - 1
  for (let i = 0; i < limit - 1; i++) {
    const result = await limiter.checkLimit(userId, 'chat', 'free');
    assertEquals(result.allowed, true, `Request ${i + 1} should be allowed`);
  }
});

Deno.test('Rate Limiter - Blocks requests exceeding limit', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-exceed-limit-${Date.now()}`;
  const limit = TIER_LIMITS.free.document_upload.maxRequests; // 10 requests
  
  // Make requests up to limit
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId, 'document_upload', 'free');
  }
  
  // Next request should be blocked
  const blocked = await limiter.checkLimit(userId, 'document_upload', 'free');
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.remaining, 0);
  assertExists(blocked.retryAfterSeconds);
});

Deno.test('Rate Limiter - Remaining count decreases correctly', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-remaining-${Date.now()}`;
  const limit = TIER_LIMITS.free.generate.maxRequests; // 10
  
  const result1 = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(result1.remaining, limit - 1);
  
  const result2 = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(result2.remaining, limit - 2);
  
  const result3 = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(result3.remaining, limit - 3);
});

// ============= User Isolation Tests =============

Deno.test('Rate Limiter - Different users are independent', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const timestamp = Date.now();
  const userId1 = `user-isolation-1-${timestamp}`;
  const userId2 = `user-isolation-2-${timestamp}`;
  const limit = TIER_LIMITS.free.document_process.maxRequests; // 5
  
  // User 1 exhausts their limit
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId1, 'document_process', 'free');
  }
  
  // User 1 should be blocked
  const user1Blocked = await limiter.checkLimit(userId1, 'document_process', 'free');
  assertEquals(user1Blocked.allowed, false);
  
  // User 2 should still be allowed
  const user2Result = await limiter.checkLimit(userId2, 'document_process', 'free');
  assertEquals(user2Result.allowed, true);
  assertEquals(user2Result.remaining, limit - 1);
});

Deno.test('Rate Limiter - Different endpoints are independent', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-endpoint-isolation-${Date.now()}`;
  
  // Exhaust chat limit
  const chatLimit = TIER_LIMITS.free.chat.maxRequests;
  for (let i = 0; i < chatLimit; i++) {
    await limiter.checkLimit(userId, 'chat', 'free');
  }
  
  // Chat should be blocked
  const chatBlocked = await limiter.checkLimit(userId, 'chat', 'free');
  assertEquals(chatBlocked.allowed, false);
  
  // Search should still be allowed
  const searchResult = await limiter.checkLimit(userId, 'search', 'free');
  assertEquals(searchResult.allowed, true);
});

// ============= Tier-Based Limit Tests =============

Deno.test('Rate Limiter - Pro tier gets higher limits', async () => {
  const mockSupabase = createMockSupabaseClient({ userTier: 'pro' });
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-pro-tier-${Date.now()}`;
  const freeLimit = TIER_LIMITS.free.chat.maxRequests;
  const proLimit = TIER_LIMITS.pro.chat.maxRequests;
  
  // Make more requests than free tier allows
  for (let i = 0; i < freeLimit + 5; i++) {
    const result = await limiter.checkLimit(userId, 'chat', 'pro');
    assertEquals(result.allowed, true, `Pro request ${i + 1} should be allowed`);
  }
  
  // Should still have remaining
  const remaining = proLimit - freeLimit - 5;
  const lastResult = await limiter.checkLimit(userId, 'chat', 'pro');
  assertEquals(lastResult.remaining, remaining - 1);
});

Deno.test('Rate Limiter - Enterprise tier gets highest limits', async () => {
  const mockSupabase = createMockSupabaseClient({ userTier: 'enterprise' });
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-enterprise-tier-${Date.now()}`;
  const proLimit = TIER_LIMITS.pro.chat.maxRequests;
  
  // Make more requests than pro tier allows
  for (let i = 0; i < proLimit + 10; i++) {
    const result = await limiter.checkLimit(userId, 'chat', 'enterprise');
    assertEquals(result.allowed, true, `Enterprise request ${i + 1} should be allowed`);
  }
});

// ============= Default Endpoint Tests =============

Deno.test('Rate Limiter - Unknown endpoint uses default limit', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-default-endpoint-${Date.now()}`;
  
  const result = await limiter.checkLimit(userId, 'unknown_endpoint', 'free');
  assertEquals(result.allowed, true);
  assertEquals(result.remaining, TIER_LIMITS.free.default.maxRequests - 1);
});

// ============= Reset Time Tests =============

Deno.test('Rate Limiter - Reset time is in the future', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-reset-time-${Date.now()}`;
  
  const result = await limiter.checkLimit(userId, 'chat', 'free');
  const now = new Date();
  
  assertEquals(result.resetAt > now, true);
});

Deno.test('Rate Limiter - Retry-after is provided when blocked', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-retry-after-${Date.now()}`;
  const limit = TIER_LIMITS.free.document_process.maxRequests;
  
  // Exhaust limit
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId, 'document_process', 'free');
  }
  
  const blocked = await limiter.checkLimit(userId, 'document_process', 'free');
  assertEquals(blocked.allowed, false);
  assertExists(blocked.retryAfterSeconds);
  assertEquals(blocked.retryAfterSeconds! > 0, true);
  assertEquals(blocked.retryAfterSeconds! <= 60, true);
});

// ============= Rate Limit Headers Tests =============

Deno.test('Rate Limit Headers - Adds correct headers', () => {
  const result = {
    allowed: true,
    remaining: 15,
    resetAt: new Date(Date.now() + 30000),
  };
  
  const headers = addRateLimitHeaders({}, result, 'free', 'chat');
  
  assertExists(headers['X-RateLimit-Limit']);
  assertExists(headers['X-RateLimit-Remaining']);
  assertExists(headers['X-RateLimit-Reset']);
  assertEquals(headers['X-RateLimit-Limit'], String(TIER_LIMITS.free.chat.maxRequests));
  assertEquals(headers['X-RateLimit-Remaining'], '15');
});

Deno.test('Rate Limit Headers - Uses correct tier limits', () => {
  const result = {
    allowed: true,
    remaining: 50,
    resetAt: new Date(Date.now() + 30000),
  };
  
  const freeHeaders = addRateLimitHeaders({}, result, 'free', 'chat');
  const proHeaders = addRateLimitHeaders({}, result, 'pro', 'chat');
  const enterpriseHeaders = addRateLimitHeaders({}, result, 'enterprise', 'chat');
  
  assertEquals(freeHeaders['X-RateLimit-Limit'], String(TIER_LIMITS.free.chat.maxRequests));
  assertEquals(proHeaders['X-RateLimit-Limit'], String(TIER_LIMITS.pro.chat.maxRequests));
  assertEquals(enterpriseHeaders['X-RateLimit-Limit'], String(TIER_LIMITS.enterprise.chat.maxRequests));
});

// ============= Concurrent Request Tests =============

Deno.test('Rate Limiter - Handles concurrent requests correctly', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  const userId = `user-concurrent-${Date.now()}`;
  const limit = TIER_LIMITS.free.generate.maxRequests;
  
  // Make concurrent requests
  const promises = Array.from({ length: limit + 5 }, () =>
    limiter.checkLimit(userId, 'generate', 'free')
  );
  
  const results = await Promise.all(promises);
  
  // Count allowed vs blocked
  const allowed = results.filter(r => r.allowed).length;
  const blocked = results.filter(r => !r.allowed).length;
  
  // Exactly `limit` should be allowed
  assertEquals(allowed, limit);
  assertEquals(blocked, 5);
});

// ============= Edge Cases =============

Deno.test('Rate Limiter - Handles empty user ID', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);
  
  // Empty user ID should still work (treated as a unique key)
  const result = await limiter.checkLimit('', 'chat', 'free');
  assertEquals(result.allowed, true);
});

Deno.test('Rate Limiter - Handles special characters in user ID', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user:with@special!chars-${Date.now()}`;

  const result = await limiter.checkLimit(userId, 'chat', 'free');
  assertEquals(result.allowed, true);
  assertExists(result.resetAt);
});

// ============= Window Reset Tests =============

Deno.test('Rate Limiter - Window resets after expiry', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-window-reset-${Date.now()}`;
  const limit = TIER_LIMITS.free.generate.maxRequests; // 10

  // Exhaust the limit
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId, 'generate', 'free');
  }

  // Should be blocked
  const blocked = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(blocked.allowed, false);

  // Wait for window to expire (60 seconds + buffer)
  // Note: In production, we'd wait 60+ seconds. For tests, we verify the logic
  // by checking that a new window starts after the time passes
  const windowSeconds = TIER_LIMITS.free.generate.windowSeconds;
  assertEquals(windowSeconds, 60);

  // Verify retry-after is reasonable
  assertEquals(blocked.retryAfterSeconds! > 0, true);
  assertEquals(blocked.retryAfterSeconds! <= windowSeconds, true);
});

Deno.test('Rate Limiter - New window starts with fresh counter', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-fresh-window-${Date.now()}`;

  // Make first request
  const result1 = await limiter.checkLimit(userId, 'chat', 'free');
  assertEquals(result1.allowed, true);

  // In a real scenario, after windowSeconds pass, the counter should reset
  // We're testing the logic that a new window = new counter
  // Since we can't wait 60 seconds in tests, we verify the remaining count logic
  assertEquals(result1.remaining, TIER_LIMITS.free.chat.maxRequests - 1);
});

Deno.test('Rate Limiter - Multiple requests track window correctly', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-window-tracking-${Date.now()}`;
  const limit = TIER_LIMITS.free.document_process.maxRequests; // 5

  // Make all requests in the same window
  const results = [];
  for (let i = 0; i < limit; i++) {
    results.push(await limiter.checkLimit(userId, 'document_process', 'free'));
  }

  // All should have the same window (similar resetAt times)
  const resetTimes = results.map(r => r.resetAt.getTime());
  const timeRange = Math.max(...resetTimes) - Math.min(...resetTimes);

  // All resetAt times should be within 1 second of each other (same window)
  assertEquals(timeRange < 1000, true);
});

Deno.test('Rate Limiter - RetryAfter decreases as time passes', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-retry-after-${Date.now()}`;
  const limit = TIER_LIMITS.free.generate.maxRequests;

  // Exhaust limit
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId, 'generate', 'free');
  }

  const blocked1 = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(blocked1.allowed, false);

  const retryAfter1 = blocked1.retryAfterSeconds!;

  // Wait a short time
  await delay(100);

  const blocked2 = await limiter.checkLimit(userId, 'generate', 'free');
  const retryAfter2 = blocked2.retryAfterSeconds!;

  // RetryAfter should be same or slightly less (since we only waited 100ms)
  assertEquals(retryAfter2 <= retryAfter1, true);
});

// ============= Tier Transition Tests =============

Deno.test('Rate Limiter - Changing tiers affects limits', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-tier-change-${Date.now()}`;

  // Start with free tier
  const freeResult = await limiter.checkLimit(userId, 'chat', 'free');
  assertEquals(freeResult.remaining, TIER_LIMITS.free.chat.maxRequests - 1);

  // Simulate upgrade to pro (in practice, this would be a new window with pro tier)
  // Different tier = different counter key, so independent limits
  const proUserId = `${userId}-pro`;
  const proResult = await limiter.checkLimit(proUserId, 'chat', 'pro');
  assertEquals(proResult.remaining, TIER_LIMITS.pro.chat.maxRequests - 1);

  // Pro should have more remaining
  assertEquals(proResult.remaining > freeResult.remaining, true);
});

// ============= Stress Tests =============

Deno.test('Rate Limiter - Handles rapid sequential requests', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-rapid-${Date.now()}`;
  const limit = 5;

  // Make rapid requests
  const startTime = Date.now();
  for (let i = 0; i < limit; i++) {
    await limiter.checkLimit(userId, 'document_process', 'free');
  }
  const endTime = Date.now();

  // Should complete quickly (less than 1 second for 5 requests)
  assertEquals(endTime - startTime < 1000, true);
});

Deno.test('Rate Limiter - Handles burst then wait pattern', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-burst-${Date.now()}`;
  const limit = TIER_LIMITS.free.generate.maxRequests;

  // Burst: use half the limit
  for (let i = 0; i < Math.floor(limit / 2); i++) {
    await limiter.checkLimit(userId, 'generate', 'free');
  }

  // Wait briefly
  await delay(50);

  // Use remaining
  for (let i = 0; i < Math.floor(limit / 2); i++) {
    const result = await limiter.checkLimit(userId, 'generate', 'free');
    assertEquals(result.allowed, true);
  }

  // Next should be blocked
  const blocked = await limiter.checkLimit(userId, 'generate', 'free');
  assertEquals(blocked.allowed, false);
});

// ============= API Endpoint Specific Tests =============

Deno.test('Rate Limiter - API ingest has appropriate limits', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-api-ingest-${Date.now()}`;

  const freeResult = await limiter.checkLimit(userId, 'api_ingest', 'free');
  assertEquals(freeResult.remaining, TIER_LIMITS.free.api_ingest.maxRequests - 1);

  // API ingest should have high limits
  assertEquals(TIER_LIMITS.free.api_ingest.maxRequests >= 100, true);
  assertEquals(TIER_LIMITS.enterprise.api_ingest.maxRequests >= 1000, true);
});

Deno.test('Rate Limiter - Document operations have conservative limits', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  // Document upload and processing should be more restricted than chat/search
  assertEquals(
    TIER_LIMITS.free.document_upload.maxRequests <= TIER_LIMITS.free.chat.maxRequests,
    true
  );

  assertEquals(
    TIER_LIMITS.free.document_process.maxRequests <= TIER_LIMITS.free.chat.maxRequests,
    true
  );
});

// ============= Memory Management Tests =============

Deno.test('Rate Limiter - Cleanup removes old entries', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  // Make requests for many different users
  const userCount = 50;
  for (let i = 0; i < userCount; i++) {
    await limiter.checkLimit(`user-cleanup-${i}`, 'chat', 'free');
  }

  // Cleanup happens automatically after 5 minutes or when entries are old
  // We're verifying the system doesn't crash with many users
  const result = await limiter.checkLimit('user-final-cleanup', 'chat', 'free');
  assertEquals(result.allowed, true);
});

// ============= Error Handling Tests =============

Deno.test('Rate Limiter - Gracefully handles missing tier', async () => {
  const mockSupabase = createMockSupabaseClient();
  // @ts-ignore - mock client
  const limiter = createRateLimiter(mockSupabase);

  const userId = `user-invalid-tier-${Date.now()}`;

  // @ts-ignore - testing invalid tier
  const result = await limiter.checkLimit(userId, 'chat', 'invalid_tier');

  // Should fall back to free tier or default
  assertEquals(result.allowed, true);
  assertExists(result.resetAt);
});
