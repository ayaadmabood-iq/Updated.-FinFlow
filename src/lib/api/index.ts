/**
 * API Module
 * 
 * Central export point for all API-related abstractions.
 * This module provides the interface layer for backend communication.
 * 
 * Usage:
 * ```typescript
 * import { backend, getBackendProvider } from '@/lib/api';
 * 
 * // Use the provider
 * const user = await backend.auth.getUser();
 * const docs = await backend.database.query('documents');
 * ```
 * 
 * For auth operations:
 * ```typescript
 * import { getCurrentUser, requireAuth, isAdmin } from '@/lib/api';
 * 
 * const user = getCurrentUser();
 * if (isAdmin()) { ... }
 * ```
 */

// Export all contracts (interfaces)
export * from './contracts';

// Export provider factory and utilities
export {
  backend,
  getBackendProvider,
  configureBackend,
  getBackendConfig,
  type BackendType,
} from './provider';

// Export adapters for advanced usage
export { supabaseBackend } from './adapters/supabase-adapter';
export {
  createEdgeFunctionAIAdapter,
  createOpenAIAdapter,
} from './adapters/ai-adapter';

// Export centralized auth context
export {
  initializeAuth,
  subscribeToAuth,
  getAuthState,
  getCurrentUser,
  getAccessToken,
  hasRole,
  isAdmin,
  requireAuth,
  requireRole,
  login,
  register,
  logout,
  updateProfile,
  startAuthSync,
  stopAuthSync,
  type AuthState,
} from './auth-context';
