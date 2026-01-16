// ============= Circuit Breaker for External AI Services =============
// Implements the Circuit Breaker pattern to prevent cascading failures
// when AI services become unavailable or unstable

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of consecutive failures before opening (default: 5)
  resetTimeout: number;           // Time in ms before entering half-open state (default: 30000)
  halfOpenMaxAttempts: number;    // Max attempts in half-open state (default: 3)
  monitoringWindow: number;       // Time window for failure tracking in ms (default: 60000)
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChangeTime: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  circuitOpenCount: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromFallback: boolean;
  circuitState: CircuitState;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,           // 30 seconds
  halfOpenMaxAttempts: 3,
  monitoringWindow: 60000,       // 1 minute
};

/**
 * Circuit Breaker implementation for protecting external service calls
 */
export class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChangeTime: number = Date.now();
  private halfOpenAttempts: number = 0;

  // Metrics for monitoring
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private circuitOpenCount: number = 0;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logStateChange('CLOSED', 'Circuit breaker initialized');
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try half-open
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        // Circuit still open, use fallback
        return this.executeFallback(fallback);
      }
    }

    // Try to execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return {
        success: true,
        data: result,
        fromFallback: false,
        circuitState: this.state,
      };
    } catch (error) {
      this.onFailure(error as Error);
      return this.executeFallback(fallback, error as Error);
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChangeTime: this.lastStateChangeTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      circuitOpenCount: this.circuitOpenCount,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.transitionToClosed();
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.logStateChange('CLOSED', 'Manual reset');
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Success in half-open state
      this.halfOpenAttempts++;

      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        // Enough successes, close the circuit
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.error(`[circuit-breaker:${this.name}] Failure recorded:`, error.message);

    if (this.state === 'HALF_OPEN') {
      // Failure in half-open state, open the circuit again
      this.transitionToOpen();
    } else if (this.state === 'CLOSED') {
      // Check if we've hit the failure threshold
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Execute fallback function or return error
   */
  private async executeFallback<T>(
    fallback?: () => T | Promise<T>,
    error?: Error
  ): Promise<CircuitBreakerResult<T>> {
    if (fallback) {
      try {
        const fallbackResult = await fallback();
        return {
          success: true,
          data: fallbackResult,
          fromFallback: true,
          circuitState: this.state,
        };
      } catch (fallbackError) {
        console.error(`[circuit-breaker:${this.name}] Fallback failed:`, fallbackError);
        return {
          success: false,
          error: fallbackError as Error,
          fromFallback: true,
          circuitState: this.state,
        };
      }
    }

    // No fallback, return error
    return {
      success: false,
      error: error || new Error(`Circuit breaker ${this.name} is ${this.state}`),
      fromFallback: false,
      circuitState: this.state,
    };
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenAttempts = 0;
      this.lastStateChangeTime = Date.now();
      this.logStateChange('CLOSED', 'Circuit closed - service recovered');
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.circuitOpenCount++;
      this.halfOpenAttempts = 0;
      this.lastStateChangeTime = Date.now();
      this.logStateChange('OPEN', `Circuit opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    if (this.state !== 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
      this.halfOpenAttempts = 0;
      this.failureCount = 0;
      this.successCount = 0;
      this.lastStateChangeTime = Date.now();
      this.logStateChange('HALF_OPEN', 'Circuit half-open - testing service');
    }
  }

  /**
   * Log state changes for monitoring
   */
  private logStateChange(newState: CircuitState, reason: string): void {
    console.log(`[circuit-breaker:${this.name}] State: ${newState} - ${reason}`, {
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      circuitOpenCount: this.circuitOpenCount,
    });
  }
}

/**
 * Circuit Breaker Registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

/**
 * Helper function to create a circuit breaker with default config
 */
export function createCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(name, config);
}

/**
 * Helper function to get or create a circuit breaker from registry
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return CircuitBreakerRegistry.getInstance().getOrCreate(name, config);
}

/**
 * Helper function to get all circuit breaker metrics
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  return CircuitBreakerRegistry.getInstance().getAllMetrics();
}
