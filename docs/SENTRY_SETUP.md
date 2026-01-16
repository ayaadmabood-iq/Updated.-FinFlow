# Sentry Error Monitoring Setup

FineFlow uses Sentry for comprehensive error tracking and performance monitoring across both the frontend React application and Supabase Edge Functions.

## Overview

- **Frontend**: `@sentry/react` with session replay, performance monitoring, and error boundaries
- **Edge Functions**: Custom Sentry integration via `supabase/functions/_shared/sentry.ts`

## Environment Variables

### Frontend (.env)
```bash
VITE_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
```

### Edge Functions (Supabase Secrets)
```bash
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
ENVIRONMENT=production
```

## Frontend Configuration

Sentry is initialized in `src/lib/monitoring.ts` with:
- **Session replay** (10% normal sessions, 100% on errors)
- **Performance monitoring** (10% sample rate in production)
- **Sensitive data filtering** (removes auth tokens, cookies, API keys)
- **Error filtering** (ignores ChunkLoadError, network errors)

### Error Boundary

The app is wrapped with `<ErrorBoundary>` component that:
- Catches React errors anywhere in the tree
- Reports errors to Sentry
- Shows user-friendly fallback UI

## Edge Function Integration

Import Sentry helpers:
```typescript
import { captureException, captureMessage } from "../_shared/sentry.ts";
```

### Capture Exceptions
```typescript
try {
  // your code
} catch (error) {
  await captureException(error as Error, {
    operation: 'function-name',
    userId: user?.id,
    projectId: projectId,
    extra: { additionalContext: 'value' },
  });
}
```

### Capture Messages
```typescript
await captureMessage('Something happened', 'warning', {
  operation: 'function-name',
  extra: { reason: 'details' },
});
```

## Testing

Add a test button to trigger an error:
```tsx
<Button onClick={() => { throw new Error('Test Sentry Error'); }}>
  Test Sentry
</Button>
```

Check your Sentry dashboard for the error.

## CI/CD Integration

Production deployments create Sentry releases automatically via `.github/workflows/deploy-production.yml`:
- Creates release with git SHA
- Associates commits with release
- Enables release health tracking

## Required GitHub Secrets

- `SENTRY_DSN` - Sentry Data Source Name
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_ORG` - Sentry organization slug
