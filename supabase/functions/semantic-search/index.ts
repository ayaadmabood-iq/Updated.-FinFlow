import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Search request with hybrid options
interface SearchRequest {
  query: string;
  projectId?: string;
  fileTypes?: string[];
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  threshold?: number;
  searchChunks?: boolean;
  searchMode?: 'hybrid' | 'semantic' | 'fulltext';
}

// Enhanced result types with hybrid scores
interface DocumentResult {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  mimeType: string;
  language: string | null;
  summary: string | null;
  createdAt: string;
  similarity: number;
  semanticScore: number;
  fulltextScore: number;
  matchedSnippet: string | null;
  type: 'document';
}

interface ChunkResult {
  chunkId: string;
  documentId: string;
  projectId: string;
  content: string;
  chunkIndex: number;
  documentName: string;
  mimeType: string;
  language: string | null;
  createdAt: string;
  similarity: number;
  semanticScore: number;
  fulltextScore: number;
  matchedSnippet: string | null;
  type: 'chunk';
}

type SearchResult = DocumentResult | ChunkResult;

// Embedding model constants for version validation
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_MODEL_VERSION = '2024-01';

// Generate embedding using OpenAI text-embedding-3-small
async function generateQueryEmbedding(text: string): Promise<{ embedding: number[] | null; model: string; version: string }> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured - semantic search disabled');
    return { embedding: null, model: EMBEDDING_MODEL, version: EMBEDDING_MODEL_VERSION };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Embedding API error:', errorText);
      return { embedding: null, model: EMBEDDING_MODEL, version: EMBEDDING_MODEL_VERSION };
    }

    const result = await response.json();
    return { 
      embedding: result.data[0].embedding, 
      model: EMBEDDING_MODEL, 
      version: EMBEDDING_MODEL_VERSION 
    };
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return { embedding: null, model: EMBEDDING_MODEL, version: EMBEDDING_MODEL_VERSION };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'search', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      query, 
      projectId, 
      fileTypes,
      language,
      dateFrom,
      dateTo,
      limit = 10,
      threshold = 0.5,
      searchChunks = true,
      searchMode = 'hybrid',
    }: SearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Search] User: ${user.id}, Query: "${query}", Mode: ${searchMode}`);

    // Determine search strategy
    const useSemantic = searchMode === 'hybrid' || searchMode === 'semantic';
    const useFulltext = searchMode === 'hybrid' || searchMode === 'fulltext';

    // Generate embedding for semantic search with version tracking
    let queryEmbedding: number[] | null = null;
    let embeddingModelVersion: string = EMBEDDING_MODEL_VERSION;
    if (useSemantic) {
      const embResult = await generateQueryEmbedding(query.trim());
      queryEmbedding = embResult.embedding;
      embeddingModelVersion = embResult.version;
    }

    // If semantic search requested but no API key, fallback to fulltext
    const actualUseSemantic = useSemantic && queryEmbedding !== null;
    const actualUseFulltext = useFulltext || (!actualUseSemantic && searchMode !== 'semantic');

    const results: SearchResult[] = [];

    // Parse date filters
    const filterDateFrom = dateFrom ? new Date(dateFrom).toISOString() : null;
    const filterDateTo = dateTo ? new Date(dateTo).toISOString() : null;

    // Version validation: Log if we're comparing embeddings from different model versions
    console.log(`[Search] Using embedding model version: ${embeddingModelVersion}`);

    // Search documents using hybrid search function
    const { data: docResults, error: docError } = await supabase.rpc('hybrid_search_documents', {
      search_query: query.trim(),
      query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
      match_threshold: threshold,
      match_count: limit,
      filter_project_id: projectId || null,
      filter_owner_id: user.id,
      filter_mime_types: fileTypes && fileTypes.length > 0 ? fileTypes : null,
      filter_language: language || null,
      filter_date_from: filterDateFrom,
      filter_date_to: filterDateTo,
      use_semantic: actualUseSemantic,
      use_fulltext: actualUseFulltext,
    });

    if (docError) {
      console.error('Document search error:', docError);
    } else if (docResults) {
      for (const doc of docResults) {
        results.push({
          id: doc.id,
          projectId: doc.project_id,
          name: doc.name,
          originalName: doc.original_name,
          mimeType: doc.mime_type,
          language: doc.language,
          summary: doc.summary,
          createdAt: doc.created_at,
          similarity: doc.combined_score,
          semanticScore: doc.semantic_score,
          fulltextScore: doc.fulltext_score,
          matchedSnippet: doc.matched_snippet,
          type: 'document',
        });
      }
    }

    // Search chunks if enabled
    if (searchChunks) {
      const { data: chunkResults, error: chunkError } = await supabase.rpc('hybrid_search_chunks', {
        search_query: query.trim(),
        query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
        match_threshold: threshold,
        match_count: limit,
        filter_project_id: projectId || null,
        filter_owner_id: user.id,
        filter_mime_types: fileTypes && fileTypes.length > 0 ? fileTypes : null,
        filter_language: language || null,
        filter_date_from: filterDateFrom,
        filter_date_to: filterDateTo,
        use_semantic: actualUseSemantic,
        use_fulltext: actualUseFulltext,
      });

      if (chunkError) {
        console.error('Chunk search error:', chunkError);
      } else if (chunkResults) {
        for (const chunk of chunkResults) {
          results.push({
            chunkId: chunk.chunk_id,
            documentId: chunk.document_id,
            projectId: chunk.project_id,
            content: chunk.content,
            chunkIndex: chunk.chunk_index,
            documentName: chunk.document_name,
            mimeType: chunk.mime_type,
            language: chunk.language,
            createdAt: chunk.created_at,
            similarity: chunk.combined_score,
            semanticScore: chunk.semantic_score,
            fulltextScore: chunk.fulltext_score,
            matchedSnippet: chunk.matched_snippet,
            type: 'chunk',
          });
        }
      }
    }

    // Sort all results by combined score (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit total results
    const limitedResults = results.slice(0, limit);

    const searchDuration = Date.now() - startTime;
    console.log(`[Search] Found ${limitedResults.length} results in ${searchDuration}ms`);

    return new Response(JSON.stringify({
      success: true,
      query,
      searchMode: actualUseSemantic && actualUseFulltext ? 'hybrid' : (actualUseSemantic ? 'semantic' : 'fulltext'),
      results: limitedResults,
      totalResults: limitedResults.length,
      searchDurationMs: searchDuration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    
    // Capture error in Sentry
    await captureException(error as Error, {
      operation: 'semantic-search',
    });
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
