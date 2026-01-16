import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
  duration: number;
}

export interface UseResilientOperationReturn<T> {
  execute: (operation: () => Promise<T>) => Promise<OperationResult<T>>;
  isExecuting: boolean;
  isLocked: boolean;
  lastResult: OperationResult<T> | null;
  reset: () => void;
  cancel: () => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 60000,
};

// Transient error patterns that should trigger retry
const TRANSIENT_ERROR_PATTERNS = [
  'timeout',
  'network',
  'fetch failed',
  'connection',
  'ECONNRESET',
  'ETIMEDOUT',
  '503',
  '502',
  '504',
  'temporarily unavailable',
  'overloaded',
  'rate limit',
  '429',
];

function isTransientError(error: string): boolean {
  const lowerError = error.toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some(pattern => 
    lowerError.includes(pattern.toLowerCase())
  );
}

function exponentialBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * (delay * 0.1);
}

export function useResilientOperation<T>(
  config: Partial<RetryConfig> = {}
): UseResilientOperationReturn<T> {
  const { toast } = useToast();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lastResult, setLastResult] = useState<OperationResult<T> | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const executionRef = useRef(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExecuting(false);
    setIsLocked(false);
    executionRef.current = false;
  }, []);
  
  const reset = useCallback(() => {
    cancel();
    setLastResult(null);
  }, [cancel]);
  
  const execute = useCallback(async (
    operation: () => Promise<T>
  ): Promise<OperationResult<T>> => {
    // Double-execution protection
    if (executionRef.current || isLocked) {
      return {
        success: false,
        error: 'Operation already in progress',
        retryCount: 0,
        duration: 0,
      };
    }
    
    setIsExecuting(true);
    setIsLocked(true);
    executionRef.current = true;
    abortControllerRef.current = new AbortController();
    
    const startTime = Date.now();
    let lastError: string = '';
    let retryCount = 0;
    
    try {
      for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }
        
        if (attempt > 0) {
          retryCount = attempt;
          const delay = exponentialBackoff(
            attempt - 1,
            mergedConfig.baseDelayMs,
            mergedConfig.maxDelayMs
          );

          logger.debug(`Retry ${attempt}/${mergedConfig.maxRetries} after ${delay}ms delay`, {
            attempt,
            maxRetries: mergedConfig.maxRetries,
            delay,
            component: 'ResilientOperation'
          });

          toast({
            title: 'Retrying Operation',
            description: `Attempt ${attempt + 1} of ${mergedConfig.maxRetries + 1}. Waiting ${Math.round(delay / 1000)}s...`,
            variant: 'default',
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
          // Create timeout race
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timeout')), mergedConfig.timeoutMs);
          });
          
          const result = await Promise.race([operation(), timeoutPromise]);
          
          const duration = Date.now() - startTime;
          const operationResult: OperationResult<T> = {
            success: true,
            data: result,
            retryCount,
            duration,
          };
          
          setLastResult(operationResult);
          return operationResult;
          
        } catch (attemptError) {
          lastError = attemptError instanceof Error ? attemptError.message : 'Unknown error';
          console.error(`[ResilientOperation] Attempt ${attempt + 1} failed:`, lastError);

          // Only retry on transient errors
          if (!isTransientError(lastError)) {
            logger.info('Non-transient error, not retrying', {
              error: lastError,
              attempt: attempt + 1,
              component: 'ResilientOperation'
            });
            break;
          }
        }
      }
      
      // All retries exhausted
      const duration = Date.now() - startTime;
      const operationResult: OperationResult<T> = {
        success: false,
        error: lastError,
        retryCount,
        duration,
      };
      
      setLastResult(operationResult);
      return operationResult;
      
    } finally {
      setIsExecuting(false);
      setIsLocked(false);
      executionRef.current = false;
      abortControllerRef.current = null;
    }
  }, [mergedConfig, isLocked, toast]);
  
  return {
    execute,
    isExecuting,
    isLocked,
    lastResult,
    reset,
    cancel,
  };
}
