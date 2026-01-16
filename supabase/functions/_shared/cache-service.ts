// ============= Cache Service =============
// PostgreSQL-based caching layer for expensive operations
// Caches: embeddings, summaries, extraction results, language detection
// Target cache hit rate: >80%

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export type CacheType = 'embedding' | 'summary' | 'extraction' | 'language' | 'chunk_hash';

export interface CacheEntry {
  id: string;
  cache_key: string;
  cache_type: CacheType;
  document_id: string | null;
  content_hash: string;
  value_ref: string;
  ttl_seconds: number;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  byType: Record<CacheType, { entries: number; hits: number }>;
}

export interface CacheConfig {
  defaultTTL?: number; // Default TTL in seconds (24 hours)
  maxEntries?: number; // Max entries before cleanup triggers
}

// ============= Hash Functions =============

function simpleHash(str: string): string {
  const normalized = str.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function buildCacheKey(type: CacheType, ...parts: string[]): string {
  const combined = parts.join(':');
  const hash = simpleHash(combined);
  return `${type}:${hash}`;
}

// ============= Cache Service Class =============

export class CacheService {
  private supabase: SupabaseClient;
  private config: Required<CacheConfig>;
  private stats = { hits: 0, misses: 0 };

  constructor(supabase: SupabaseClient, config: CacheConfig = {}) {
    this.supabase = supabase;
    this.config = {
      defaultTTL: config.defaultTTL ?? 86400, // 24 hours
      maxEntries: config.maxEntries ?? 10000,
    };
  }

  // ============= Core Operations =============

  async get<T>(type: CacheType, key: string): Promise<T | null> {
    const cacheKey = buildCacheKey(type, key);

    const { data, error } = await this.supabase
      .from('cache_entries')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      this.stats.misses++;
      return null;
    }

    // Update hit count asynchronously
    this.updateHitCount(data.id);

    this.stats.hits++;
    
    try {
      return JSON.parse(data.value_ref) as T;
    } catch {
      return data.value_ref as unknown as T;
    }
  }

  async set<T>(
    type: CacheType,
    key: string,
    value: T,
    options: { documentId?: string; ttl?: number; contentHash?: string } = {}
  ): Promise<boolean> {
    const cacheKey = buildCacheKey(type, key);
    const ttl = options.ttl ?? this.config.defaultTTL;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const contentHash = options.contentHash ?? simpleHash(JSON.stringify(value));
    const valueRef = typeof value === 'string' ? value : JSON.stringify(value);

    const { error } = await this.supabase
      .from('cache_entries')
      .upsert({
        cache_key: cacheKey,
        cache_type: type,
        document_id: options.documentId || null,
        content_hash: contentHash,
        value_ref: valueRef,
        ttl_seconds: ttl,
        hit_count: 0,
        expires_at: expiresAt,
      }, {
        onConflict: 'cache_key',
      });

    if (error) {
      console.error(`[cache] Failed to set ${cacheKey}: ${error.message}`);
      return false;
    }

    return true;
  }

  async delete(type: CacheType, key: string): Promise<boolean> {
    const cacheKey = buildCacheKey(type, key);

    const { error } = await this.supabase
      .from('cache_entries')
      .delete()
      .eq('cache_key', cacheKey);

    return !error;
  }

  async invalidateByDocument(documentId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('cache_entries')
      .delete()
      .eq('document_id', documentId)
      .select('id');

    return data?.length || 0;
  }

  async invalidateByType(type: CacheType): Promise<number> {
    const { data, error } = await this.supabase
      .from('cache_entries')
      .delete()
      .eq('cache_type', type)
      .select('id');

    return data?.length || 0;
  }

  // ============= Specialized Cache Methods =============

  async getEmbedding(text: string): Promise<number[] | null> {
    return this.get<number[]>('embedding', text);
  }

  async setEmbedding(text: string, embedding: number[], documentId?: string): Promise<boolean> {
    // Use longer TTL for embeddings (7 days)
    return this.set('embedding', text, embedding, {
      documentId,
      ttl: 604800,
      contentHash: simpleHash(text),
    });
  }

  async getSummary(documentId: string, textHash: string): Promise<string | null> {
    return this.get<string>('summary', `${documentId}:${textHash}`);
  }

  async setSummary(documentId: string, textHash: string, summary: string): Promise<boolean> {
    return this.set('summary', `${documentId}:${textHash}`, summary, {
      documentId,
      ttl: 604800, // 7 days
    });
  }

  async getExtraction(storagePath: string): Promise<string | null> {
    return this.get<string>('extraction', storagePath);
  }

  async setExtraction(storagePath: string, text: string, documentId?: string): Promise<boolean> {
    return this.set('extraction', storagePath, text, {
      documentId,
      ttl: 2592000, // 30 days - extractions are very stable
    });
  }

  async getLanguage(textHash: string): Promise<{ language: string; confidence: number } | null> {
    return this.get<{ language: string; confidence: number }>('language', textHash);
  }

  async setLanguage(textHash: string, language: string, confidence: number): Promise<boolean> {
    return this.set('language', textHash, { language, confidence }, {
      ttl: 2592000, // 30 days
    });
  }

  // ============= Maintenance =============

  async cleanupExpired(): Promise<number> {
    const { data, error } = await this.supabase
      .from('cache_entries')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[cache] Cleaned up ${count} expired entries`);
    }
    return count;
  }

  async getStats(): Promise<CacheStats> {
    const { data: entries } = await this.supabase
      .from('cache_entries')
      .select('cache_type, hit_count');

    const byType: Record<CacheType, { entries: number; hits: number }> = {
      embedding: { entries: 0, hits: 0 },
      summary: { entries: 0, hits: 0 },
      extraction: { entries: 0, hits: 0 },
      language: { entries: 0, hits: 0 },
      chunk_hash: { entries: 0, hits: 0 },
    };

    let totalHits = 0;
    for (const entry of entries || []) {
      const type = entry.cache_type as CacheType;
      if (byType[type]) {
        byType[type].entries++;
        byType[type].hits += entry.hit_count || 0;
        totalHits += entry.hit_count || 0;
      }
    }

    const totalEntries = entries?.length || 0;
    const sessionHits = this.stats.hits;
    const sessionMisses = this.stats.misses;
    const totalRequests = sessionHits + sessionMisses;

    return {
      totalEntries,
      hitCount: sessionHits,
      missCount: sessionMisses,
      hitRate: totalRequests > 0 ? sessionHits / totalRequests : 0,
      byType,
    };
  }

  async warmupCache(documentIds: string[]): Promise<void> {
    // Pre-fetch common cached items for given documents
    console.log(`[cache] Warming up cache for ${documentIds.length} documents`);
    
    const { data } = await this.supabase
      .from('cache_entries')
      .select('cache_key')
      .in('document_id', documentIds)
      .gt('expires_at', new Date().toISOString());

    console.log(`[cache] Found ${data?.length || 0} cached entries`);
  }

  // ============= Private Helpers =============

  private updateHitCount(id: string): void {
    // Fire and forget - don't await
    this.supabase
      .from('cache_entries')
      .update({
        hit_count: 1, // Will be incremented via SQL
        last_hit_at: new Date().toISOString(),
      })
      .eq('id', id)
      .then(() => {});
  }
}

// ============= Factory Function =============

export function createCacheService(supabase: SupabaseClient, config?: CacheConfig): CacheService {
  return new CacheService(supabase, config);
}

// ============= Helper for content hashing =============

export function hashContent(content: string): string {
  return simpleHash(content);
}
