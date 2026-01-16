/**
 * Type Guards and Runtime Validators for FineFlow
 * 
 * This module provides type-safe runtime validation functions that help
 * eliminate `any` types and ensure data integrity throughout the application.
 * 
 * @module type-guards
 */

import type { LucideIcon } from 'lucide-react';

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes all properties of T nullable
 */
export type Nullable<T> = T | null;

/**
 * Makes all properties of T optional (undefined)
 */
export type Optional<T> = T | undefined;

/**
 * Makes all properties of T nullable or undefined
 */
export type Maybe<T> = T | null | undefined;

/**
 * Deep partial - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly - makes all nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Awaited type - extracts the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * String literal helper for exhaustive checks
 */
export type Exhaustive<T extends string> = T;

// ============================================================================
// RECORD TYPES FOR DYNAMIC DATA
// ============================================================================

/**
 * Type-safe record with string keys and unknown values
 * Use instead of Record<string, any>
 */
export type SafeRecord = Record<string, unknown>;

/**
 * Type-safe JSON value
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

/**
 * Type-safe JSON object
 */
export type JsonObject = { [key: string]: JsonValue };

// ============================================================================
// NAV ITEM TYPES
// ============================================================================

/**
 * Navigation item with proper icon typing
 */
export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
}

/**
 * Navigation group with items
 */
export interface NavGroup {
  label: string;
  items: NavItem[];
  collapsed?: boolean;
}

// ============================================================================
// DATABASE ROW TYPES FOR SERVICES
// ============================================================================

/**
 * Base database row with common fields
 */
export interface BaseDbRow {
  id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Knowledge graph node row from database
 */
export interface KnowledgeGraphNodeRow extends BaseDbRow {
  project_id: string;
  entity_type: string;
  name: string;
  normalized_name: string | null;
  description: string | null;
  properties: JsonObject | null;
  mention_count: number;
  confidence_score: number | string;
  source_document_ids: string[] | null;
}

/**
 * Knowledge graph edge row from database
 */
export interface KnowledgeGraphEdgeRow extends BaseDbRow {
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  weight: number | string;
  properties: JsonObject | null;
  evidence_snippets: string[] | null;
  source_document_ids: string[] | null;
  is_ai_discovered: boolean;
  confidence_score: number | string;
}

/**
 * Knowledge graph insight row from database
 */
export interface KnowledgeGraphInsightRow extends BaseDbRow {
  project_id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string | null;
  involved_node_ids: string[] | null;
  involved_edge_ids: string[] | null;
  involved_document_ids: string[] | null;
  confidence_score: number | string;
  is_dismissed: boolean;
  is_confirmed: boolean;
}

/**
 * Report template row from database
 */
export interface ReportTemplateRow extends BaseDbRow {
  name: string;
  description: string | null;
  sections: JsonValue;
  settings: JsonValue;
  is_system: boolean;
  user_id: string | null;
}

/**
 * Time series data point for analytics
 */
export interface TimeSeriesPoint {
  date?: string;
  period?: string;
  value?: number;
  count?: number;
  timestamp?: string;
}

/**
 * Document metadata row
 */
export interface DocumentMetadataRow {
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Extraction job row
 */
export interface ExtractionJobRow extends BaseDbRow {
  project_id: string;
  status: string;
  progress: number;
  error_message: string | null;
  metadata: JsonObject | null;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Integration configuration - type-safe alternative to Record<string, any>
 */
export interface IntegrationConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  webhookSecret?: string;
  [key: string]: unknown;
}

/**
 * Integration event metadata
 */
export interface IntegrationEventMetadata {
  source?: string;
  target?: string;
  action?: string;
  resourceUrl?: string;
  [key: string]: unknown;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Checks if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a valid UUID
 */
export function isUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if a value is a valid email
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid URL
 */
export function isValidURL(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid ISO date string
 */
export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('-');
}

/**
 * Checks if a value is a number (including numeric strings for database)
 */
export function isNumeric(value: unknown): value is number | string {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') return !isNaN(parseFloat(value));
  return false;
}

/**
 * Checks if value is an array of a specific type
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

/**
 * Checks if value is a TimeSeriesPoint
 */
export function isTimeSeriesPoint(value: unknown): value is TimeSeriesPoint {
  if (!isObject(value)) return false;
  return (
    (typeof value.date === 'string' || typeof value.period === 'string' || typeof value.timestamp === 'string') &&
    (typeof value.value === 'number' || typeof value.count === 'number' || value.value === undefined)
  );
}

/**
 * Checks if value has required BaseDbRow fields
 */
export function hasDbRowFields(value: unknown): value is BaseDbRow {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.created_at === 'string'
  );
}

// ============================================================================
// SAFE PARSERS
// ============================================================================

/**
 * Safely parses JSON with type checking
 */
export function safeParseJSON<T>(
  jsonString: string,
  validator?: (value: unknown) => value is T
): T | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (validator && !validator(parsed)) {
      console.error('Parsed JSON does not match expected type');
      return null;
    }
    return parsed as T;
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return null;
  }
}

/**
 * Safely converts a numeric value (handles string | number from database)
 */
export function safeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Safely gets array or returns empty array
 */
export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely gets string or returns default
 */
export function safeString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Safely gets boolean or returns default
 */
export function safeBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

// ============================================================================
// ASSERTION FUNCTIONS
// ============================================================================

/**
 * Asserts that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is not defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new TypeError(message);
  }
}

/**
 * Asserts that a value is a non-empty string
 */
export function assertNonEmptyString(
  value: unknown,
  message = 'Value is not a non-empty string'
): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new TypeError(message);
  }
}

/**
 * Asserts that a value is a valid UUID
 */
export function assertUUID(
  value: unknown,
  message = 'Value is not a valid UUID'
): asserts value is string {
  if (!isUUID(value)) {
    throw new TypeError(message);
  }
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transforms unknown object to typed record with fallbacks
 */
export function toTypedRecord<T extends Record<string, unknown>>(
  value: unknown,
  defaults: T
): T {
  if (!isObject(value)) return defaults;
  return { ...defaults, ...value } as T;
}

/**
 * Picks specific properties from an object in a type-safe way
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omits specific properties from an object in a type-safe way
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

// ============================================================================
// iOS STANDALONE CHECK TYPE
// ============================================================================

/**
 * Extended Navigator interface for iOS standalone property
 */
export interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * Checks if navigator has standalone property (iOS Safari)
 */
export function hasStandaloneProperty(nav: Navigator): nav is NavigatorWithStandalone {
  return 'standalone' in nav;
}
