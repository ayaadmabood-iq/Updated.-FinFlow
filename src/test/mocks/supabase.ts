import { vi } from 'vitest';

/**
 * Mock Supabase client for testing
 * Provides configurable mock responses for all Supabase operations
 */
export const createMockSupabaseClient = () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
  };

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'test-token',
        },
      },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        session: { access_token: 'test-token' },
        user: { id: 'test-user-id', email: 'test@example.com' },
      },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: {
        session: { access_token: 'test-token' },
        user: { id: 'test-user-id', email: 'test@example.com' },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  };

  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    storage: mockStorage,
    auth: mockAuth,
    rpc: mockRpc,
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    _mockQueryBuilder: mockQueryBuilder,
    _mockStorage: mockStorage,
    _mockAuth: mockAuth,
    _mockRpc: mockRpc,
  };
};

export const mockSupabase = createMockSupabaseClient();

/**
 * Reset all mocks to default state
 */
export function resetMockSupabase() {
  vi.clearAllMocks();
}

// Mock the Supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));
