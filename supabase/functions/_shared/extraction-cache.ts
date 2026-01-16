// ============= Extraction Cache =============
// Smart caching layer for text extraction
// Avoids redundant OCR/extraction for identical files

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============= Types =============

export interface CachedExtraction {
  fileHash: string;
  extractedText: string;
  extractionMethod: string;
  textLength: number;
  mimeType: string;
  useCount: number;
  createdAt: string;
  lastUsedAt: string;
}

export interface CacheLookupResult {
  found: boolean;
  data?: CachedExtraction;
}

// ============= Hash Calculation =============

export async function calculateFileHash(content: ArrayBuffer | Uint8Array): Promise<string> {
  // Ensure we have an ArrayBuffer for crypto.subtle.digest
  let buffer: ArrayBuffer;
  if (content instanceof ArrayBuffer) {
    buffer = content;
  } else {
    // Create a new ArrayBuffer from Uint8Array
    buffer = new Uint8Array(content).buffer as ArrayBuffer;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function calculateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return calculateFileHash(data);
}

// ============= Cache Operations =============

export async function lookupCache(
  supabase: AnySupabaseClient,
  fileHash: string
): Promise<CacheLookupResult> {
  try {
    const { data, error } = await supabase
      .from('extraction_cache')
      .select('*')
      .eq('file_hash', fileHash)
      .single();

    if (error || !data) {
      return { found: false };
    }

    // Update last_used_at and use_count
    await supabase
      .from('extraction_cache')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: (data.use_count || 1) + 1,
      })
      .eq('file_hash', fileHash);

    return {
      found: true,
      data: {
        fileHash: data.file_hash,
        extractedText: data.extracted_text,
        extractionMethod: data.extraction_method,
        textLength: data.text_length,
        mimeType: data.mime_type,
        useCount: data.use_count,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at,
      },
    };
  } catch (err) {
    console.warn(`[ExtractionCache] Lookup error:`, err);
    return { found: false };
  }
}

export async function storeInCache(
  supabase: AnySupabaseClient,
  fileHash: string,
  extractedText: string,
  extractionMethod: string,
  mimeType: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('extraction_cache')
      .upsert({
        file_hash: fileHash,
        extracted_text: extractedText,
        extraction_method: extractionMethod,
        text_length: extractedText.length,
        mime_type: mimeType,
        last_used_at: new Date().toISOString(),
        use_count: 1,
      }, {
        onConflict: 'file_hash',
      });

    if (error) {
      console.warn(`[ExtractionCache] Store error: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[ExtractionCache] Store exception:`, err);
    return false;
  }
}

// ============= Cache Cleanup =============

export async function cleanupOldCache(
  supabase: AnySupabaseClient,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  try {
    const { data, error } = await supabase
      .from('extraction_cache')
      .delete()
      .lt('last_used_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.warn(`[ExtractionCache] Cleanup error: ${error.message}`);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.warn(`[ExtractionCache] Cleanup exception:`, err);
    return 0;
  }
}

export async function getCacheStats(
  supabase: AnySupabaseClient
): Promise<{
  totalEntries: number;
  totalTextBytes: number;
  avgUseCount: number;
  hitRate: number;
}> {
  try {
    const { data, error } = await supabase
      .from('extraction_cache')
      .select('text_length, use_count');

    if (error || !data) {
      return {
        totalEntries: 0,
        totalTextBytes: 0,
        avgUseCount: 0,
        hitRate: 0,
      };
    }

    const totalEntries = data.length;
    const totalTextBytes = data.reduce((sum, row) => sum + (row.text_length || 0), 0);
    const totalUseCount = data.reduce((sum, row) => sum + (row.use_count || 1), 0);
    const avgUseCount = totalEntries > 0 ? totalUseCount / totalEntries : 0;
    
    // Hit rate: (total uses - first uses) / total uses
    const hitRate = totalUseCount > totalEntries 
      ? (totalUseCount - totalEntries) / totalUseCount 
      : 0;

    return {
      totalEntries,
      totalTextBytes,
      avgUseCount,
      hitRate,
    };
  } catch (err) {
    console.warn(`[ExtractionCache] Stats error:`, err);
    return {
      totalEntries: 0,
      totalTextBytes: 0,
      avgUseCount: 0,
      hitRate: 0,
    };
  }
}
