// ============= Type-Safe Supabase Helpers for Edge Functions =============
// These helpers provide type-safe wrappers for Supabase operations in Deno
// where the full database schema types are not available.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Generic client type that works in Edge Functions
// deno-lint-ignore no-explicit-any
export type EdgeSupabaseClient = ReturnType<typeof createClient<any>>;

/**
 * Type-safe RPC call wrapper
 * Allows calling Supabase RPC functions with proper typing in Edge Functions
 */
export async function rpcCall<T>(
  supabase: EdgeSupabaseClient,
  functionName: string,
  params: Record<string, unknown>
): Promise<{ data: T | null; error: unknown }> {
  // deno-lint-ignore no-explicit-any
  return (supabase as any).rpc(functionName, params);
}

/**
 * Type-safe table accessor wrapper
 * Returns a query builder for the specified table
 */
// deno-lint-ignore no-explicit-any
export function fromTable(supabase: EdgeSupabaseClient, table: string): any {
  // deno-lint-ignore no-explicit-any
  return (supabase as any).from(table);
}

/**
 * Type-safe insert wrapper
 */
export async function insertRecord<T>(
  supabase: EdgeSupabaseClient,
  table: string,
  data: Record<string, unknown>
): Promise<{ data: T | null; error: unknown }> {
  return fromTable(supabase, table).insert(data);
}

/**
 * Type-safe update wrapper
 */
export async function updateRecord<T>(
  supabase: EdgeSupabaseClient,
  table: string,
  data: Record<string, unknown>,
  matchColumn: string,
  matchValue: string
): Promise<{ data: T | null; error: unknown }> {
  return fromTable(supabase, table).update(data).eq(matchColumn, matchValue);
}

/**
 * Type-safe select wrapper with single result
 */
export async function selectSingle<T>(
  supabase: EdgeSupabaseClient,
  table: string,
  columns: string,
  filters: Record<string, unknown>
): Promise<{ data: T | null; error: unknown }> {
  let query = fromTable(supabase, table).select(columns);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  return query.single();
}

/**
 * Type-safe select wrapper with multiple results
 */
export async function selectMany<T>(
  supabase: EdgeSupabaseClient,
  table: string,
  columns: string,
  filters?: Record<string, unknown>
): Promise<{ data: T[] | null; error: unknown }> {
  let query = fromTable(supabase, table).select(columns);
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  }
  return query;
}
