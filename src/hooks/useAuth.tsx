/**
 * @fileoverview Authentication context and hooks for FineFlow.
 * 
 * This module provides the authentication context provider and hook
 * for managing user authentication state throughout the application.
 * It integrates with Supabase Auth and provides a clean API for
 * login, registration, logout, and profile management.
 * 
 * @module hooks/useAuth
 * @version 1.0.0
 * 
 * @example
 * ```tsx
 * // In your app root
 * import { AuthProvider } from '@/hooks/useAuth';
 * 
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router />
 *     </AuthProvider>
 *   );
 * }
 * 
 * // In any component
 * import { useAuth } from '@/hooks/useAuth';
 * 
 * function UserMenu() {
 *   const { user, isAuthenticated, logout } = useAuth();
 * 
 *   if (!isAuthenticated) return <LoginButton />;
 * 
 *   return (
 *     <div>
 *       <span>Welcome, {user?.name}</span>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types';
import { authService } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Type definition for the authentication context.
 * 
 * Extends AuthState with authentication action methods.
 * 
 * @interface AuthContextType
 * @extends AuthState
 * @property {(credentials: LoginCredentials) => Promise<void>} login - Log in a user
 * @property {(credentials: RegisterCredentials) => Promise<void>} register - Register a new user
 * @property {() => Promise<void>} logout - Log out the current user
 * @property {(updates: Partial<User>) => Promise<void>} updateProfile - Update user profile
 */
interface AuthContextType extends AuthState {
  /** Log in a user with email and password */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Register a new user account */
  register: (credentials: RegisterCredentials) => Promise<void>;
  /** Log out the current user */
  logout: () => Promise<void>;
  /** Update the current user's profile information */
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

/**
 * React context for authentication state and actions.
 * 
 * @internal
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Authentication provider component.
 * 
 * Wraps the application and provides authentication context to all children.
 * Handles session initialization, auth state changes, and provides
 * authentication actions to the component tree.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component
 * 
 * @example
 * ```tsx
 * // Wrap your app at the root level
 * import { AuthProvider } from '@/hooks/useAuth';
 * 
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <QueryClientProvider client={queryClient}>
 *         <Router>
 *           <Routes />
 *         </Router>
 *       </QueryClientProvider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            const authState = authService.getAuthState();
            setState({ ...authState, isLoading: false });
          }, 100);
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
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
              localStorage.setItem('auth_user', JSON.stringify(user));
              setState({ user, isAuthenticated: true, isLoading: false });
            } else {
              setState({ user: null, isAuthenticated: false, isLoading: false });
            }
          });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    // Subscribe to auth service changes
    const unsubscribe = authService.subscribe((newState) => {
      setState({ ...newState, isLoading: false });
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  /**
   * Log in a user with email and password.
   * 
   * @param {LoginCredentials} credentials - Email and password
   * @throws {Error} If login fails
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await authService.login(credentials);
      setState({ user: result.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * Register a new user account.
   * 
   * @param {RegisterCredentials} credentials - Email, password, and name
   * @throws {Error} If registration fails
   */
  const register = useCallback(async (credentials: RegisterCredentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await authService.register(credentials);
      setState({ user: result.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * Log out the current user.
   * 
   * Clears the session and resets auth state.
   * @throws {Error} If logout fails
   */
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authService.logout();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  /**
   * Update the current user's profile.
   * 
   * @param {Partial<User>} updates - Profile fields to update
   * @throws {Error} If update fails
   */
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const updatedUser = await authService.updateProfile(updates);
    setState(prev => ({ ...prev, user: updatedUser }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context.
 * 
 * Provides access to the current authentication state and actions.
 * Must be used within an AuthProvider.
 * 
 * @function useAuth
 * @returns {AuthContextType} Authentication state and actions
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { user, isAuthenticated, isLoading, logout, updateProfile } = useAuth();
 * 
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 * 
 *   if (!isAuthenticated || !user) {
 *     return <Navigate to="/login" />;
 *   }
 * 
 *   const handleNameChange = async (newName: string) => {
 *     await updateProfile({ name: newName });
 *   };
 * 
 *   return (
 *     <div>
 *       <h1>Welcome, {user.name}!</h1>
 *       <p>Email: {user.email}</p>
 *       <p>Role: {user.role}</p>
 *       <EditNameForm onSubmit={handleNameChange} currentName={user.name} />
 *       <button onClick={logout}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Using for protected routes
 * function ProtectedRoute({ children }: { children: ReactNode }) {
 *   const { isAuthenticated, isLoading } = useAuth();
 *   const location = useLocation();
 * 
 *   if (isLoading) {
 *     return <FullPageLoader />;
 *   }
 * 
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" state={{ from: location }} replace />;
 *   }
 * 
 *   return <>{children}</>;
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
