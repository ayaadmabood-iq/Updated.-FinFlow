# Internal Edge Function Authentication

This document describes the authentication system for internal Edge Functions in FineFlow.

## Overview

Internal Edge Functions (pipeline executors, utility functions, and scheduled tasks) are now protected with authentication to prevent unauthorized access. This implements defense-in-depth security by ensuring that only authorized callers can invoke internal functions.

## Authentication Methods

### 1. Shared Secret (Primary Method)

Internal functions are protected using a shared secret passed via the `X-Internal-Secret` header.

**Use Cases:**
- Function-to-function calls (e.g., pipeline-orchestrator → executor functions)
- Internal utility function calls
- Manual testing and debugging

**How it Works:**
```typescript
// Caller (pipeline-orchestrator)
const response = await supabase.functions.invoke('chunking-executor', {
  body: { documentId, projectId, ... },
  headers: {
    'X-Internal-Secret': process.env.INTERNAL_FUNCTION_SECRET
  }
});

// Callee (chunking-executor)
const authResult = validateInternalCall(req);
if (!authResult.isAuthorized) {
  return unauthorizedResponse(authResult.error);
}
```

### 2. Service Role JWT (Fallback)

Functions can also be authenticated using the Supabase service role key via the `Authorization` header.

**Use Cases:**
- Administrative operations
- Scheduled tasks triggered manually
- External system integrations with proper authorization

**How it Works:**
```typescript
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

### 3. Cron Verification (Scheduled Tasks)

Scheduled tasks additionally validate cron-specific headers from Cloudflare Workers.

**Use Cases:**
- Monthly quota resets
- Cleanup jobs
- Scheduled maintenance tasks

**Validated Headers:**
- `CF-Connecting-IP`
- `X-Cron-Signature`
- `User-Agent` (must contain "Cloudflare")

## Protected Functions

### Pipeline Executors
All pipeline stage executors are protected with `validateInternalCall()`:

1. ✅ **chunking-executor** - Creates document chunks
2. ✅ **extraction-executor** - Extracts text from documents
3. ✅ **indexing-executor** - Generates embeddings
4. ✅ **ingestion-executor** - Validates storage access
5. ✅ **language-executor** - Detects document language
6. ✅ **summarization-executor** - Generates summaries

### Utility Functions
Internal utility functions protected with `validateInternalCall()`:

7. ✅ **metrics-collector** - Collects system metrics
8. ✅ **send-notification** - Sends internal notifications
9. ✅ **send-external-notification** - Sends external notifications

### Scheduled Functions
Scheduled tasks protected with `validateScheduledTask()`:

10. ✅ **reset-monthly-quotas** - Resets monthly usage quotas

## Setup Instructions

### 1. Generate Internal Secret

Generate a secure random secret for internal function authentication:

```bash
# Linux/macOS
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Environment Variables

#### Local Development (.env)
```bash
INTERNAL_FUNCTION_SECRET="your-generated-secret-here"
```

#### Supabase Dashboard
1. Go to **Settings** → **Edge Functions** → **Environment Variables**
2. Add `INTERNAL_FUNCTION_SECRET` with your generated secret
3. Restart all Edge Functions to apply the change

#### CI/CD (GitHub Actions)
Add to your repository secrets:
```yaml
# .github/workflows/deploy-*.yml
env:
  INTERNAL_FUNCTION_SECRET: ${{ secrets.INTERNAL_FUNCTION_SECRET }}
```

### 3. Verify Configuration

Test that authentication is working:

```bash
# Should FAIL without secret (401 Unauthorized)
curl -X POST https://your-project.supabase.co/functions/v1/chunking-executor \
  -H "Content-Type: application/json" \
  -d '{"documentId": "test", "projectId": "test"}'

# Should SUCCEED with secret (200 OK or validation error)
curl -X POST https://your-project.supabase.co/functions/v1/chunking-executor \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret-here" \
  -d '{"documentId": "test", "projectId": "test"}'
```

## Security Best Practices

### Secret Management

1. **Never commit secrets** to version control
   - Use `.env` for local development (already in `.gitignore`)
   - Use environment variables in production
   - Use secret managers for sensitive deployments

2. **Rotate secrets regularly**
   - Update `INTERNAL_FUNCTION_SECRET` every 90 days
   - Update immediately if exposure is suspected
   - Coordinate rotation with all team members

3. **Use different secrets per environment**
   - Development: Local secret
   - Staging: Staging-specific secret
   - Production: Production-specific secret

### Access Control

1. **Principle of Least Privilege**
   - Only pipeline-orchestrator should call executor functions
   - Only scheduled tasks should call reset-monthly-quotas
   - Monitor logs for unauthorized access attempts

2. **Defense in Depth**
   - Internal secret authentication (layer 1)
   - Service role JWT fallback (layer 2)
   - Cron verification for scheduled tasks (layer 3)
   - Input validation at function level (layer 4)

3. **Audit Logging**
   - All authentication attempts are logged
   - Failed attempts are logged with warnings
   - Monitor logs for suspicious patterns

## Troubleshooting

### 401 Unauthorized Errors

**Problem:** Internal functions return 401 Unauthorized

**Solutions:**
1. Verify `INTERNAL_FUNCTION_SECRET` is set in Supabase Dashboard
2. Restart Edge Functions after adding environment variable
3. Check that pipeline-orchestrator is passing the header correctly
4. Verify secret matches in both caller and callee

### Pipeline Processing Failures

**Problem:** Document processing fails at executor stage

**Solutions:**
1. Check Edge Function logs for authentication errors
2. Verify `INTERNAL_FUNCTION_SECRET` is configured
3. Test individual executor with correct secret
4. Ensure pipeline-orchestrator has access to environment variable

### Cron Job Failures

**Problem:** Scheduled tasks (quota reset) fail with 401

**Solutions:**
1. Verify cron job is configured in Supabase Dashboard
2. Check that `X-Internal-Secret` is set in cron configuration
3. Alternatively, use service role JWT for scheduled tasks
4. Monitor CF-Connecting-IP and User-Agent headers

## Migration Guide

### For Existing Deployments

1. **Add Environment Variable**
   ```bash
   # Generate secret
   SECRET=$(openssl rand -hex 32)

   # Add to Supabase
   supabase secrets set INTERNAL_FUNCTION_SECRET=$SECRET
   ```

2. **Deploy Updated Functions**
   ```bash
   # Deploy all updated functions
   supabase functions deploy chunking-executor
   supabase functions deploy extraction-executor
   # ... etc
   ```

3. **Test Pipeline**
   ```bash
   # Upload test document through UI
   # Verify processing completes successfully
   # Check logs for authentication success messages
   ```

4. **Update Team**
   - Share secret securely with team members
   - Update local .env files
   - Document secret rotation schedule

### Rolling Back

If issues arise, you can temporarily disable auth checks:

1. Remove auth validation from functions (not recommended)
2. Or set `INTERNAL_FUNCTION_SECRET` to empty string to bypass
3. Deploy hotfix and investigate root cause

## API Reference

### validateInternalCall(req: Request): AuthResult

Validates internal function call authentication using shared secret or service role JWT.

**Returns:**
```typescript
{
  isAuthorized: boolean;
  error?: string;
  caller?: 'function' | 'service';
}
```

**Usage:**
```typescript
import { validateInternalCall, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

const authResult = validateInternalCall(req);
logAuthAttempt('function-name', authResult, requestId);

if (!authResult.isAuthorized) {
  return unauthorizedResponse(authResult.error);
}
```

### validateScheduledTask(req: Request): AuthResult

Validates scheduled task authentication using cron headers or shared secret.

**Returns:**
```typescript
{
  isAuthorized: boolean;
  error?: string;
  caller?: 'cron' | 'function' | 'service';
}
```

**Usage:**
```typescript
import { validateScheduledTask, unauthorizedResponse, logAuthAttempt } from '../_shared/internal-auth.ts';

const authResult = validateScheduledTask(req);
logAuthAttempt('scheduled-task-name', authResult);

if (!authResult.isAuthorized) {
  return unauthorizedResponse(authResult.error);
}
```

### createInternalHeaders(): Record<string, string>

Creates headers for invoking internal functions with authentication.

**Returns:**
```typescript
{
  'X-Internal-Secret': string;
  'Content-Type': 'application/json';
}
```

**Usage:**
```typescript
import { createInternalHeaders } from '../_shared/internal-auth.ts';

const headers = createInternalHeaders();
const response = await fetch(functionUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload)
});
```

## Monitoring

### Authentication Logs

All authentication attempts are logged with the following format:

```
[function-name:requestId] Authorized call from <caller>
[function-name:requestId] Unauthorized call attempt: <error>
```

### Metrics to Monitor

1. **Failed Authentication Rate**
   - Alert if > 5% of calls fail authentication
   - Indicates misconfiguration or attack

2. **Unauthorized Access Attempts**
   - Log all 401 responses
   - Track source IPs and patterns

3. **Function Invocation Patterns**
   - Monitor which functions are called most
   - Detect unusual call patterns

## FAQ

### Q: Why use a shared secret instead of JWT?

A: Shared secrets are simpler for internal function-to-function communication and don't require token verification overhead. JWT (service role) is still supported as a fallback for administrative operations.

### Q: Can I disable authentication for testing?

A: Not recommended for production. For local testing, set the secret in your local .env and use it in requests. For staging, use a different secret than production.

### Q: How do I rotate the secret?

A: 1) Generate new secret, 2) Update in Supabase Dashboard, 3) Restart all Edge Functions, 4) Update local .env files, 5) Verify pipeline works.

### Q: What if I lose the secret?

A: Generate a new secret and follow the rotation process. All functions will need the new secret to communicate.

### Q: Do frontend calls need the secret?

A: No! The secret is only for internal function-to-function calls. Frontend calls to public APIs use standard Supabase authentication.

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set correctly
3. Test authentication with curl commands above
4. Review this documentation for troubleshooting steps

---

**Last Updated:** 2026-01-15
**Security Version:** 1.0
**Author:** FineFlow Security Team
