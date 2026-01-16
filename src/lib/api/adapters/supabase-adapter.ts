/**
 * Supabase Adapter
 * 
 * Implements the backend provider contracts using Supabase.
 * This adapter can be swapped for a NestJS adapter in the future.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  IAuthProvider,
  IDatabaseProvider,
  IStorageProvider,
  IFunctionProvider,
  IBackendProvider,
  AuthUser,
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
  QueryOptions,
  StorageUploadResult,
  SignedUrlResult,
  FunctionInvokeOptions,
  FunctionResponse,
} from '../contracts';

// ============================================================================
// Supabase Auth Adapter
// ============================================================================

class SupabaseAuthAdapter implements IAuthProvider {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error('Login failed');

    const user = await this.fetchProfile(data.user.id);
    return { user, token: data.session.access_token };
  }

  async register(credentials: RegisterCredentials): Promise<{ user: AuthUser; token: string }> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: { name: credentials.name },
      },
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error('Registration failed');

    const user = await this.fetchProfile(data.user.id);
    return { user, token: data.session.access_token };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const user = await this.fetchProfile(session.user.id);
    return {
      user,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || 0,
    };
  }

  async getUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.fetchProfile(user.id);
  }

  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        avatar_url: updates.avatar,
      })
      .eq('id', user.id);

    if (error) throw error;
    return this.fetchProfile(user.id);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const user = await this.fetchProfile(session.user.id);
          callback({
            user,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at || 0,
          });
        } else {
          callback(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }

  private async fetchProfile(userId: string): Promise<AuthUser> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.avatar_url || undefined,
      role: data.role as AuthUser['role'],
      subscriptionTier: data.subscription_tier as AuthUser['subscriptionTier'],
      status: data.status as AuthUser['status'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// ============================================================================
// Supabase Database Adapter
// ============================================================================

class SupabaseDatabaseAdapter implements IDatabaseProvider {
  async query<T>(table: string, options?: QueryOptions): Promise<T[]> {
    // Use type assertion to work around Supabase's strict typing
    // This allows the generic adapter to work with any table
    const baseQuery = supabase.from(table as 'profiles');
    let query = baseQuery.select(options?.select || '*');

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === null) {
          query = query.is(key as 'id', null) as typeof query;
        } else {
          query = query.eq(key as 'id', value as string) as typeof query;
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column as 'id', {
        ascending: options.orderBy.ascending ?? true,
      }) as typeof query;
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as T[];
  }

  async queryOne<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(table as 'profiles')
      .select('*')
      .eq('id' as 'id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as T | null;
  }

  async insert<T>(table: string, insertData: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(table as 'profiles')
      .insert(insertData as Record<string, unknown> as never)
      .select()
      .single();

    if (error) throw error;
    return result as unknown as T;
  }

  async update<T>(table: string, id: string, updateData: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(table as 'profiles')
      .update(updateData as Record<string, unknown> as never)
      .eq('id' as 'id', id)
      .select()
      .single();

    if (error) throw error;
    return result as unknown as T;
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table as 'profiles')
      .delete()
      .eq('id' as 'id', id);
    if (error) throw error;
  }

  async rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    // Type assertion for dynamic RPC calls
    const { data, error } = await supabase.rpc(
      functionName as 'check_quota',
      params as never
    );
    if (error) throw error;
    return data as unknown as T;
  }
}

// ============================================================================
// Supabase Storage Adapter
// ============================================================================

class SupabaseStorageAdapter implements IStorageProvider {
  async upload(bucket: string, path: string, file: File | Blob): Promise<StorageUploadResult> {
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;

    return { path };
  }

  async download(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  // Security: Default TTL reduced from 300s to 60s to minimize link leakage window
  async getSignedUrl(bucket: string, path: string, expiresIn = 60): Promise<SignedUrlResult> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

// ============================================================================
// Supabase Functions Adapter
// ============================================================================

class SupabaseFunctionAdapter implements IFunctionProvider {
  async invoke<T = unknown>(
    functionName: string,
    options?: FunctionInvokeOptions
  ): Promise<FunctionResponse<T>> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options?.body,
      headers: options?.headers,
    });

    return {
      data: data as T,
      error: error ? new Error(error.message) : null,
    };
  }
}

// ============================================================================
// Combined Supabase Backend Provider
// ============================================================================

class SupabaseBackendProvider implements IBackendProvider {
  auth: IAuthProvider;
  database: IDatabaseProvider;
  storage: IStorageProvider;
  functions: IFunctionProvider;

  constructor() {
    this.auth = new SupabaseAuthAdapter();
    this.database = new SupabaseDatabaseAdapter();
    this.storage = new SupabaseStorageAdapter();
    this.functions = new SupabaseFunctionAdapter();
  }
}

// Export singleton instance
export const supabaseBackend = new SupabaseBackendProvider();

// Export individual adapters for testing
export {
  SupabaseAuthAdapter,
  SupabaseDatabaseAdapter,
  SupabaseStorageAdapter,
  SupabaseFunctionAdapter,
  SupabaseBackendProvider,
};
