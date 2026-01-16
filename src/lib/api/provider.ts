/**
 * Backend Provider Factory
 *
 * FINAL: Supabase-only provider.
 *
 * NOTE: The exported API surface is kept stable (getBackendProvider/configureBackend/etc.)
 * to avoid downstream breakage, but configuration is intentionally forced to Supabase.
 */

import type { IBackendProvider } from "./contracts";
import { supabaseBackend } from "./adapters/supabase-adapter";

// ============================================================================
// Provider Configuration (locked)
// ============================================================================

export type BackendType = "supabase";

interface ProviderConfig {
  type: BackendType;
}

const defaultConfig: ProviderConfig = {
  type: "supabase",
};

// ============================================================================
// Provider Factory
// ============================================================================

let currentProvider: IBackendProvider = supabaseBackend;
let currentConfig: ProviderConfig = defaultConfig;

function initializeProvider(): void {
  currentProvider = supabaseBackend;
  currentConfig = { ...currentConfig, type: "supabase" };
}

// Initialize on module load
initializeProvider();

export function getBackendProvider(): IBackendProvider {
  return currentProvider;
}


export function configureBackend(_config: Partial<ProviderConfig>): void {
  // Intentionally no-op (forced supabase)
  initializeProvider();
}

export function getBackendConfig(): ProviderConfig {
  return { ...currentConfig };
}

// Convenience export
export const backend = getBackendProvider();

export * from "./contracts";

