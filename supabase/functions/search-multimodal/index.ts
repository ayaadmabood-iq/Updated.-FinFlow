/**
 * Multi-Modal Search Edge Function
 *
 * Search across multiple document types: text, images, audio, and video.
 * Supports cross-modal queries (e.g., search images with text, or vice versa).
 *
 * Features:
 * - Cross-modal search (text query → find images/audio/video)
 * - Multi-modal embeddings for unified search space
 * - Filtered search by content type
 * - Ranked results with relevance scoring
 * - Support for natural language queries
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

interface MultiModalSearchRequest {
  query: string;
  contentTypes?: ('text' | 'image' | 'audio' | 'video' | 'pdf')[];
  collectionId?: string;
  limit?: number;
  minScore?: number;
  includeContent?: boolean;
}

interface SearchResult {
  id: string;
  type: string;
  url: string;
  content?: any;
  score: number;
  metadata: Record<string, any>;
  excerpt?: string;
  thumbnail?: string;
}

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const {
      query,
      contentTypes = ['text', 'image', 'audio', 'video', 'pdf'],
      collectionId,
      limit = 20,
      minScore = 0.5,
      includeContent = false,
    }: MultiModalSearchRequest = await req.json();

    // Validation
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'search-multimodal', 30, 60);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Perform search
    const results = await searchMultiModal(
      supabase,
      queryEmbedding,
      contentTypes,
      collectionId,
      limit,
      minScore,
      user.id
    );

    // Enhance results with excerpts
    const enhancedResults = results.map(result => {
      const enhanced: SearchResult = {
        ...result,
        excerpt: generateExcerpt(result, query),
      };

      // Remove full content if not requested
      if (!includeContent) {
        delete enhanced.content;
      }

      return enhanced;
    });

    return new Response(
      JSON.stringify({
        query,
        results: enhancedResults,
        metadata: {
          totalResults: enhancedResults.length,
          contentTypes: Array.from(new Set(enhancedResults.map(r => r.type))),
          avgScore: enhancedResults.reduce((sum, r) => sum + r.score, 0) / enhancedResults.length,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('Error in search-multimodal:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to perform multi-modal search',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});

/**
 * Generate embedding for search query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate query embedding: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Search across multi-modal documents
 */
async function searchMultiModal(
  supabase: any,
  queryEmbedding: number[],
  contentTypes: string[],
  collectionId: string | undefined,
  limit: number,
  minScore: number,
  userId: string
): Promise<SearchResult[]> {
  // Build query
  let query = supabase
    .from('multimodal_documents')
    .select('*');

  // Filter by collection if specified
  if (collectionId) {
    query = query.eq('collection_id', collectionId);
  }

  // Filter by user (only search user's documents)
  query = query.eq('user_id', userId);

  // Filter by content types
  if (contentTypes.length > 0 && !contentTypes.includes('text')) {
    query = query.in('type', contentTypes);
  }

  // Execute query
  const { data: documents, error } = await query;

  if (error) {
    console.error('Search error:', error);
    throw new Error('Failed to search documents');
  }

  if (!documents || documents.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const results: SearchResult[] = documents.map(doc => {
    const embedding = doc.embedding;
    const score = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;

    return {
      id: doc.id,
      type: doc.type,
      url: doc.url,
      content: doc.content,
      score,
      metadata: doc.metadata || {},
      thumbnail: doc.thumbnail,
    };
  });

  // Filter by minimum score and sort
  return results
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Generate excerpt from search result
 */
function generateExcerpt(result: SearchResult, query: string): string {
  const queryTerms = query.toLowerCase().split(/\s+/);

  switch (result.type) {
    case 'image':
      // For images, use description
      const description = typeof result.content === 'object'
        ? result.content.description || JSON.stringify(result.content).substring(0, 200)
        : String(result.content).substring(0, 200);
      return highlightTerms(description, queryTerms);

    case 'audio':
    case 'video':
      // For audio/video, use transcription
      const transcription = result.content?.transcription || '';
      return highlightTerms(findRelevantExcerpt(transcription, queryTerms, 200), queryTerms);

    case 'pdf':
    case 'text':
      // For text documents, find most relevant section
      const text = result.content?.text || result.content || '';
      return highlightTerms(findRelevantExcerpt(text, queryTerms, 200), queryTerms);

    default:
      return 'No excerpt available';
  }
}

/**
 * Find most relevant excerpt containing query terms
 */
function findRelevantExcerpt(
  text: string,
  queryTerms: string[],
  maxLength: number
): string {
  const lowerText = text.toLowerCase();

  // Find first occurrence of any query term
  let bestIndex = -1;
  let bestTerm = '';

  for (const term of queryTerms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestTerm = term;
    }
  }

  if (bestIndex === -1) {
    // No match found, return beginning
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Extract context around the match
  const contextBefore = 50;
  const contextAfter = maxLength - contextBefore;

  const startIndex = Math.max(0, bestIndex - contextBefore);
  const endIndex = Math.min(text.length, bestIndex + bestTerm.length + contextAfter);

  let excerpt = text.substring(startIndex, endIndex);

  if (startIndex > 0) {
    excerpt = '...' + excerpt;
  }
  if (endIndex < text.length) {
    excerpt = excerpt + '...';
  }

  return excerpt;
}

/**
 * Highlight query terms in text
 */
function highlightTerms(text: string, queryTerms: string[]): string {
  let highlighted = text;

  for (const term of queryTerms) {
    if (term.length < 2) continue; // Skip very short terms

    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    highlighted = highlighted.replace(regex, match => `**${match}**`);
  }

  return highlighted;
}

/**
 * Escape special characters in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
