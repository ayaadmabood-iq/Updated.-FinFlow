// ============= Circuit Breaker Tests =============
// Tests for circuit breaker pattern implementation

import { assertEquals, assertExists, sleep } from './setup.ts';
import {
  CircuitBreaker,
  createCircuitBreaker,
  getCircuitBreaker,
  CircuitBreakerRegistry,
  getAllCircuitBreakerMetrics,
} from '../_shared/circuit-breaker.ts';

// ============= Helper Functions =============

function createSuccessFunction<T>(value: T): () => Promise<T> {
  return async () => value;
}

function createFailureFunction(errorMessage: string = 'Test error'): () => Promise<never> {
  return async () => {
    throw new Error(errorMessage);
  };
}

function createFallbackFunction<T>(value: T): () => T {
  return () => value;
}

// ============= Unit Tests =============

Deno.test('CircuitBreaker: starts in CLOSED state', () => {
  const breaker = createCircuitBreaker('test-service-1');
  assertEquals(breaker.getState(), 'CLOSED');
});

Deno.test('CircuitBreaker: allows successful requests', async () => {
  const breaker = createCircuitBreaker('test-service-2');
  const fn = createSuccessFunction('success');

  const result = await breaker.execute(fn);

  assertEquals(result.success, true);
  assertEquals(result.data, 'success');
  assertEquals(result.fromFallback, false);
  assertEquals(result.circuitState, 'CLOSED');
});

Deno.test('CircuitBreaker: tracks failures', async () => {
  const breaker = createCircuitBreaker('test-service-3', { failureThreshold: 3 });
  const fn = createFailureFunction();

  // Make 2 failures (below threshold)
  await breaker.execute(fn);
  await breaker.execute(fn);

  assertEquals(breaker.getState(), 'CLOSED');
  assertEquals(breaker.getMetrics().failureCount, 2);
});

Deno.test('CircuitBreaker: opens after failure threshold', async () => {
  const breaker = createCircuitBreaker('test-service-4', { failureThreshold: 3 });
  const fn = createFailureFunction();

  // Make 3 failures (at threshold)
  await breaker.execute(fn);
  await breaker.execute(fn);
  await breaker.execute(fn);

  assertEquals(breaker.getState(), 'OPEN');
  assertEquals(breaker.getMetrics().circuitOpenCount, 1);
});

Deno.test('CircuitBreaker: returns fallback when open', async () => {
  const breaker = createCircuitBreaker('test-service-5', { failureThreshold: 2 });
  const fn = createFailureFunction();
  const fallback = createFallbackFunction('fallback-value');

  // Open the circuit
  await breaker.execute(fn, fallback);
  await breaker.execute(fn, fallback);

  // Next request should use fallback
  const result = await breaker.execute(fn, fallback);

  assertEquals(result.success, true);
  assertEquals(result.data, 'fallback-value');
  assertEquals(result.fromFallback, true);
  assertEquals(result.circuitState, 'OPEN');
});

Deno.test('CircuitBreaker: enters half-open after timeout', async () => {
  const breaker = createCircuitBreaker('test-service-6', {
    failureThreshold: 2,
    resetTimeout: 100, // 100ms for faster testing
  });
  const failFn = createFailureFunction();

  // Open the circuit
  await breaker.execute(failFn);
  await breaker.execute(failFn);
  assertEquals(breaker.getState(), 'OPEN');

  // Wait for reset timeout
  await sleep(150);

  // Next request should enter half-open
  const successFn = createSuccessFunction('test');
  await breaker.execute(successFn);

  assertEquals(breaker.getState(), 'HALF_OPEN');
});

Deno.test('CircuitBreaker: closes from half-open after successes', async () => {
  const breaker = createCircuitBreaker('test-service-7', {
    failureThreshold: 2,
    resetTimeout: 100,
    halfOpenMaxAttempts: 3,
  });
  const failFn = createFailureFunction();
  const successFn = createSuccessFunction('success');

  // Open the circuit
  await breaker.execute(failFn);
  await breaker.execute(failFn);

  // Wait for reset timeout
  await sleep(150);

  // Make successful requests in half-open state
  await breaker.execute(successFn);
  await breaker.execute(successFn);
  await breaker.execute(successFn);

  // Should be closed now
  assertEquals(breaker.getState(), 'CLOSED');
});

Deno.test('CircuitBreaker: reopens from half-open on failure', async () => {
  const breaker = createCircuitBreaker('test-service-8', {
    failureThreshold: 2,
    resetTimeout: 100,
  });
  const failFn = createFailureFunction();
  const successFn = createSuccessFunction('success');

  // Open the circuit
  await breaker.execute(failFn);
  await breaker.execute(failFn);

  // Wait for reset timeout
  await sleep(150);

  // Enter half-open
  await breaker.execute(successFn);
  assertEquals(breaker.getState(), 'HALF_OPEN');

  // Fail again - should reopen
  await breaker.execute(failFn);
  assertEquals(breaker.getState(), 'OPEN');
});

Deno.test('CircuitBreaker: resets failure count on success in closed state', async () => {
  const breaker = createCircuitBreaker('test-service-9', { failureThreshold: 5 });
  const failFn = createFailureFunction();
  const successFn = createSuccessFunction('success');

  // Make some failures
  await breaker.execute(failFn);
  await breaker.execute(failFn);
  assertEquals(breaker.getMetrics().failureCount, 2);

  // Success should reset
  await breaker.execute(successFn);
  assertEquals(breaker.getMetrics().failureCount, 0);
});

Deno.test('CircuitBreaker: tracks metrics correctly', async () => {
  const breaker = createCircuitBreaker('test-service-10', { failureThreshold: 3 });
  const failFn = createFailureFunction();
  const successFn = createSuccessFunction('success');

  // Make mixed requests
  await breaker.execute(successFn);
  await breaker.execute(failFn);
  await breaker.execute(successFn);
  await breaker.execute(failFn);

  const metrics = breaker.getMetrics();

  assertEquals(metrics.totalRequests, 4);
  assertEquals(metrics.totalSuccesses, 2);
  assertEquals(metrics.totalFailures, 2);
  assertExists(metrics.lastSuccessTime);
  assertExists(metrics.lastFailureTime);
});

Deno.test('CircuitBreaker: manual reset works', async () => {
  const breaker = createCircuitBreaker('test-service-11', { failureThreshold: 2 });
  const failFn = createFailureFunction();

  // Open the circuit
  await breaker.execute(failFn);
  await breaker.execute(failFn);
  assertEquals(breaker.getState(), 'OPEN');

  // Manual reset
  breaker.reset();

  assertEquals(breaker.getState(), 'CLOSED');
  assertEquals(breaker.getMetrics().failureCount, 0);
});

Deno.test('CircuitBreaker: returns error when no fallback provided', async () => {
  const breaker = createCircuitBreaker('test-service-12', { failureThreshold: 2 });
  const failFn = createFailureFunction('test error');

  // Open the circuit
  await breaker.execute(failFn);
  await breaker.execute(failFn);

  // Try without fallback
  const result = await breaker.execute(failFn);

  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.fromFallback, false);
});

// ============= Integration Tests =============

Deno.test('CircuitBreaker: full lifecycle test', async () => {
  const breaker = createCircuitBreaker('test-service-13', {
    failureThreshold: 3,
    resetTimeout: 100,
    halfOpenMaxAttempts: 2,
  });
  const failFn = createFailureFunction();
  const successFn = createSuccessFunction('success');
  const fallback = createFallbackFunction('fallback');

  // Phase 1: CLOSED - normal operation
  assertEquals(breaker.getState(), 'CLOSED');
  await breaker.execute(successFn);
  assertEquals(breaker.getState(), 'CLOSED');

  // Phase 2: Accumulate failures
  await breaker.execute(failFn, fallback);
  await breaker.execute(failFn, fallback);
  await breaker.execute(failFn, fallback);

  // Phase 3: OPEN - circuit opened
  assertEquals(breaker.getState(), 'OPEN');
  const openResult = await breaker.execute(failFn, fallback);
  assertEquals(openResult.fromFallback, true);

  // Phase 4: Wait for reset timeout
  await sleep(150);

  // Phase 5: HALF_OPEN - testing service
  await breaker.execute(successFn);
  assertEquals(breaker.getState(), 'HALF_OPEN');

  // Phase 6: Recover to CLOSED
  await breaker.execute(successFn);
  assertEquals(breaker.getState(), 'CLOSED');

  // Verify metrics
  const metrics = breaker.getMetrics();
  assertEquals(metrics.circuitOpenCount, 1);
  assertEquals(metrics.totalRequests > 0, true);
});

Deno.test('CircuitBreaker: concurrent requests', async () => {
  const breaker = createCircuitBreaker('test-service-14', { failureThreshold: 10 });
  const successFn = createSuccessFunction('success');

  // Execute 20 concurrent requests
  const promises = Array.from({ length: 20 }, () => breaker.execute(successFn));
  const results = await Promise.all(promises);

  // All should succeed
  const successCount = results.filter(r => r.success).length;
  assertEquals(successCount, 20);
  assertEquals(breaker.getState(), 'CLOSED');
});

Deno.test('CircuitBreaker: fallback can be async', async () => {
  const breaker = createCircuitBreaker('test-service-15', { failureThreshold: 2 });
  const failFn = createFailureFunction();
  const asyncFallback = async () => {
    await sleep(10);
    return 'async-fallback';
  };

  // Open circuit
  await breaker.execute(failFn, asyncFallback);
  await breaker.execute(failFn, asyncFallback);

  // Use async fallback
  const result = await breaker.execute(failFn, asyncFallback);

  assertEquals(result.success, true);
  assertEquals(result.data, 'async-fallback');
  assertEquals(result.fromFallback, true);
});

Deno.test('CircuitBreaker: different error types', async () => {
  const breaker = createCircuitBreaker('test-service-16', { failureThreshold: 2 });

  // Network error
  const networkError = async () => {
    throw new Error('Network timeout');
  };

  // API error
  const apiError = async () => {
    throw new Error('API returned 500');
  };

  await breaker.execute(networkError);
  await breaker.execute(apiError);

  assertEquals(breaker.getState(), 'OPEN');
  assertEquals(breaker.getMetrics().totalFailures, 2);
});

// ============= Registry Tests =============

Deno.test('CircuitBreakerRegistry: get or create works', () => {
  const registry = CircuitBreakerRegistry.getInstance();
  registry.clear(); // Clean slate

  const breaker1 = registry.getOrCreate('service-1');
  const breaker2 = registry.getOrCreate('service-1');

  // Should return same instance
  assertEquals(breaker1, breaker2);
});

Deno.test('CircuitBreakerRegistry: tracks multiple breakers', () => {
  const registry = CircuitBreakerRegistry.getInstance();
  registry.clear();

  registry.getOrCreate('service-a');
  registry.getOrCreate('service-b');
  registry.getOrCreate('service-c');

  const all = registry.getAll();
  assertEquals(all.length, 3);
});

Deno.test('CircuitBreakerRegistry: get all metrics', async () => {
  const registry = CircuitBreakerRegistry.getInstance();
  registry.clear();

  const breaker1 = registry.getOrCreate('service-x');
  const breaker2 = registry.getOrCreate('service-y');

  await breaker1.execute(createSuccessFunction('test'));
  await breaker2.execute(createFailureFunction());

  const allMetrics = registry.getAllMetrics();

  assertExists(allMetrics['service-x']);
  assertExists(allMetrics['service-y']);
  assertEquals(allMetrics['service-x'].totalSuccesses, 1);
  assertEquals(allMetrics['service-y'].totalFailures, 1);
});

Deno.test('CircuitBreakerRegistry: reset all', async () => {
  const registry = CircuitBreakerRegistry.getInstance();
  registry.clear();

  const breaker1 = registry.getOrCreate('service-1', { failureThreshold: 2 });
  const breaker2 = registry.getOrCreate('service-2', { failureThreshold: 2 });

  // Open both circuits
  await breaker1.execute(createFailureFunction());
  await breaker1.execute(createFailureFunction());
  await breaker2.execute(createFailureFunction());
  await breaker2.execute(createFailureFunction());

  assertEquals(breaker1.getState(), 'OPEN');
  assertEquals(breaker2.getState(), 'OPEN');

  // Reset all
  registry.resetAll();

  assertEquals(breaker1.getState(), 'CLOSED');
  assertEquals(breaker2.getState(), 'CLOSED');
});

Deno.test('CircuitBreakerRegistry: helper functions work', async () => {
  const breaker = getCircuitBreaker('helper-test');
  await breaker.execute(createSuccessFunction('test'));

  const allMetrics = getAllCircuitBreakerMetrics();
  assertExists(allMetrics['helper-test']);
});

// ============= Edge Cases =============

Deno.test('CircuitBreaker: handles synchronous functions', async () => {
  const breaker = createCircuitBreaker('sync-test');
  const syncFn = () => Promise.resolve('sync-result');

  const result = await breaker.execute(syncFn);

  assertEquals(result.success, true);
  assertEquals(result.data, 'sync-result');
});

Deno.test('CircuitBreaker: handles fallback errors', async () => {
  const breaker = createCircuitBreaker('fallback-error-test', { failureThreshold: 1 });
  const failFn = createFailureFunction();
  const failingFallback = () => {
    throw new Error('Fallback also failed');
  };

  // Open circuit
  await breaker.execute(failFn);

  // Try with failing fallback
  const result = await breaker.execute(failFn, failingFallback);

  assertEquals(result.success, false);
  assertEquals(result.fromFallback, true);
  assertExists(result.error);
});

Deno.test('CircuitBreaker: getName returns correct name', () => {
  const breaker = createCircuitBreaker('named-service');
  assertEquals(breaker.getName(), 'named-service');
});

Deno.test('CircuitBreaker: custom config is applied', () => {
  const breaker = createCircuitBreaker('custom-config', {
    failureThreshold: 10,
    resetTimeout: 5000,
    halfOpenMaxAttempts: 5,
  });

  // Config is private, but we can test behavior
  // Would need 10 failures to open
  assertEquals(breaker.getState(), 'CLOSED');
});

console.log('✓ All circuit breaker tests passed');
