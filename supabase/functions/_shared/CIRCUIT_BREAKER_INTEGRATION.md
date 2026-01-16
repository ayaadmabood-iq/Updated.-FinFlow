# Circuit Breaker Integration Guide

## Changes Required for unified-ai-executor.ts

### 1. Add Import at Top of File

```typescript
import { getCircuitBreaker, CircuitBreakerResult } from './circuit-breaker.ts';
```

### 2. Get Circuit Breaker Instance (After line 372)

```typescript
// Get circuit breaker for AI service
const circuitBreaker = getCircuitBreaker('ai-service', {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 3,
});
```

### 3. Wrap AI API Call with Circuit Breaker (Replace lines 456-509)

Replace this section:
```typescript
  // Make API call
  try {
    const requestBody: Record<string, unknown> = {
      model: selectedModel,
      messages,
      max_tokens: params.maxTokens || 2000,
      temperature: params.temperature ?? 0.7,
      stream: params.stream || false,
    };

    if (params.tools) requestBody.tools = params.tools;
    if (params.toolChoice) requestBody.tool_choice = params.toolChoice;

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // ... error handling
  }
```

With:
```typescript
  // Prepare request body
  const requestBody: Record<string, unknown> = {
    model: selectedModel,
    messages,
    max_tokens: params.maxTokens || 2000,
    temperature: params.temperature ?? 0.7,
    stream: params.stream || false,
  };

  if (params.tools) requestBody.tools = params.tools;
  if (params.toolChoice) requestBody.tool_choice = params.toolChoice;

  // Make API call with circuit breaker protection
  const circuitResult = await circuitBreaker.execute(
    async () => {
      const response = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[unified-ai] API error ${response.status}:`, errorText);

        // Throw error to trigger circuit breaker failure count
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      return response;
    },
    // Fallback function
    () => {
      console.warn('[unified-ai] Circuit breaker fallback activated');
      return null; // Will be handled below
    }
  );

  const durationMs = Date.now() - startTime;

  // Handle circuit breaker result
  if (!circuitResult.success || !circuitResult.data) {
    const error = circuitResult.error?.message || 'AI service unavailable';

    await logUsage(supabase, {
      userId: params.userId,
      projectId: params.projectId,
      operation: params.operation,
      model: selectedModel,
      modality: params.modality || 'text',
      blocked: false,
      inputLength: sanitizedInput.length,
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      durationMs,
      modelSelectionReason: modelReason,
      requestId,
      metadata: {
        error: 'circuit_breaker',
        circuitState: circuitResult.circuitState,
        fromFallback: circuitResult.fromFallback
      },
    });

    return createErrorResponse(
      `AI service temporarily unavailable (circuit ${circuitResult.circuitState}). Please try again later.`,
      requestId,
      durationMs
    );
  }

  const response = circuitResult.data;
```

### 4. Add Circuit Breaker Metrics to getAllCircuitBreakerMetrics Endpoint

Create a new export at the end of the file:

```typescript
/**
 * Get circuit breaker metrics for monitoring
 */
export function getAICircuitBreakerMetrics() {
  const circuitBreaker = getCircuitBreaker('ai-service');
  return circuitBreaker.getMetrics();
}
```

## Integration Complete!

The circuit breaker will now:
- ✅ Track AI service failures
- ✅ Open after 5 consecutive failures
- ✅ Enter half-open state after 30 seconds
- ✅ Provide fallback response when circuit is open
- ✅ Log all state transitions
- ✅ Expose metrics for monitoring

## Testing the Integration

```typescript
// Test circuit breaker behavior
import { getCircuitBreaker } from './circuit-breaker.ts';

const breaker = getCircuitBreaker('ai-service');

// Check current state
console.log('Circuit state:', breaker.getState());

// Get metrics
console.log('Metrics:', breaker.getMetrics());

// Manual reset if needed
breaker.reset();
```

## Monitoring

Circuit breaker metrics are logged with each state transition:
- State changes (CLOSED → OPEN → HALF_OPEN)
- Failure counts
- Success counts
- Total requests
- Circuit open count

Check logs for messages like:
```
[circuit-breaker:ai-service] State: OPEN - Circuit opened after 5 failures
[circuit-breaker:ai-service] State: HALF_OPEN - Circuit half-open - testing service
[circuit-breaker:ai-service] State: CLOSED - Circuit closed - service recovered
```
