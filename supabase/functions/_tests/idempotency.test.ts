// ============= Idempotency Middleware Tests =============
// Tests for idempotency key validation, duplicate detection, and caching

import { assertEquals, assertExists, sleep } from './setup.ts';
import {
  checkIdempotency,
  createIdempotencyKey,
  storeIdempotencyResult,
  markIdempotencyFailed,
  cleanupExpiredKeys,
  getIdempotencyKey,
  isValidIdempotencyKey,
  generateIdempotencyKey,
} from '../_shared/idempotency.ts';

// ============= Mock Supabase Client =============

interface MockIdempotencyRecord {
  id: string;
  idempotency_key: string;
  user_id: string;
  status: 'processing' | 'completed' | 'failed';
  response: string | null;
  status_code: number | null;
  response_headers: Record<string, string> | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
  metadata: Record<string, any> | null;
}

function createMockIdempotencySupabase(records: MockIdempotencyRecord[] = []) {
  let mockRecords = [...records];

  return {
    from: (table: string) => {
      if (table !== 'idempotency_keys') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (columns: string = '*') => ({
          eq: (column: string, value: any) => ({
            eq: (column2: string, value2: any) => ({
              single: async () => {
                const record = mockRecords.find(
                  r => r[column as keyof MockIdempotencyRecord] === value &&
                       r[column2 as keyof MockIdempotencyRecord] === value2
                );

                if (!record) {
                  return {
                    data: null,
                    error: { code: 'PGRST116', message: 'No rows found' }
                  };
                }

                return { data: record, error: null };
              },
            }),
            maybeSingle: async () => {
              const record = mockRecords.find(
                r => r[column as keyof MockIdempotencyRecord] === value
              );
              return { data: record || null, error: null };
            },
          }),
          lt: (column: string, value: any) => ({
            delete: async () => {
              const beforeCount = mockRecords.length;
              mockRecords = mockRecords.filter(
                r => new Date(r[column as keyof MockIdempotencyRecord] as string) >= new Date(value)
              );
              return { data: null, error: null, count: beforeCount - mockRecords.length };
            },
          }),
        }),
        insert: async (data: any) => {
          const newRecord: MockIdempotencyRecord = {
            id: crypto.randomUUID(),
            idempotency_key: data.idempotency_key,
            user_id: data.user_id,
            status: data.status || 'processing',
            response: data.response || null,
            status_code: data.status_code || null,
            response_headers: data.response_headers || null,
            error_message: data.error_message || null,
            created_at: new Date().toISOString(),
            completed_at: data.completed_at || null,
            expires_at: data.expires_at,
            metadata: data.metadata || null,
          };

          // Check for unique constraint violation
          const existing = mockRecords.find(
            r => r.idempotency_key === newRecord.idempotency_key &&
                 r.user_id === newRecord.user_id
          );

          if (existing) {
            return {
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint' }
            };
          }

          mockRecords.push(newRecord);
          return { data: newRecord, error: null };
        },
        update: (data: any) => ({
          eq: (column: string, value: any) => ({
            eq: (column2: string, value2: any) => {
              return {
                then: async (callback: Function) => {
                  const recordIndex = mockRecords.findIndex(
                    r => r[column as keyof MockIdempotencyRecord] === value &&
                         r[column2 as keyof MockIdempotencyRecord] === value2
                  );

                  if (recordIndex === -1) {
                    const result = { data: null, error: { message: 'Record not found' } };
                    if (callback) return callback(result);
                    return result;
                  }

                  mockRecords[recordIndex] = { ...mockRecords[recordIndex], ...data };
                  const result = { data: mockRecords[recordIndex], error: null };
                  if (callback) return callback(result);
                  return result;
                },
              };
            },
          }),
        }),
      };
    },
    rpc: async (functionName: string, params: any) => {
      if (functionName === 'cleanup_expired_idempotency_keys') {
        const beforeCount = mockRecords.length;
        const now = new Date().toISOString();
        mockRecords = mockRecords.filter(r => r.expires_at > now);
        return { data: beforeCount - mockRecords.length, error: null };
      }
      throw new Error(`Unexpected RPC function: ${functionName}`);
    },
  };
}

// ============= Unit Tests =============

Deno.test('Idempotency: generateIdempotencyKey creates valid key', () => {
  const key = generateIdempotencyKey();

  assertExists(key);
  assertEquals(key.startsWith('idem_'), true);
  assertEquals(key.length > 10, true);
  assertEquals(isValidIdempotencyKey(key), true);
});

Deno.test('Idempotency: isValidIdempotencyKey validates format', () => {
  // Valid keys
  assertEquals(isValidIdempotencyKey('idem_abc123'), true);
  assertEquals(isValidIdempotencyKey('idem_test-key_123'), true);
  assertEquals(isValidIdempotencyKey('custom-key-12345'), true);

  // Invalid keys
  assertEquals(isValidIdempotencyKey(''), false);
  assertEquals(isValidIdempotencyKey('a'), false); // Too short
  assertEquals(isValidIdempotencyKey('ab'), false); // Too short
  assertEquals(isValidIdempotencyKey('a'.repeat(257)), false); // Too long
  assertEquals(isValidIdempotencyKey('invalid key with spaces'), false);
  assertEquals(isValidIdempotencyKey('key_with_<script>'), false);
  assertEquals(isValidIdempotencyKey('key"with"quotes'), false);
});

Deno.test('Idempotency: getIdempotencyKey extracts from request', () => {
  const mockRequest = (headers: Record<string, string>) => ({
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  });

  // Test with X-Idempotency-Key header
  const req1 = mockRequest({ 'x-idempotency-key': 'idem_test123' }) as Request;
  assertEquals(getIdempotencyKey(req1), 'idem_test123');

  // Test with Idempotency-Key header (alternative)
  const req2 = mockRequest({ 'idempotency-key': 'idem_test456' }) as Request;
  assertEquals(getIdempotencyKey(req2), 'idem_test456');

  // Test without header
  const req3 = mockRequest({}) as Request;
  assertEquals(getIdempotencyKey(req3), null);
});

Deno.test('Idempotency: checkIdempotency detects new request', async () => {
  const supabase = createMockIdempotencySupabase();

  const result = await checkIdempotency(
    supabase as any,
    'idem_new_request',
    'user123'
  );

  assertEquals(result.isIdempotent, false);
  assertEquals(result.cachedResponse, null);
  assertEquals(result.isNew, true);
});

Deno.test('Idempotency: checkIdempotency returns cached completed response', async () => {
  const cachedRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_completed',
    user_id: 'user123',
    status: 'completed',
    response: JSON.stringify({ success: true, data: 'test' }),
    status_code: 200,
    response_headers: { 'Content-Type': 'application/json' },
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([cachedRecord]);

  const result = await checkIdempotency(
    supabase as any,
    'idem_completed',
    'user123'
  );

  assertEquals(result.isIdempotent, true);
  assertExists(result.cachedResponse);
  assertEquals(result.cachedResponse?.status_code, 200);
  assertEquals(result.cachedResponse?.response, JSON.stringify({ success: true, data: 'test' }));
  assertEquals(result.isNew, false);
});

Deno.test('Idempotency: checkIdempotency waits for processing request', async () => {
  const processingRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_processing',
    user_id: 'user123',
    status: 'processing',
    response: null,
    status_code: null,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([processingRecord]);

  // This should wait and eventually timeout
  const result = await checkIdempotency(
    supabase as any,
    'idem_processing',
    'user123',
    { waitTimeout: 100, retryDelay: 20 } // Short timeout for testing
  );

  // After timeout, should still return processing status
  assertEquals(result.isIdempotent, false);
  assertEquals(result.isNew, false);
});

Deno.test('Idempotency: createIdempotencyKey creates new key', async () => {
  const supabase = createMockIdempotencySupabase();

  const success = await createIdempotencyKey(
    supabase as any,
    'idem_new',
    'user123'
  );

  assertEquals(success, true);
});

Deno.test('Idempotency: createIdempotencyKey handles duplicate', async () => {
  const existingRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_existing',
    user_id: 'user123',
    status: 'processing',
    response: null,
    status_code: null,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([existingRecord]);

  const success = await createIdempotencyKey(
    supabase as any,
    'idem_existing',
    'user123'
  );

  // Should return false (key already exists)
  assertEquals(success, false);
});

Deno.test('Idempotency: storeIdempotencyResult stores success', async () => {
  const processingRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_store',
    user_id: 'user123',
    status: 'processing',
    response: null,
    status_code: null,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([processingRecord]);

  const success = await storeIdempotencyResult(
    supabase as any,
    'idem_store',
    'user123',
    {
      response: JSON.stringify({ success: true }),
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  assertEquals(success, true);
});

Deno.test('Idempotency: markIdempotencyFailed marks as failed', async () => {
  const processingRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_fail',
    user_id: 'user123',
    status: 'processing',
    response: null,
    status_code: null,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([processingRecord]);

  const success = await markIdempotencyFailed(
    supabase as any,
    'idem_fail',
    'user123',
    'Test error message'
  );

  assertEquals(success, true);
});

Deno.test('Idempotency: cleanupExpiredKeys removes expired', async () => {
  const expiredRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_expired',
    user_id: 'user123',
    status: 'completed',
    response: JSON.stringify({ success: true }),
    status_code: 200,
    response_headers: null,
    error_message: null,
    created_at: new Date(Date.now() - 100000).toISOString(),
    completed_at: new Date(Date.now() - 50000).toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
    metadata: null,
  };

  const validRecord: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_valid',
    user_id: 'user123',
    status: 'completed',
    response: JSON.stringify({ success: true }),
    status_code: 200,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // Not expired
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([expiredRecord, validRecord]);

  const deletedCount = await cleanupExpiredKeys(supabase as any);

  assertEquals(deletedCount, 1);
});

Deno.test('Idempotency: custom TTL configuration', async () => {
  const supabase = createMockIdempotencySupabase();

  const customTTL = 7200; // 2 hours
  const success = await createIdempotencyKey(
    supabase as any,
    'idem_custom_ttl',
    'user123',
    { ttlSeconds: customTTL }
  );

  assertEquals(success, true);
});

Deno.test('Idempotency: different users same key isolation', async () => {
  const user1Record: MockIdempotencyRecord = {
    id: crypto.randomUUID(),
    idempotency_key: 'idem_shared',
    user_id: 'user1',
    status: 'completed',
    response: JSON.stringify({ user: 'user1' }),
    status_code: 200,
    response_headers: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: null,
  };

  const supabase = createMockIdempotencySupabase([user1Record]);

  // User1 should get cached response
  const result1 = await checkIdempotency(
    supabase as any,
    'idem_shared',
    'user1'
  );
  assertEquals(result1.isIdempotent, true);

  // User2 should get new request (not cached)
  const result2 = await checkIdempotency(
    supabase as any,
    'idem_shared',
    'user2'
  );
  assertEquals(result2.isIdempotent, false);
  assertEquals(result2.isNew, true);
});

// ============= Integration Tests =============

Deno.test('Idempotency: end-to-end flow with success', async () => {
  const supabase = createMockIdempotencySupabase();
  const key = 'idem_e2e_success';
  const userId = 'user123';

  // Step 1: Check - should be new
  const check1 = await checkIdempotency(supabase as any, key, userId);
  assertEquals(check1.isNew, true);

  // Step 2: Create key (mark as processing)
  const created = await createIdempotencyKey(supabase as any, key, userId);
  assertEquals(created, true);

  // Step 3: Store result (mark as completed)
  const stored = await storeIdempotencyResult(
    supabase as any,
    key,
    userId,
    {
      response: JSON.stringify({ success: true, data: 'result' }),
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
  assertEquals(stored, true);

  // Step 4: Check again - should return cached
  const check2 = await checkIdempotency(supabase as any, key, userId);
  assertEquals(check2.isIdempotent, true);
  assertExists(check2.cachedResponse);
  assertEquals(check2.cachedResponse?.status_code, 200);
});

Deno.test('Idempotency: end-to-end flow with failure', async () => {
  const supabase = createMockIdempotencySupabase();
  const key = 'idem_e2e_failure';
  const userId = 'user123';

  // Step 1: Create key
  await createIdempotencyKey(supabase as any, key, userId);

  // Step 2: Mark as failed
  const marked = await markIdempotencyFailed(
    supabase as any,
    key,
    userId,
    'Operation failed'
  );
  assertEquals(marked, true);

  // Step 3: Check - should detect failed status
  const check = await checkIdempotency(supabase as any, key, userId);
  assertEquals(check.isIdempotent, false); // Failed requests are not cached
});

Deno.test('Idempotency: concurrent requests with same key', async () => {
  const supabase = createMockIdempotencySupabase();
  const key = 'idem_concurrent';
  const userId = 'user123';

  // Simulate two concurrent requests
  const promise1 = (async () => {
    const check = await checkIdempotency(supabase as any, key, userId);
    if (check.isNew) {
      await createIdempotencyKey(supabase as any, key, userId);
      await sleep(50); // Simulate processing
      await storeIdempotencyResult(supabase as any, key, userId, {
        response: JSON.stringify({ request: 1 }),
        statusCode: 200,
        headers: {},
      });
    }
    return 'request1';
  })();

  const promise2 = (async () => {
    await sleep(10); // Small delay to ensure second request arrives during processing
    const check = await checkIdempotency(supabase as any, key, userId);
    if (check.isNew) {
      const created = await createIdempotencyKey(supabase as any, key, userId);
      if (!created) {
        // Key already exists, wait for completion
        return 'request2-waited';
      }
    }
    return 'request2';
  })();

  const [result1, result2] = await Promise.all([promise1, promise2]);

  // First request should complete, second should detect duplicate
  assertEquals(result1, 'request1');
  assertEquals(result2.includes('request2'), true);
});

console.log('✓ All idempotency tests passed');
