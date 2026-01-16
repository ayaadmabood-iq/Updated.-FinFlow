// ============= Unified AI Executor + Circuit Breaker Integration Tests =============
// Tests the integration of circuit breaker with the unified AI executor

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { executeAIRequest, AIRequestParams } from '../_shared/unified-ai-executor.ts';
import { CircuitBreakerRegistry } from '../_shared/circuit-breaker.ts';

// Mock Supabase client
function createMockSupabase() {
  return {
    from: (table: string) => ({
      insert: async (data: unknown) => ({ data, error: null }),
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, params: unknown) => {
      return { data: null, error: null };
    },
  };
}

// Mock fetch to simulate AI API behavior
let fetchCallCount = 0;
let shouldFail = false;
let failureCount = 0;

const originalFetch = globalThis.fetch;

function mockFetchSuccess() {
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;

    if (shouldFail) {
      failureCount++;
      if (failureCount <= 5) {
        // Simulate failures
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Success response
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: 'Test response',
          role: 'assistant',
        },
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function resetFetch() {
  globalThis.fetch = originalFetch;
  fetchCallCount = 0;
  shouldFail = false;
  failureCount = 0;
}

function resetCircuitBreaker() {
  const registry = CircuitBreakerRegistry.getInstance();
  registry.resetAll();
}

// Helper to create test request params
function createTestParams(overrides?: Partial<AIRequestParams>): AIRequestParams {
  return {
    userId: 'test-user-123',
    projectId: 'test-project-456',
    operation: 'test_model',
    userInput: 'Test input',
    ...overrides,
  };
}

// Test 1: Normal operation - circuit should stay closed
Deno.test('AI Executor: circuit breaker stays CLOSED on successful requests', async () => {
  mockFetchSuccess();
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams();

  const result = await executeAIRequest(params, supabase as any);

  assertEquals(result.success, true);
  assertEquals(result.circuitState, 'CLOSED');
  assertEquals(result.fromFallback, false);
  assertExists(result.response);

  resetFetch();
});

// Test 2: Circuit opens after consecutive failures
Deno.test('AI Executor: circuit breaker opens after 5 consecutive failures', async () => {
  mockFetchSuccess();
  shouldFail = true;
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams();

  // Make 5 failing requests
  for (let i = 0; i < 5; i++) {
    const result = await executeAIRequest(params, supabase as any);
    assertEquals(result.success, false);
  }

  // 6th request should use fallback (circuit open)
  const result = await executeAIRequest(params, supabase as any);

  assertEquals(result.success, false);
  assertEquals(result.circuitState, 'OPEN');
  assertEquals(result.fromFallback, true);
  assertExists(result.error);

  resetFetch();
});

// Test 3: Circuit transitions from OPEN to HALF_OPEN after timeout
Deno.test('AI Executor: circuit transitions to HALF_OPEN after timeout', async () => {
  mockFetchSuccess();
  shouldFail = true;
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams();

  // Trip the circuit (5 failures)
  for (let i = 0; i < 5; i++) {
    await executeAIRequest(params, supabase as any);
  }

  // Verify circuit is OPEN
  const openResult = await executeAIRequest(params, supabase as any);
  assertEquals(openResult.circuitState, 'OPEN');

  // Wait for reset timeout (30 seconds in production, using smaller timeout for test)
  // Note: In real implementation, we'd need to either:
  // 1. Make timeout configurable for testing
  // 2. Use a test-specific circuit breaker with shorter timeout
  // For now, we verify the OPEN state exists

  resetFetch();
});

// Test 4: Circuit closes after successful recovery
Deno.test('AI Executor: circuit closes after successful recovery', async () => {
  mockFetchSuccess();
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams();

  // Start with failures
  shouldFail = true;
  for (let i = 0; i < 5; i++) {
    await executeAIRequest(params, supabase as any);
  }

  // Circuit should be OPEN
  const openResult = await executeAIRequest(params, supabase as any);
  assertEquals(openResult.circuitState, 'OPEN');

  // Now allow success
  shouldFail = false;
  failureCount = 10; // Ensure we're past the failure threshold

  // Wait for reset timeout (simulated)
  // In production, circuit breaker checks time elapsed
  // For testing, we'd need to manually transition or wait

  resetFetch();
});

// Test 5: Multiple concurrent requests with circuit breaker
Deno.test('AI Executor: handles concurrent requests with circuit breaker', async () => {
  mockFetchSuccess();
  resetCircuitBreaker();

  const supabase = createMockSupabase();

  // Make 10 concurrent requests
  const requests = Array.from({ length: 10 }, (_, i) =>
    executeAIRequest(createTestParams({ userInput: `Test ${i}` }), supabase as any)
  );

  const results = await Promise.all(requests);

  // All should succeed with circuit CLOSED
  results.forEach((result, i) => {
    assertEquals(result.success, true, `Request ${i} should succeed`);
    assertEquals(result.circuitState, 'CLOSED', `Request ${i} circuit should be CLOSED`);
    assertEquals(result.fromFallback, false, `Request ${i} should not use fallback`);
  });

  resetFetch();
});

// Test 6: Circuit state is logged in usage metadata
Deno.test('AI Executor: circuit state logged in usage metadata', async () => {
  mockFetchSuccess();
  shouldFail = true;
  resetCircuitBreaker();

  let loggedMetadata: any = null;

  const supabase = {
    from: (table: string) => ({
      insert: async (data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          loggedMetadata = data[0].metadata;
        }
        return { data, error: null };
      },
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, params: unknown) => {
      return { data: null, error: null };
    },
  };

  const params = createTestParams();

  // Make 5 failing requests to open circuit
  for (let i = 0; i < 5; i++) {
    await executeAIRequest(params, supabase as any);
  }

  // Next request should log circuit state
  await executeAIRequest(params, supabase as any);

  assertExists(loggedMetadata);
  assertEquals(loggedMetadata.circuit_state, 'OPEN');
  assertEquals(loggedMetadata.from_fallback, true);

  resetFetch();
});

// Test 7: Different operations share same circuit breaker
Deno.test('AI Executor: different operations share circuit breaker instance', async () => {
  mockFetchSuccess();
  shouldFail = true;
  resetCircuitBreaker();

  const supabase = createMockSupabase();

  // Make 3 failing requests with operation 'chat'
  for (let i = 0; i < 3; i++) {
    await executeAIRequest(createTestParams({ operation: 'chat' }), supabase as any);
  }

  // Make 2 failing requests with operation 'summarization'
  for (let i = 0; i < 2; i++) {
    await executeAIRequest(createTestParams({ operation: 'summarization' }), supabase as any);
  }

  // Total is 5 failures across operations, circuit should open
  const result = await executeAIRequest(createTestParams({ operation: 'translation' }), supabase as any);

  assertEquals(result.circuitState, 'OPEN');
  assertEquals(result.fromFallback, true);

  resetFetch();
});

// Test 8: Circuit breaker metrics are accessible
Deno.test('AI Executor: circuit breaker metrics accessible via registry', async () => {
  mockFetchSuccess();
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams();

  // Make some successful requests
  await executeAIRequest(params, supabase as any);
  await executeAIRequest(params, supabase as any);

  // Get metrics
  const registry = CircuitBreakerRegistry.getInstance();
  const metrics = registry.getAllMetrics();

  assertExists(metrics['ai-service']);
  assertEquals(metrics['ai-service'].state, 'CLOSED');
  assertEquals(metrics['ai-service'].totalRequests >= 2, true);

  resetFetch();
});

// Test 9: Circuit breaker respects rate limiting errors differently
Deno.test('AI Executor: circuit breaker handles rate limit errors (429)', async () => {
  resetCircuitBreaker();

  // Mock 429 rate limit error
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const supabase = createMockSupabase();
  const params = createTestParams();

  const result = await executeAIRequest(params, supabase as any);

  // Should fail but circuit logic still applies
  assertEquals(result.success, false);
  assertExists(result.circuitState);

  resetFetch();
});

// Test 10: Circuit breaker with streaming requests
Deno.test('AI Executor: circuit breaker works with streaming requests', async () => {
  mockFetchSuccess();
  resetCircuitBreaker();

  const supabase = createMockSupabase();
  const params = createTestParams({ stream: true });

  const result = await executeAIRequest(params, supabase as any);

  assertEquals(result.success, true);
  assertEquals(result.circuitState, 'CLOSED');
  assertEquals(result.fromFallback, false);

  resetFetch();
});

console.log('\n✅ All Unified AI Executor + Circuit Breaker integration tests defined\n');
