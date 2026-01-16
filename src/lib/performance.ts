/**
 * Performance Monitoring Utilities
 * 
 * Provides utilities for tracking:
 * - Page load performance
 * - API call performance
 * - Core Web Vitals
 * - Custom operations
 * 
 * @module performance
 */

import { trackPerformance as monitoringTrackPerformance } from './monitoring';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
}

export interface WebVitals {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
}

interface PerformanceBuffer {
  entries: PerformanceEntry[];
  webVitals: WebVitals;
}

// ============================================================================
// PERFORMANCE BUFFER
// ============================================================================

const performanceBuffer: PerformanceBuffer = {
  entries: [],
  webVitals: {},
};

// ============================================================================
// CORE WEB VITALS TRACKING
// ============================================================================

/**
 * Initialize Core Web Vitals tracking
 * Automatically tracks LCP, FID, CLS, FCP, TTFB, and INP
 */
export function initializeWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    // Track paint metrics (FCP)
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          performanceBuffer.webVitals.FCP = entry.startTime;
          reportWebVital('FCP', entry.startTime);
        }
      }
    });
    paintObserver.observe({ entryTypes: ['paint'] });

    // Track LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        performanceBuffer.webVitals.LCP = lastEntry.startTime;
        reportWebVital('LCP', lastEntry.startTime);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value?: number }).value || 0;
        }
      }
      performanceBuffer.webVitals.CLS = clsValue;
      reportWebVital('CLS', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Track FID
    const fidObserver = new PerformanceObserver((list) => {
      const firstEntry = list.getEntries()[0];
      if (firstEntry) {
        const processingStart = (firstEntry as PerformanceEntry & { processingStart?: number }).processingStart || 0;
        const fid = processingStart - firstEntry.startTime;
        performanceBuffer.webVitals.FID = fid;
        reportWebVital('FID', fid);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Track TTFB
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceEntry & { responseStart?: number };
      if (navEntry.responseStart) {
        performanceBuffer.webVitals.TTFB = navEntry.responseStart;
        reportWebVital('TTFB', navEntry.responseStart);
      }
    }
  } catch (error) {
    console.warn('[Performance] Failed to initialize Web Vitals tracking:', error);
  }
}

/**
 * Report a Web Vital to analytics
 */
function reportWebVital(name: string, value: number): void {
  if (import.meta.env.PROD) {
    // Report to analytics
    if (window.gtag) {
      window.gtag('event', name, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        event_category: 'Web Vitals',
        non_interaction: true,
      });
    }

    // Log for debugging
    console.debug(`[Web Vitals] ${name}: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`);
  }
}

// ============================================================================
// PAGE LOAD TRACKING
// ============================================================================

/**
 * Track page load performance
 * @param pageName - Name of the page being loaded
 */
export function trackPageLoad(pageName: string): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    
    performanceBuffer.entries.push({
      name: `Page Load: ${pageName}`,
      duration,
      startTime,
      entryType: 'page-load',
    });

    if (import.meta.env.PROD) {
      console.debug(`[Performance] Page Load: ${pageName} - ${duration.toFixed(2)}ms`);
      
      // Report to analytics
      if (window.gtag) {
        window.gtag('event', 'page_load', {
          page_name: pageName,
          duration: Math.round(duration),
        });
      }
    }
  };
}

// ============================================================================
// API CALL TRACKING
// ============================================================================

/**
 * Track API call performance
 * @param name - Name/identifier for the API call
 * @param fn - The async function to track
 * @returns The result of the function
 */
export async function trackAPICall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return monitoringTrackPerformance(
    `API: ${name}`,
    fn,
    { category: 'api' }
  );
}

/**
 * Track database query performance
 * @param queryName - Name/identifier for the query
 * @param fn - The async function to track
 * @returns The result of the function
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  return monitoringTrackPerformance(
    `DB: ${queryName}`,
    fn,
    { category: 'database' }
  );
}

/**
 * Track AI operation performance
 * @param operationName - Name/identifier for the AI operation
 * @param fn - The async function to track
 * @returns The result of the function
 */
export async function trackAIOperation<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  return monitoringTrackPerformance(
    `AI: ${operationName}`,
    fn,
    { category: 'ai' }
  );
}

// ============================================================================
// CUSTOM OPERATION TRACKING
// ============================================================================

/**
 * Track a custom operation
 * @param name - Name of the operation
 * @param category - Category for grouping
 * @param fn - The async function to track
 * @returns The result of the function
 */
export async function trackOperation<T>(
  name: string,
  category: string,
  fn: () => Promise<T>
): Promise<T> {
  return monitoringTrackPerformance(name, fn, { category });
}

/**
 * Create a performance marker
 * @param markerName - Name of the marker
 */
export function mark(markerName: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(markerName);
  }
}

/**
 * Measure between two markers
 * @param measureName - Name of the measurement
 * @param startMark - Start marker name
 * @param endMark - End marker name (optional, uses current time if not provided)
 */
export function measure(
  measureName: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    if (endMark) {
      performance.measure(measureName, startMark, endMark);
    } else {
      performance.mark(`${measureName}-end`);
      performance.measure(measureName, startMark, `${measureName}-end`);
    }

    const entries = performance.getEntriesByName(measureName);
    const lastEntry = entries[entries.length - 1];
    return lastEntry ? lastEntry.duration : null;
  } catch {
    return null;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get all collected Web Vitals
 * @returns Current Web Vitals values
 */
export function getWebVitals(): WebVitals {
  return { ...performanceBuffer.webVitals };
}

/**
 * Get performance entries
 * @param category - Optional category filter
 * @returns Performance entries
 */
export function getPerformanceEntries(category?: string): PerformanceEntry[] {
  if (category) {
    return performanceBuffer.entries.filter(e => e.entryType === category);
  }
  return [...performanceBuffer.entries];
}

/**
 * Clear performance buffer
 */
export function clearPerformanceBuffer(): void {
  performanceBuffer.entries = [];
}

// ============================================================================
// PERFORMANCE BUDGET MONITORING
// ============================================================================

export interface PerformanceBudget {
  LCP?: number;  // ms
  FID?: number;  // ms
  CLS?: number;  // score
  FCP?: number;  // ms
  TTFB?: number; // ms
}

const defaultBudget: PerformanceBudget = {
  LCP: 2500,   // Good LCP
  FID: 100,    // Good FID
  CLS: 0.1,    // Good CLS
  FCP: 1800,   // Good FCP
  TTFB: 600,   // Good TTFB
};

/**
 * Check if Web Vitals are within budget
 * @param budget - Performance budget to check against
 * @returns Object with pass/fail for each metric
 */
export function checkPerformanceBudget(
  budget: PerformanceBudget = defaultBudget
): Record<string, { value: number | undefined; budget: number | undefined; passes: boolean }> {
  const vitals = getWebVitals();
  const results: Record<string, { value: number | undefined; budget: number | undefined; passes: boolean }> = {};

  for (const [key, budgetValue] of Object.entries(budget)) {
    const vitalKey = key as keyof WebVitals;
    const actualValue = vitals[vitalKey];
    results[key] = {
      value: actualValue,
      budget: budgetValue,
      passes: actualValue === undefined || (budgetValue !== undefined && actualValue <= budgetValue),
    };
  }

  return results;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-initialize Web Vitals tracking in browser
if (typeof window !== 'undefined') {
  // Wait for page to be interactive before initializing
  if (document.readyState === 'complete') {
    initializeWebVitals();
  } else {
    window.addEventListener('load', initializeWebVitals);
  }
}

// Export global window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
