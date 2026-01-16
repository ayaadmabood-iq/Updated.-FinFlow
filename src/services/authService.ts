// Authentication service - Backend implementation
// This service abstracts all auth operations. Swap implementation for NestJS migration.

import { supabase } from '@/integrations/supabase/client';
import type { User, LoginCredentials, RegisterCredentials, AuthState } from '@/types';
import type { Json } from '@/integrations/supabase/types';

// Storage keys for backward compatibility
const USER_KEY = 'auth_user';

class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    // Listen to auth state changes from the backend
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.fetchAndCacheProfile(session.user.id);
      } else {
        localStorage.removeItem(USER_KEY);
      }
      this.notifyListeners();
    });
  }

  private async fetchAndCacheProfile(userId: string): Promise<User | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar_url || undefined,
        role: profile.role as 'admin' | 'user',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  }

  // Get current auth state
  getAuthState(): AuthState {
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      user,
      isAuthenticated: !!user,
      isLoading: false,
    };
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    // Small delay to ensure profile is fetched
    setTimeout(() => {
      const state = this.getAuthState();
      this.listeners.forEach(listener => listener(state));
    }, 100);
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Login failed');
    }

    // Fetch and cache profile
    const user = await this.fetchAndCacheProfile(data.user.id);
    if (!user) {
      throw new Error('Failed to fetch user profile');
    }

    // Log login action
    await this.logAction('login', 'user', user.id, user.name);

    return { user, token: data.session.access_token };
  }

  async register(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: credentials.name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Registration failed');
    }

    // Wait for trigger to create profile, then fetch
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = await this.fetchAndCacheProfile(data.user.id);
    
    if (!user) {
      throw new Error('Failed to create user profile');
    }

    return { user, token: data.session.access_token };
  }

  async logout(): Promise<void> {
    const state = this.getAuthState();
    if (state.user) {
      await this.logAction('logout', 'user', state.user.id, state.user.name);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }

    localStorage.removeItem(USER_KEY);
    this.notifyListeners();
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const currentState = this.getAuthState();
    if (!currentState.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        avatar_url: updates.avatar,
      })
      .eq('id', currentState.user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updatedUser: User = {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.avatar_url || undefined,
      role: data.role as 'admin' | 'user',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    this.notifyListeners();

    await this.logAction('settings_change', 'settings', currentState.user.id, 'Profile updated');

    return updatedUser;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession() {
    return await supabase.auth.getSession();
  }

  private async logAction(
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName: string,
    details?: Record<string, unknown>
  ) {
    const state = this.getAuthState();
    if (!state.user) return;

    try {
      const insertData = {
        user_id: state.user.id,
        user_name: state.user.name,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        details: (details as Json) || null,
      };
      
      await supabase.from('audit_logs').insert(insertData);
    } catch (e) {
      console.error('Failed to log action:', e);
    }
  }
}

export const authService = new AuthService();
export default authService;
