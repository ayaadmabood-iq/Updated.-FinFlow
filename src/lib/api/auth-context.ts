/**
 * @fileoverview Centralized Auth Context
 * 
 * This module centralizes all authentication assumptions and provides
 * a unified interface for auth operations across the application.
 * 
 * **Benefits:**
 * - Single source of truth for auth state
 * - Easy to swap auth providers
 * - Consistent error handling
 * - Type-safe auth operations
 * 
 * @module lib/api/auth-context
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * import { 
 *   initializeAuth, 
 *   getCurrentUser, 
 *   login, 
 *   logout,
 *   isAdmin 
 * } from '@/lib/api/auth-context';
 * 
 * // Initialize on app startup
 * await initializeAuth();
 * 
 * // Check current user
 * const user = getCurrentUser();
 * if (user && isAdmin()) {
 *   console.log('Admin user:', user.name);
 * }
 * 
 * // Perform login
 * await login('user@example.com', 'password');
 * ```
 */

import type { AuthUser, AuthSession } from './contracts';
import { getBackendProvider } from './provider';

// ============================================================================
// Auth State Management
// ============================================================================

/**
 * Callback function type for auth state change listeners.
 * 
 * @callback AuthStateListener
 * @param {AuthState} state - The new authentication state
 */
type AuthStateListener = (state: AuthState) => void;

/**
 * Authentication state structure.
 * 
 * @interface AuthState
 * @property {AuthUser | null} user - The currently authenticated user, or null
 * @property {AuthSession | null} session - The current session, or null
 * @property {boolean} isAuthenticated - Whether a user is currently authenticated
 * @property {boolean} isLoading - Whether authentication state is being determined
 * 
 * @example
 * ```typescript
 * const state: AuthState = {
 *   user: { id: 'user-123', email: 'user@example.com', ... },
 *   session: { accessToken: 'jwt...', ... },
 *   isAuthenticated: true,
 *   isLoading: false,
 * };
 * ```
 */
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** Set of registered auth state listeners */
const listeners = new Set<AuthStateListener>();

/** Current authentication state */
let currentState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
};

/**
 * Notify all registered listeners of state change.
 * @internal
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener(currentState));
}

/**
 * Update the current auth state and notify listeners.
 * @internal
 * @param updates - Partial state updates to apply
 */
function updateState(updates: Partial<AuthState>): void {
  currentState = { ...currentState, ...updates };
  notifyListeners();
}

// ============================================================================
// Auth Operations
// ============================================================================

/**
 * Initialize authentication state on application startup.
 * 
 * This function should be called once when the application loads to
 * check for an existing session and set the initial auth state.
 * 
 * @async
 * @function initializeAuth
 * @returns {Promise<AuthState>} The initialized authentication state
 * 
 * @example
 * ```typescript
 * // In your app entry point
 * import { initializeAuth } from '@/lib/api/auth-context';
 * 
 * async function bootstrap() {
 *   const authState = await initializeAuth();
 *   
 *   if (authState.isAuthenticated) {
 *     console.log('User is logged in:', authState.user?.name);
 *   } else {
 *     console.log('No active session');
 *   }
 *   
 *   // Continue with app initialization
 *   renderApp();
 * }
 * 
 * bootstrap();
 * ```
 */
export async function initializeAuth(): Promise<AuthState> {
  updateState({ isLoading: true });

  try {
    const backend = getBackendProvider();
    const session = await backend.auth.getSession();

    if (session) {
      updateState({
        user: session.user,
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    updateState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  return currentState;
}

/**
 * Subscribe to authentication state changes.
 * 
 * The listener will be called immediately with the current state,
 * and again whenever the auth state changes.
 * 
 * @function subscribeToAuth
 * @param {AuthStateListener} listener - Callback function for state changes
 * @returns {() => void} Unsubscribe function
 * 
 * @example
 * ```typescript
 * import { subscribeToAuth } from '@/lib/api/auth-context';
 * 
 * // Subscribe to auth changes
 * const unsubscribe = subscribeToAuth((state) => {
 *   console.log('Auth state changed:', state.isAuthenticated);
 *   if (state.user) {
 *     console.log('User:', state.user.name);
 *   }
 * });
 * 
 * // Later, cleanup the subscription
 * unsubscribe();
 * ```
 */
export function subscribeToAuth(listener: AuthStateListener): () => void {
  listeners.add(listener);
  
  // Immediately call with current state
  listener(currentState);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get the current authentication state synchronously.
 * 
 * Returns a copy of the current state to prevent external mutations.
 * 
 * @function getAuthState
 * @returns {AuthState} A copy of the current authentication state
 * 
 * @example
 * ```typescript
 * import { getAuthState } from '@/lib/api/auth-context';
 * 
 * const state = getAuthState();
 * console.log('Is loading:', state.isLoading);
 * console.log('Is authenticated:', state.isAuthenticated);
 * ```
 */
export function getAuthState(): AuthState {
  return { ...currentState };
}

/**
 * Get the current authenticated user synchronously.
 * 
 * @function getCurrentUser
 * @returns {AuthUser | null} The current user, or null if not authenticated
 * 
 * @example
 * ```typescript
 * import { getCurrentUser } from '@/lib/api/auth-context';
 * 
 * const user = getCurrentUser();
 * if (user) {
 *   console.log(`Welcome, ${user.name}!`);
 * } else {
 *   console.log('Please log in');
 * }
 * ```
 */
export function getCurrentUser(): AuthUser | null {
  return currentState.user;
}

/**
 * Get the current access token.
 * 
 * @function getAccessToken
 * @returns {string | null} The access token, or null if not authenticated
 * 
 * @example
 * ```typescript
 * import { getAccessToken } from '@/lib/api/auth-context';
 * 
 * const token = getAccessToken();
 * if (token) {
 *   // Use token for API calls
 *   fetch('/api/data', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 *   });
 * }
 * ```
 */
export function getAccessToken(): string | null {
  return currentState.session?.accessToken || null;
}

/**
 * Check if the current user has a specific role.
 * 
 * Role hierarchy:
 * - `super_admin` - Has all permissions
 * - `admin` - Has admin and user permissions
 * - `user` - Has user permissions only
 * 
 * @function hasRole
 * @param {AuthUser['role']} role - The role to check for
 * @returns {boolean} True if the user has the specified role (or higher)
 * 
 * @example
 * ```typescript
 * import { hasRole } from '@/lib/api/auth-context';
 * 
 * if (hasRole('admin')) {
 *   // User is admin or super_admin
 *   showAdminPanel();
 * }
 * 
 * if (hasRole('super_admin')) {
 *   // User is specifically super_admin
 *   showSuperAdminControls();
 * }
 * ```
 */
export function hasRole(role: AuthUser['role']): boolean {
  if (!currentState.user) return false;
  
  // super_admin has all permissions
  if (currentState.user.role === 'super_admin') return true;
  
  // admin has admin and user permissions
  if (currentState.user.role === 'admin' && role !== 'super_admin') return true;
  
  return currentState.user.role === role;
}

/**
 * Check if the current user is an admin (admin or super_admin).
 * 
 * @function isAdmin
 * @returns {boolean} True if the user is an admin or super_admin
 * 
 * @example
 * ```typescript
 * import { isAdmin } from '@/lib/api/auth-context';
 * 
 * if (isAdmin()) {
 *   // Show admin features
 *   return <AdminDashboard />;
 * } else {
 *   // Show regular user features
 *   return <UserDashboard />;
 * }
 * ```
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}

/**
 * Require authentication - throws if not authenticated.
 * 
 * Use this function when you need to guarantee the user is authenticated
 * and want to throw an error otherwise.
 * 
 * @function requireAuth
 * @returns {AuthUser} The authenticated user
 * @throws {Error} If no user is authenticated
 * 
 * @example
 * ```typescript
 * import { requireAuth } from '@/lib/api/auth-context';
 * 
 * function protectedAction() {
 *   const user = requireAuth(); // Throws if not authenticated
 *   
 *   // Safe to use user here - guaranteed to be authenticated
 *   console.log('Performing action for:', user.id);
 * }
 * ```
 */
export function requireAuth(): AuthUser {
  if (!currentState.user) {
    throw new Error('Authentication required');
  }
  return currentState.user;
}

/**
 * Require a specific role - throws if not authorized.
 * 
 * Use this function when you need to guarantee the user has a specific role
 * and want to throw an error otherwise.
 * 
 * @function requireRole
 * @param {AuthUser['role']} role - The required role
 * @returns {AuthUser} The authenticated user
 * @throws {Error} If not authenticated or missing the required role
 * 
 * @example
 * ```typescript
 * import { requireRole } from '@/lib/api/auth-context';
 * 
 * function adminOnlyAction() {
 *   const user = requireRole('admin'); // Throws if not admin
 *   
 *   // Safe to perform admin action
 *   console.log('Admin action by:', user.name);
 * }
 * ```
 */
export function requireRole(role: AuthUser['role']): AuthUser {
  const user = requireAuth();
  if (!hasRole(role)) {
    throw new Error(`Role '${role}' required`);
  }
  return user;
}

// ============================================================================
// Auth Actions
// ============================================================================

/**
 * Log in a user with email and password.
 * 
 * Updates the auth state upon successful login.
 * 
 * @async
 * @function login
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<AuthUser>} The authenticated user
 * @throws {Error} If login fails (invalid credentials, network error, etc.)
 * 
 * @example
 * ```typescript
 * import { login } from '@/lib/api/auth-context';
 * 
 * async function handleLogin(email: string, password: string) {
 *   try {
 *     const user = await login(email, password);
 *     console.log('Logged in as:', user.name);
 *     navigate('/dashboard');
 *   } catch (error) {
 *     console.error('Login failed:', error.message);
 *     showErrorMessage(error.message);
 *   }
 * }
 * ```
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const backend = getBackendProvider();
  const { user, token } = await backend.auth.login({ email, password });

  const session = await backend.auth.getSession();
  updateState({
    user,
    session,
    isAuthenticated: true,
    isLoading: false,
  });

  return user;
}

/**
 * Register a new user account.
 * 
 * Creates a new account and logs the user in automatically.
 * 
 * @async
 * @function register
 * @param {string} email - User's email address
 * @param {string} password - User's chosen password
 * @param {string} name - User's display name
 * @returns {Promise<AuthUser>} The newly registered user
 * @throws {Error} If registration fails (email taken, weak password, etc.)
 * 
 * @example
 * ```typescript
 * import { register } from '@/lib/api/auth-context';
 * 
 * async function handleRegistration(formData: RegistrationForm) {
 *   try {
 *     const user = await register(
 *       formData.email,
 *       formData.password,
 *       formData.name
 *     );
 *     console.log('Welcome,', user.name);
 *     navigate('/onboarding');
 *   } catch (error) {
 *     if (error.message.includes('email')) {
 *       showError('Email already in use');
 *     } else {
 *       showError('Registration failed');
 *     }
 *   }
 * }
 * ```
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthUser> {
  const backend = getBackendProvider();
  const { user, token } = await backend.auth.register({ email, password, name });

  const session = await backend.auth.getSession();
  updateState({
    user,
    session,
    isAuthenticated: true,
    isLoading: false,
  });

  return user;
}

/**
 * Log out the current user.
 * 
 * Clears the session and resets auth state to unauthenticated.
 * 
 * @async
 * @function logout
 * @returns {Promise<void>}
 * @throws {Error} If logout fails (network error)
 * 
 * @example
 * ```typescript
 * import { logout } from '@/lib/api/auth-context';
 * 
 * async function handleLogout() {
 *   try {
 *     await logout();
 *     console.log('Logged out successfully');
 *     navigate('/login');
 *   } catch (error) {
 *     console.error('Logout failed:', error);
 *     // Force local logout even if server call failed
 *     navigate('/login');
 *   }
 * }
 * ```
 */
export async function logout(): Promise<void> {
  const backend = getBackendProvider();
  await backend.auth.logout();

  updateState({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

/**
 * Update the current user's profile.
 * 
 * Only provided fields will be updated.
 * 
 * @async
 * @function updateProfile
 * @param {Partial<AuthUser>} updates - Profile fields to update
 * @returns {Promise<AuthUser>} The updated user
 * @throws {Error} If update fails or user is not authenticated
 * 
 * @example
 * ```typescript
 * import { updateProfile } from '@/lib/api/auth-context';
 * 
 * async function handleProfileUpdate(newName: string, newAvatar?: string) {
 *   try {
 *     const updatedUser = await updateProfile({
 *       name: newName,
 *       avatar: newAvatar,
 *     });
 *     console.log('Profile updated:', updatedUser);
 *     showSuccess('Profile saved!');
 *   } catch (error) {
 *     showError('Failed to update profile');
 *   }
 * }
 * ```
 */
export async function updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
  const backend = getBackendProvider();
  const user = await backend.auth.updateProfile(updates);

  updateState({ user });
  return user;
}

// ============================================================================
// Provider Auth State Sync
// ============================================================================

/** Unsubscribe function for auth state sync */
let unsubscribe: (() => void) | null = null;

/**
 * Start listening to backend auth state changes.
 * 
 * This sets up real-time sync with the auth provider, so the application
 * state updates when the session changes (e.g., token refresh, logout
 * from another tab).
 * 
 * @function startAuthSync
 * @returns {void}
 * 
 * @example
 * ```typescript
 * import { startAuthSync, stopAuthSync } from '@/lib/api/auth-context';
 * 
 * // Start syncing when app loads
 * startAuthSync();
 * 
 * // Stop syncing when app unmounts (e.g., in cleanup)
 * window.addEventListener('beforeunload', stopAuthSync);
 * ```
 */
export function startAuthSync(): void {
  if (unsubscribe) return;

  const backend = getBackendProvider();
  unsubscribe = backend.auth.onAuthStateChange((session) => {
    if (session) {
      updateState({
        user: session.user,
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  });
}

/**
 * Stop listening to backend auth state changes.
 * 
 * Call this when cleaning up or when you no longer need real-time sync.
 * 
 * @function stopAuthSync
 * @returns {void}
 * 
 * @example
 * ```typescript
 * import { stopAuthSync } from '@/lib/api/auth-context';
 * 
 * // In component cleanup
 * useEffect(() => {
 *   return () => {
 *     stopAuthSync();
 *   };
 * }, []);
 * ```
 */
export function stopAuthSync(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
