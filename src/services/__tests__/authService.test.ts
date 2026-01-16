import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

// Mock supabase before importing authService
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

import { authService } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    resetMockSupabase();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAuthState', () => {
    it('should return unauthenticated state when no user in localStorage', () => {
      const state = authService.getAuthState();
      
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should return authenticated state when user exists in localStorage', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      const state = authService.getAuthState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockSession = {
        access_token: 'test-token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('test-token-123');
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error with invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should throw error when session is not returned', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: null,
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockSession = {
        access_token: 'new-token-123',
        user: { id: 'new-user-123', email: 'new@example.com' },
      };
      const mockProfile = {
        id: 'new-user-123',
        email: 'new@example.com',
        name: 'New User',
        avatar_url: null,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.token).toBe('new-token-123');
      expect(result.user.id).toBe('new-user-123');
    });

    it('should throw error when registration fails', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Email already registered' },
      });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear localStorage', async () => {
      localStorage.setItem('auth_user', JSON.stringify({ id: 'user-123' }));
      
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });

      await authService.logout();

      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when logout fails', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Logout failed' },
      });

      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('subscribe', () => {
    it('should add and remove listeners', () => {
      const listener = vi.fn();
      
      const unsubscribe = authService.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
      
      // Unsubscribe should work without error
      unsubscribe();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      localStorage.setItem('auth_user', JSON.stringify(existingUser));

      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'New Name',
        avatar_url: null,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({ data: updatedProfile, error: null }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const result = await authService.updateProfile({ name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw error when not authenticated', async () => {
      localStorage.clear();

      await expect(
        authService.updateProfile({ name: 'New Name' })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await expect(
        authService.changePassword('oldPassword', 'newPassword')
      ).resolves.not.toThrow();
    });

    it('should throw error when password change fails', async () => {
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        error: { message: 'Weak password' },
      });

      await expect(
        authService.changePassword('oldPassword', 'weak')
      ).rejects.toThrow('Weak password');
    });
  });

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockSession = { access_token: 'token-123' };
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.data.session).toEqual(mockSession);
    });
  });
});
