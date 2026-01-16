// ============= Search Cache Service =============
// Caching layer specifically for search results
// Implements short TTL for freshness with high hit rates

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============= Types =============

export interface SearchCacheEntry {
  key: string;
  results: SearchResult[];
  embedding?: number[];
  metadata: SearchMetadata;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
}

export interface SearchResult {
  id: string;
  type: 'document' | 'chunk';
  score: number;
  content?: string;
  snippet?: string;
  documentId?: string;
  documentName?: string;
}

export interface SearchMetadata {
  query: string;
  projectId: string;
  mode: 'hybrid' | 'semantic' | 'fulltext';
  filters?: Record<string, unknown>;
  totalResults: number;
  searchDurationMs: number;
}

export interface EmbeddingCacheEntry {
  text: string;
  textHash: string;
  embedding: number[];
  model: string;
  modelVersion: string;
  createdAt: string;
  expiresAt: string;
}

// ============= Cache Configuration =============

const CACHE_CONFIG = {
  // Search results - short TTL for freshness
  searchResultsTTL: 300, // 5 minutes
  
  // Embeddings - long TTL since text->embedding is deterministic
  embeddingsTTL: 2592000, // 30 days
  
  // Document chunks - medium TTL
  chunksTTL: 86400, // 24 hours
  
  // Max entries before cleanup
  maxSearchEntries: 1000,
  maxEmbeddingEntries: 50000,
};

// ============= Hash Function =============

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function buildSearchKey(query: string, projectId: string, mode: string, filters?: Record<string, unknown>): string {
  const normalized = query.toLowerCase().trim();
  const filterHash = filters ? hashString(JSON.stringify(filters)) : 'none';
  return `search:${projectId}:${mode}:${hashString(normalized)}:${filterHash}`;
}

function buildEmbeddingKey(text: string): string {
  const normalized = text.toLowerCase().trim().substring(0, 1000);
  return `emb:${hashString(normalized)}`;
}

// ============= Search Cache Service =============

export class SearchCacheService {
  private supabase: SupabaseClient;
  private memoryCache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  // ============= Search Results Cache =============
  
  async getSearchResults(
    query: string,
    projectId: string,
    mode: 'hybrid' | 'semantic' | 'fulltext',
    filters?: Record<string, unknown>
  ): Promise<SearchResult[] | null> {
    const key = buildSearchKey(query, projectId, mode, filters);
    
    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.data as SearchResult[];
    }
    
    // Check database cache
    const { data } = await this.supabase
      .from('cache_entries')
      .select('value_ref, hit_count')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!data) return null;
    
    // Update hit count async
    this.updateHitCount(key);
    
    try {
      const results = JSON.parse(data.value_ref) as SearchResult[];
      
      // Store in memory cache
      this.memoryCache.set(key, {
        data: results,
        expiresAt: Date.now() + 60000, // 1 minute memory cache
      });
      
      return results;
    } catch {
      return null;
    }
  }
  
  async setSearchResults(
    query: string,
    projectId: string,
    mode: 'hybrid' | 'semantic' | 'fulltext',
    results: SearchResult[],
    metadata: Omit<SearchMetadata, 'query' | 'projectId' | 'mode'>,
    filters?: Record<string, unknown>
  ): Promise<boolean> {
    const key = buildSearchKey(query, projectId, mode, filters);
    const expiresAt = new Date(Date.now() + CACHE_CONFIG.searchResultsTTL * 1000).toISOString();
    
    const { error } = await this.supabase
      .from('cache_entries')
      .upsert({
        cache_key: key,
        cache_type: 'search_result',
        content_hash: hashString(query),
        value_ref: JSON.stringify(results),
        ttl_seconds: CACHE_CONFIG.searchResultsTTL,
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
    
    if (error) {
      console.error('[search-cache] Failed to cache results:', error);
      return false;
    }
    
    // Store in memory cache
    this.memoryCache.set(key, {
      data: results,
      expiresAt: Date.now() + 60000,
    });
    
    return true;
  }
  
  // ============= Embedding Cache =============
  
  async getEmbedding(text: string): Promise<number[] | null> {
    const key = buildEmbeddingKey(text);
    
    // Check memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.data as number[];
    }
    
    // Check database
    const { data } = await this.supabase
      .from('cache_entries')
      .select('value_ref')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!data) return null;
    
    try {
      const embedding = JSON.parse(data.value_ref) as number[];
      
      // Memory cache embeddings for longer
      this.memoryCache.set(key, {
        data: embedding,
        expiresAt: Date.now() + 300000, // 5 minutes
      });
      
      return embedding;
    } catch {
      return null;
    }
  }
  
  async setEmbedding(text: string, embedding: number[], model = 'text-embedding-3-small'): Promise<boolean> {
    const key = buildEmbeddingKey(text);
    const expiresAt = new Date(Date.now() + CACHE_CONFIG.embeddingsTTL * 1000).toISOString();
    
    const { error } = await this.supabase
      .from('cache_entries')
      .upsert({
        cache_key: key,
        cache_type: 'embedding',
        content_hash: hashString(text),
        value_ref: JSON.stringify(embedding),
        ttl_seconds: CACHE_CONFIG.embeddingsTTL,
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
    
    if (error) {
      console.error('[search-cache] Failed to cache embedding:', error);
      return false;
    }
    
    // Memory cache
    this.memoryCache.set(key, {
      data: embedding,
      expiresAt: Date.now() + 300000,
    });
    
    return true;
  }
  
  // ============= Batch Embedding Cache =============
  
  async getEmbeddingsBatch(texts: string[]): Promise<Map<string, number[] | null>> {
    const results = new Map<string, number[] | null>();
    const uncached: string[] = [];
    
    // Check memory cache first
    for (const text of texts) {
      const key = buildEmbeddingKey(text);
      const memCached = this.memoryCache.get(key);
      if (memCached && memCached.expiresAt > Date.now()) {
        results.set(text, memCached.data as number[]);
      } else {
        uncached.push(text);
      }
    }
    
    if (uncached.length === 0) {
      return results;
    }
    
    // Query database for uncached
    const keys = uncached.map(buildEmbeddingKey);
    const { data } = await this.supabase
      .from('cache_entries')
      .select('cache_key, value_ref')
      .in('cache_key', keys)
      .gt('expires_at', new Date().toISOString());
    
    const dbResults = new Map<string, number[]>();
    for (const entry of data || []) {
      try {
        dbResults.set(entry.cache_key, JSON.parse(entry.value_ref));
      } catch {}
    }
    
    // Map results back to original texts
    for (const text of uncached) {
      const key = buildEmbeddingKey(text);
      const embedding = dbResults.get(key) || null;
      results.set(text, embedding);
      
      if (embedding) {
        this.memoryCache.set(key, {
          data: embedding,
          expiresAt: Date.now() + 300000,
        });
      }
    }
    
    return results;
  }
  
  // ============= Cache Maintenance =============
  
  async invalidateProjectCache(projectId: string): Promise<number> {
    const { data } = await this.supabase
      .from('cache_entries')
      .delete()
      .ilike('cache_key', `search:${projectId}:%`)
      .select('id');
    
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(projectId)) {
        this.memoryCache.delete(key);
      }
    }
    
    return data?.length || 0;
  }
  
  async cleanupExpired(): Promise<number> {
    const { data } = await this.supabase
      .from('cache_entries')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    return data?.length || 0;
  }
  
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }
  
  getMemoryCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()).slice(0, 100),
    };
  }
  
  // ============= Private Helpers =============
  
  private updateHitCount(key: string): void {
    this.supabase
      .from('cache_entries')
      .update({
        hit_count: 1, // Placeholder, actual increment in SQL
        last_hit_at: new Date().toISOString(),
      })
      .eq('cache_key', key)
      .then(() => {});
  }
}

// ============= Factory Function =============

export function createSearchCacheService(supabase: SupabaseClient): SearchCacheService {
  return new SearchCacheService(supabase);
}

// ============= Cached Embedding Generator =============

export async function getCachedEmbedding(
  supabase: SupabaseClient,
  text: string,
  generateFn: (text: string) => Promise<number[] | null>
): Promise<number[] | null> {
  const cache = createSearchCacheService(supabase);
  
  // Try cache first
  const cached = await cache.getEmbedding(text);
  if (cached) {
    return cached;
  }
  
  // Generate new embedding
  const embedding = await generateFn(text);
  
  // Cache if successful
  if (embedding) {
    await cache.setEmbedding(text, embedding);
  }
  
  return embedding;
}
