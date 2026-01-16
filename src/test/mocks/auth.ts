import { vi } from 'vitest';
import type { User, AuthState } from '@/types';

/**
 * Mock user data for testing
 */
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
};

/**
 * Mock authenticated state
 */
export const mockAuthenticatedState: AuthState = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
};

/**
 * Mock unauthenticated state
 */
export const mockUnauthenticatedState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

/**
 * Mock loading state
 */
export const mockLoadingState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

/**
 * Create mock auth service
 */
export const createMockAuthService = () => ({
  login: vi.fn().mockResolvedValue({ user: mockUser, token: 'test-token' }),
  register: vi.fn().mockResolvedValue({ user: mockUser, token: 'test-token' }),
  logout: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(mockUser),
  changePassword: vi.fn().mockResolvedValue(undefined),
  getAuthState: vi.fn().mockReturnValue(mockAuthenticatedState),
  getSession: vi.fn().mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
    error: null,
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
});

export const mockAuthService = createMockAuthService();
