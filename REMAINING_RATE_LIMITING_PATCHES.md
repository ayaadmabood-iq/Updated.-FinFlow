# Remaining Rate Limiting Patches

## Summary
- **Total Functions**: 68
- **Successfully Applied (Automated)**: 38
- **Skipped (Webhooks/Executors)**: 15
- **Remaining to Apply (Manual)**: 14
- **Already Protected**: 1 (project-chat)

**Current Coverage**: 39/68 (57%) → **Target**: 53/68 (78%) after manual patches

---

## Functions Requiring Manual Patches (14)

These functions use non-standard auth patterns and require manual rate limiting application.

### Pattern Found
All these functions use `await supabase.auth.getUser(token)` with the pattern:
```typescript
const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);

if (claimsError || !claimsData?.user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const userId = claimsData.user.id;
```

### Manual Patch Instructions

For each function below, add rate limiting immediately after the auth check:

#### **Step 1**: Add Import
At the top with other imports, add:
```typescript
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
```

#### **Step 2**: Add Rate Limiting Check
After the auth check (after `const userId = claimsData.user.id;`), add:

```typescript
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, '<ENDPOINT>', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
```

---

## Function List with Endpoints

### 1. admin-metrics
- **File**: `supabase/functions/admin-metrics/index.ts`
- **Endpoint**: `default`
- **Location**: After line `const userId = claimsData.user.id;` (around line 101)

### 2. admin-stats
- **File**: `supabase/functions/admin-stats/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 3. admin-users
- **File**: `supabase/functions/admin-users/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 4. cancel-training
- **File**: `supabase/functions/cancel-training/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 5. check-training-status
- **File**: `supabase/functions/check-training-status/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 6. debug-documents-rls
- **File**: `supabase/functions/debug-documents-rls/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 7. delete-document
- **File**: `supabase/functions/delete-document/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 8. discover-connections
- **File**: `supabase/functions/discover-connections/index.ts`
- **Endpoint**: `search`
- **Location**: After `const userId = claimsData.user.id;`

### 9. export-document
- **File**: `supabase/functions/export-document/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 10. extract-entities
- **File**: `supabase/functions/extract-entities/index.ts`
- **Endpoint**: `generate`
- **Location**: After `const userId = claimsData.user.id;`

### 11. graph-search
- **File**: `supabase/functions/graph-search/index.ts`
- **Endpoint**: `search`
- **Location**: After `const userId = claimsData.user.id;`

### 12. seed-demo-data
- **File**: `supabase/functions/seed-demo-data/index.ts`
- **Endpoint**: `default`
- **Location**: After `const userId = claimsData.user.id;`

### 13. start-training
- **File**: `supabase/functions/start-training/index.ts`
- **Endpoint**: `generate`
- **Location**: After `const userId = claimsData.user.id;`

### 14. training-service
- **File**: `supabase/functions/training-service/index.ts`
- **Endpoint**: `generate`
- **Location**: After `const userId = claimsData.user.id;`

---

## Quick Apply Script

Use this sed-style approach for each function:

```bash
# Example for admin-metrics
FILE="supabase/functions/admin-metrics/index.ts"

# 1. Add import at top
# 2. Find line with: const userId = claimsData.user.id;
# 3. Insert after it:
#    // Rate limiting
#    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'default', corsHeaders);
#    if (rateLimitResponse) {
#      return rateLimitResponse;
#    }
```

---

## Verification

After applying all 14 patches, run:
```bash
npx tsx scripts/analyze-rate-limiting.ts
```

**Expected Result**:
- Protected: 53/68 (78%)
- Skipped (webhooks/executors): 15 functions
- **Rate Limiting Coverage**: 53/53 authenticated functions (100%)

---

## Current Status

✅ **Automated**: 38 functions
⏭️ **Skipped**: 15 functions (webhooks/executors - no auth)
⏳ **Manual Remaining**: 14 functions
✅ **Already Protected**: 1 function (project-chat)

**Total Coverage After Manual Application**: 53/68 = **78%** (100% of authenticated functions)
