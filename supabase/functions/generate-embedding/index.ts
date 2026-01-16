import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= Embedding Generator v2.0 =============
// Features: Full versioning, model tracking, dimension validation
// Principle: If you cannot say which model produced this vector, the system is broken
// Report-compliant: OPENAI_API_KEY only, model = text-embedding-3-small

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report-compliant: Use ONLY OPENAI_API_KEY (no LOVABLE_API_KEY fallback)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============= Embedding Model Configuration =============
// Report-compliant: embedding model EXACTLY text-embedding-3-small
const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small',
  version: '2024-01',
  dimensions: 1536,
  maxTokens: 8191,
  maxChars: 25000,
  ttlDays: 30, // 30-day TTL for embedding cache
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface EmbeddingRequest {
  documentId: string;
  chunkId?: string;
  text?: string;
  forceRegenerate?: boolean;
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  version: string;
  dimensions: number;
  tokensUsed: number;
}

// Generate embedding with full metadata tracking
async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Truncate text to avoid token limits
  const truncatedText = text.substring(0, EMBEDDING_CONFIG.maxChars);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_CONFIG.model,
      input: truncatedText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Embedding API error:', errorText);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const result = await response.json();
  const embedding = result.data[0].embedding;
  const tokensUsed = result.usage?.total_tokens || 0;

  // Validate dimensions
  if (embedding.length !== EMBEDDING_CONFIG.dimensions) {
    console.warn(`Unexpected embedding dimensions: ${embedding.length} vs expected ${EMBEDDING_CONFIG.dimensions}`);
  }

  return {
    embedding,
    model: EMBEDDING_CONFIG.model,
    version: EMBEDDING_CONFIG.version,
    dimensions: embedding.length,
    tokensUsed,
  };
}

// Check if re-embedding is needed (model mismatch or TTL expired)
function needsReembedding(
  currentModel: string | null,
  currentVersion: string | null,
  embeddingDate: string | null
): boolean {
  // If no model info, needs embedding
  if (!currentModel || !currentVersion) return true;
  
  // If model changed, needs re-embedding
  if (currentModel !== EMBEDDING_CONFIG.model) return true;
  if (currentVersion !== EMBEDDING_CONFIG.version) return true;
  
  // Check TTL (30 days)
  if (embeddingDate) {
    const embeddedAt = new Date(embeddingDate);
    const now = new Date();
    const daysSinceEmbedding = (now.getTime() - embeddedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceEmbedding >= EMBEDDING_CONFIG.ttlDays) {
      console.log(`Embedding TTL expired: ${daysSinceEmbedding.toFixed(1)} days since last embedding`);
      return true;
    }
  }
  
  return false;
}

// Typed document row
interface DocumentRow {
  id: string;
  name: string;
  project_id: string;
  status: string;
  embedding_model: string | null;
  embedding_model_version: string | null;
  embedding_date: string | null;
  embedding: string | null;
  extracted_text: string | null;
  summary: string | null;
}

// Typed chunk row
interface ChunkRow {
  id: string;
  content: string;
  embedding_model: string | null;
  embedding_model_version: string | null;
  embedding_date: string | null;
  embedding: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId, chunkId, text, forceRegenerate = false }: EmbeddingRequest = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get document and verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, embedding_model, embedding_model_version')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      console.error('Document fetch error:', docError);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typedDocument = document as DocumentRow;

    // Verify document is ready for embedding
    if (typedDocument.status !== 'ready') {
      return new Response(JSON.stringify({ error: 'Document must be processed before generating embeddings' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: { 
      documentEmbedding?: boolean; 
      chunkEmbeddings?: number;
      model: string;
      version: string;
      dimensions: number;
      totalTokensUsed: number;
      skipped?: number;
    } = {
      model: EMBEDDING_CONFIG.model,
      version: EMBEDDING_CONFIG.version,
      dimensions: EMBEDDING_CONFIG.dimensions,
      totalTokensUsed: 0,
    };

    // Generate chunk embedding if chunkId provided
    if (chunkId) {
      const { data: chunk, error: chunkError } = await supabase
        .from('chunks')
        .select('*, embedding_model, embedding_model_version, embedding_date')
        .eq('id', chunkId)
        .eq('document_id', documentId)
        .single();

      if (chunkError || !chunk) {
        return new Response(JSON.stringify({ error: 'Chunk not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const typedChunk = chunk as ChunkRow;

      // Check if re-embedding needed (model mismatch or TTL expired)
      const needsRegen = forceRegenerate || needsReembedding(
        typedChunk.embedding_model,
        typedChunk.embedding_model_version,
        typedChunk.embedding_date
      );

      if (!needsRegen && typedChunk.embedding) {
        result.skipped = 1;
        return new Response(JSON.stringify({
          success: true,
          documentId,
          chunkId,
          message: 'Embedding already up to date',
          ...result,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const embeddingResult = await generateEmbedding(typedChunk.content);
      result.totalTokensUsed += embeddingResult.tokensUsed;
      
      const { error: updateError } = await supabase
        .from('chunks')
        .update({ 
          embedding: JSON.stringify(embeddingResult.embedding),
          embedding_model: embeddingResult.model,
          embedding_model_version: embeddingResult.version,
          vector_dimension: embeddingResult.dimensions,
          embedding_date: new Date().toISOString(),
        })
        .eq('id', chunkId);

      if (updateError) {
        console.error('Chunk embedding update error:', updateError);
        throw new Error('Failed to save chunk embedding');
      }

      result.chunkEmbeddings = 1;
    } else {
      // Generate document-level embedding
      const textToEmbed = text || typedDocument.extracted_text || typedDocument.summary || '';
      
      if (!textToEmbed) {
        return new Response(JSON.stringify({ error: 'No text available for embedding' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if document needs re-embedding (model mismatch or TTL expired)
      const docNeedsRegen = forceRegenerate || needsReembedding(
        typedDocument.embedding_model,
        typedDocument.embedding_model_version,
        typedDocument.embedding_date
      );

      if (docNeedsRegen) {
        const docEmbedding = await generateEmbedding(textToEmbed);
        result.totalTokensUsed += docEmbedding.tokensUsed;
        
        const { error: updateError } = await supabase
          .from('documents')
          .update({ 
            embedding: JSON.stringify(docEmbedding.embedding),
            embedding_model: docEmbedding.model,
            embedding_model_version: docEmbedding.version,
            embedding_dimensions: docEmbedding.dimensions,
            embedding_date: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) {
          console.error('Document embedding update error:', updateError);
          throw new Error('Failed to save document embedding');
        }

        result.documentEmbedding = true;
      } else {
        result.documentEmbedding = false;
        result.skipped = 1;
      }

      // Also generate embeddings for all chunks
      const { data: chunks, error: chunksError } = await supabase
        .from('chunks')
        .select('id, content, embedding_model, embedding_model_version, embedding, embedding_date')
        .eq('document_id', documentId);

      if (!chunksError && chunks && chunks.length > 0) {
        let chunkCount = 0;
        let skippedCount = 0;

        const typedChunks = chunks as ChunkRow[];

        for (const chunk of typedChunks) {
          // Check if chunk needs re-embedding (model mismatch or TTL expired)
          const chunkNeedsRegen = forceRegenerate || needsReembedding(
            chunk.embedding_model,
            chunk.embedding_model_version,
            chunk.embedding_date
          );

          if (!chunkNeedsRegen && chunk.embedding) {
            skippedCount++;
            continue;
          }

          try {
            const chunkEmbedding = await generateEmbedding(chunk.content);
            result.totalTokensUsed += chunkEmbedding.tokensUsed;
            
            await supabase
              .from('chunks')
              .update({ 
                embedding: JSON.stringify(chunkEmbedding.embedding),
                embedding_model: chunkEmbedding.model,
                embedding_model_version: chunkEmbedding.version,
                vector_dimension: chunkEmbedding.dimensions,
                embedding_date: new Date().toISOString(),
              })
              .eq('id', chunk.id);
            chunkCount++;
          } catch (err) {
            console.error(`Failed to embed chunk ${chunk.id}:`, err);
          }
        }
        result.chunkEmbeddings = chunkCount;
        result.skipped = skippedCount;
      }
    }

    // Log embedding generation with version info
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: user.email || 'Unknown',
      action: 'generate_embedding',
      resource_type: 'document',
      resource_id: documentId,
      resource_name: typedDocument.name,
      details: {
        ...result,
        embedding_model: EMBEDDING_CONFIG.model,
        embedding_version: EMBEDDING_CONFIG.version,
      },
    });

    // Track cost
    const estimatedCost = result.totalTokensUsed * 0.00000002; // $0.02 per 1M tokens
    await supabase.from('project_cost_logs').insert({
      project_id: typedDocument.project_id,
      operation_type: 'embedding',
      operation_id: documentId,
      input_tokens: result.totalTokensUsed,
      output_tokens: 0,
      cost_usd: estimatedCost,
      model_used: EMBEDDING_CONFIG.model,
      metadata: {
        chunks_processed: result.chunkEmbeddings || 0,
        document_processed: result.documentEmbedding || false,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      documentId,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
