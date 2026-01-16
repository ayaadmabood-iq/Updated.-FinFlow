# Error Handling Guide

This document describes the error handling patterns and best practices used in the FineFlow application.

## Overview

FineFlow uses a comprehensive error handling system with:

- **Custom Error Classes**: Typed errors with codes, status codes, and context
- **Centralized Logging**: Structured logging with Sentry integration
- **Error Boundaries**: React error boundaries for graceful UI failure handling
- **Consistent Patterns**: Unified approach across frontend and backend

## Error Classes

### Base Error Class

All errors extend `AppError`:

```typescript
import { AppError } from '@/lib/errors';

throw new AppError(
  'Something went wrong',  // message
  'CUSTOM_ERROR',          // code
  500,                     // statusCode
  true,                    // isOperational
  { userId: '123' }        // context
);
```

### Available Error Types

| Error Class | Code | HTTP Status | Use Case |
|-------------|------|-------------|----------|
| `ValidationError` | `VALIDATION_ERROR` | 400 | Invalid user input |
| `AuthenticationError` | `AUTHENTICATION_ERROR` | 401 | Missing/invalid auth |
| `AuthorizationError` | `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NotFoundError` | `NOT_FOUND` | 404 | Resource not found |
| `ConflictError` | `CONFLICT_ERROR` | 409 | Data conflicts |
| `RateLimitError` | `RATE_LIMIT_ERROR` | 429 | Rate limiting |
| `DatabaseError` | `DATABASE_ERROR` | 500 | Database errors |
| `AIServiceError` | `AI_SERVICE_ERROR` | 500 | AI operation failures |
| `NetworkError` | `NETWORK_ERROR` | 0 | Network failures |
| `TimeoutError` | `TIMEOUT_ERROR` | 408 | Operation timeouts |
| `QuotaExceededError` | `QUOTA_EXCEEDED_ERROR` | 429 | Quota limits |

### Usage Examples

```typescript
import {
  ValidationError,
  NotFoundError,
  handleError,
} from '@/lib/errors';

// Throw specific errors
if (!email) {
  throw new ValidationError('Email is required', { field: 'email' });
}

if (!project) {
  throw new NotFoundError('Project', projectId);
}

// Convert unknown errors
try {
  await externalApi.call();
} catch (error) {
  const appError = handleError(error);
  // Now we have a typed AppError
}
```

## Logger

The logger provides structured logging with automatic Sentry integration:

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.debug('Debug message', { data: 'value' });
logger.info('User logged in', { userId: '123' });
logger.warn('Slow query detected', { duration: 5000 });
logger.error('Failed to save', error, { projectId: '456' });
logger.fatal('Critical failure', error, { system: 'payments' });

// Performance tracking
const result = await logger.measurePerformance(
  'fetchProjects',
  async () => await api.getProjects(),
  { userId: '123' }
);

// Child loggers with preset context
const projectLogger = logger.child({ projectId: '123' });
projectLogger.info('Document uploaded'); // Includes projectId automatically
```

## Error Handling Hook

Use `useErrorHandler` in React components:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, withErrorHandling, hasError, lastError, isRetryable } = 
    useErrorHandler({
      context: { component: 'MyComponent' },
    });

  // Wrap async operations
  const fetchData = async () => {
    await withErrorHandling(
      async () => {
        const data = await api.getData();
        setData(data);
      },
      { toastTitle: 'Failed to load data' }
    );
  };

  // Handle errors manually
  const handleSubmit = async (formData: FormData) => {
    try {
      await api.submit(formData);
    } catch (error) {
      handleError(error, {
        toastTitle: 'Submission failed',
        onError: (err) => {
          if (err.code === 'VALIDATION_ERROR') {
            setFieldErrors(err.context?.fields);
          }
        },
      });
    }
  };

  if (hasError && lastError) {
    return (
      <div>
        <p>Error: {lastError.message}</p>
        {isRetryable && <button onClick={fetchData}>Retry</button>}
      </div>
    );
  }

  return <div>...</div>;
}
```

## Error Boundaries

Wrap components with `ErrorBoundary`:

```tsx
import { ErrorBoundary, withErrorBoundary } from '@/components/ErrorBoundary';

// Using the component
<ErrorBoundary
  fallbackRender={({ error, reset }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
  onError={(error, info) => {
    analytics.track('component_error', { error: error.message });
  }}
>
  <MyComponent />
</ErrorBoundary>

// Using the HOC
const SafeWidget = withErrorBoundary(Widget, {
  errorTitle: 'Widget Error',
});
```

## API Error Handling Pattern

Use consistent patterns for API calls:

```typescript
import { logger } from '@/lib/logger';
import { NotFoundError, DatabaseError, handleError } from '@/lib/errors';

export async function getProject(projectId: string) {
  try {
    logger.info('Fetching project', { projectId });
    
    const result = await logger.measurePerformance(
      'getProject',
      async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (error) {
          throw new DatabaseError(error.message, { code: error.code });
        }
        
        if (!data) {
          throw new NotFoundError('Project', projectId);
        }
        
        return data;
      },
      { projectId }
    );
    
    return { success: true, data: result };
  } catch (error) {
    const appError = handleError(error);
    logger.error('Failed to fetch project', appError, { projectId });
    
    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    };
  }
}
```

## Edge Function Error Handling

Use the shared exception classes for edge functions:

```typescript
import { FineFlowException, ValidationException } from '../_shared/fineflow-core/exceptions.ts';
import { captureException, captureMessage } from '../_shared/sentry.ts';

serve(async (req) => {
  try {
    const body = await req.json();
    
    if (!body.message) {
      throw new ValidationException('Message is required');
    }
    
    const result = await processMessage(body.message);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    // Capture error for monitoring
    await captureException(error as Error, {
      operation: 'process-message',
      userId: user?.id,
    });
    
    // Return standardized error response
    if (error instanceof FineFlowException) {
      return error.toResponse();
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ❌ Don't use generic errors
throw new Error('Not found');

// ✅ Use specific error classes
throw new NotFoundError('Project', projectId);
```

### 2. Include Context

```typescript
// ❌ Missing context
throw new ValidationError('Invalid input');

// ✅ Include helpful context
throw new ValidationError('Email format is invalid', {
  field: 'email',
  value: email,
  pattern: 'user@example.com',
});
```

### 3. Log at Appropriate Levels

```typescript
// Debug: Development only, very verbose
logger.debug('Processing item', { index: i, total: items.length });

// Info: Important events, business logic
logger.info('User created account', { userId });

// Warn: Potential issues, recoverable errors
logger.warn('Slow query detected', { duration, query });

// Error: Actual failures, exceptions
logger.error('Failed to save document', error, { documentId });

// Fatal: Critical failures, system down
logger.fatal('Database connection lost', error);
```

### 4. Handle Errors at Boundaries

```typescript
// ❌ Don't catch and ignore
try {
  await operation();
} catch {
  // Silent failure
}

// ✅ Handle or propagate
try {
  await operation();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation locally
    showFieldErrors(error.context);
  } else {
    // Propagate other errors
    throw error;
  }
}
```

### 5. Use Error Boundaries for UI

```tsx
// ❌ Let errors crash the app
<App>
  <UnsafeComponent />
</App>

// ✅ Contain errors with boundaries
<App>
  <ErrorBoundary>
    <SafeComponent />
  </ErrorBoundary>
</App>
```

## Sentry Integration

Errors are automatically sent to Sentry in production. To test:

```tsx
<button onClick={() => {
  throw new Error('Test Sentry Error');
}}>
  Test Sentry
</button>
```

Check the Sentry dashboard at your organization's Sentry instance.

## Error Codes Reference

| Code | Description | Action |
|------|-------------|--------|
| `VALIDATION_ERROR` | Invalid input | Show form errors |
| `AUTHENTICATION_ERROR` | Not logged in | Redirect to login |
| `AUTHORIZATION_ERROR` | No permission | Show access denied |
| `NOT_FOUND` | Resource missing | Show 404 page |
| `RATE_LIMIT_ERROR` | Too many requests | Show retry timer |
| `NETWORK_ERROR` | Connection failed | Show offline message |
| `TIMEOUT_ERROR` | Request timed out | Offer retry |
| `DATABASE_ERROR` | Database issue | Show error + contact |
| `AI_SERVICE_ERROR` | AI failure | Show fallback content |
| `QUOTA_EXCEEDED_ERROR` | Limit reached | Show upgrade prompt |
