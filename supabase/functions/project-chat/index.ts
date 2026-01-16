import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  handleCorsPreflightRequest,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createErrorResponse,
} from "../_shared/security-headers.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { callAIStreaming } from "../_shared/ai-call.ts";
import { 
  EdgeSupabaseClient,
  rpcCall,
  fromTable,
} from "../_shared/supabase-helpers.ts";
import { captureException, captureMessage } from "../_shared/sentry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report-compliant: Use ONLY OPENAI_API_KEY for embeddings (no LOVABLE_API_KEY fallback)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Report-compliant: embedding model EXACTLY text-embedding-3-small
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CONTEXT_TOKENS = 8000;
const MAX_CHUNKS_PER_DOCUMENT = 5;
const MAX_TOTAL_CHUNKS = 15;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  projectId: string;
  query: string;
  conversationHistory?: ChatMessage[];
  selectedDocumentIds?: string[];
  includeProjectContext?: boolean;
}

interface SourceCitation {
  documentId: string;
  documentName: string;
  chunkId?: string;
  chunkIndex?: number;
  content: string;
  relevanceScore: number;
}

// Typed chunk result from hybrid_search_chunks RPC
interface ChunkSearchResult {
  document_id: string;
  document_name: string;
  chunk_id: string;
  chunk_index: number;
  content: string;
  combined_score: number;
}

// Typed document result from hybrid_search_documents RPC
interface DocumentSearchResult {
  id: string;
  name: string;
  summary?: string;
  matched_snippet?: string;
  combined_score: number;
}

// Generate embedding for semantic search - OPENAI_API_KEY only per report
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured for embeddings');
    return null;
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
      console.error('Embedding API error:', await response.text());
      return null;
    }

    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}

// Context Assembler - intelligently select relevant chunks
async function assembleContext(
  supabase: EdgeSupabaseClient,
  projectId: string,
  userId: string,
  query: string,
  selectedDocumentIds?: string[]
): Promise<{ sources: SourceCitation[]; contextText: string }> {
  const sources: SourceCitation[] = [];
  let contextText = '';

  const queryEmbedding = await generateQueryEmbedding(query);
  const filterDocIds = selectedDocumentIds && selectedDocumentIds.length > 0 
    ? selectedDocumentIds 
    : null;

  const { data: chunkResults, error: chunkError } = await rpcCall<ChunkSearchResult[]>(supabase, 'hybrid_search_chunks', {
    search_query: query,
    query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
    match_threshold: 0.3,
    match_count: MAX_TOTAL_CHUNKS,
    filter_project_id: projectId,
    filter_owner_id: userId,
    filter_mime_types: null,
    filter_language: null,
    filter_date_from: null,
    filter_date_to: null,
    use_semantic: !!queryEmbedding,
    use_fulltext: true,
  });

  if (chunkError) {
    console.error('Chunk search error:', chunkError);
  }

  const chunksByDocument = new Map<string, ChunkSearchResult[]>();
  const typedChunkResults = chunkResults || [];
  
  for (const chunk of typedChunkResults) {
    if (filterDocIds && !filterDocIds.includes(chunk.document_id)) {
      continue;
    }

    const docChunks = chunksByDocument.get(chunk.document_id) || [];
    if (docChunks.length < MAX_CHUNKS_PER_DOCUMENT) {
      docChunks.push(chunk);
      chunksByDocument.set(chunk.document_id, docChunks);
    }
  }

  let tokenEstimate = 0;
  for (const [_docId, chunks] of chunksByDocument) {
    for (const chunk of chunks) {
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (tokenEstimate + chunkTokens > MAX_CONTEXT_TOKENS) {
        break;
      }

      sources.push({
        documentId: chunk.document_id,
        documentName: chunk.document_name,
        chunkId: chunk.chunk_id,
        chunkIndex: chunk.chunk_index,
        content: chunk.content.substring(0, 500),
        relevanceScore: chunk.combined_score,
      });

      contextText += `\n\n[Source: ${chunk.document_name}, Part ${chunk.chunk_index + 1}]\n${chunk.content}`;
      tokenEstimate += chunkTokens;
    }
    if (tokenEstimate >= MAX_CONTEXT_TOKENS) break;
  }

  if (sources.length === 0) {
    const { data: docResults } = await rpcCall<DocumentSearchResult[]>(supabase, 'hybrid_search_documents', {
      search_query: query,
      query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
      match_threshold: 0.3,
      match_count: 5,
      filter_project_id: projectId,
      filter_owner_id: userId,
      filter_mime_types: null,
      filter_language: null,
      filter_date_from: null,
      filter_date_to: null,
      use_semantic: !!queryEmbedding,
      use_fulltext: true,
    });

    const typedDocResults = docResults || [];
    
    for (const doc of typedDocResults) {
      if (filterDocIds && !filterDocIds.includes(doc.id)) continue;
      
      const content = doc.summary || doc.matched_snippet || '';
      if (content) {
        sources.push({
          documentId: doc.id,
          documentName: doc.name,
          content: content.substring(0, 500),
          relevanceScore: doc.combined_score,
        });
        contextText += `\n\n[Source: ${doc.name}]\n${content}`;
      }
    }
  }

  return { sources, contextText };
}

// Typed project result
interface ProjectRow {
  name: string;
  description: string | null;
  document_count: number;
}

// Get project context
async function getProjectContext(
  supabase: EdgeSupabaseClient,
  projectId: string,
  userId: string
): Promise<string> {
  const { data: project } = await fromTable(supabase, 'projects')
    .select('name, description, document_count')
    .eq('id', projectId)
    .eq('owner_id', userId)
    .single();

  const typedProject = project as ProjectRow | null;
  if (!typedProject) return '';

  return `Project: "${typedProject.name}"
Description: ${typedProject.description || 'Not specified'}
Documents: ${typedProject.document_count} document(s)`;
}

// Detect query language
function detectLanguage(text: string): 'ar' | 'en' {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
}

// Build system prompt
function buildSystemPrompt(
  projectContext: string,
  documentContext: string,
  sources: SourceCitation[],
  queryLanguage: 'ar' | 'en'
): string {
  const languageInstruction = queryLanguage === 'ar'
    ? 'Always respond in Arabic. Use formal Arabic language.'
    : 'Always respond in English.';

  const citationInstruction = sources.length > 0
    ? `When using information from the provided sources, include citations in this format: [Source: Document Name, Part X].`
    : '';

  return `You are an intelligent assistant helping users understand their documents and data.

${languageInstruction}

${citationInstruction}

PROJECT CONTEXT:
${projectContext || 'No project context available.'}

RELEVANT DOCUMENT EXCERPTS:
${documentContext || 'No relevant documents found for this query.'}

INSTRUCTIONS:
1. Answer based primarily on the provided document excerpts
2. If the answer isn't in the documents, say so clearly
3. Include source citations when referencing specific information
4. Be concise but thorough
5. If asked in Arabic, respond in Arabic; if asked in English, respond in English`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createUnauthorizedResponse('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return createUnauthorizedResponse('Invalid token');
    }

    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'chat', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const {
      projectId,
      query,
      conversationHistory = [],
      selectedDocumentIds,
      includeProjectContext = true,
    }: ChatRequest = await req.json();

    if (!projectId || !query) {
      return createBadRequestResponse('projectId and query are required');
    }

    const { data: projectAccess } = await fromTable(supabase, 'projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (!projectAccess) {
      return createErrorResponse('Project not found or access denied', 403);
    }

    console.log(`[Chat] User: ${user.id}, Project: ${projectId}, Query: "${query.substring(0, 50)}..."`);

    const queryLanguage = detectLanguage(query);
    const { sources, contextText } = await assembleContext(
      supabase,
      projectId,
      user.id,
      query,
      selectedDocumentIds
    );

    const projectContext = includeProjectContext
      ? await getProjectContext(supabase, projectId, user.id)
      : '';

    const systemPrompt = buildSystemPrompt(projectContext, contextText, sources, queryLanguage);

    // Build full conversation for AI
    const fullConversation = conversationHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
    const userContent = fullConversation ? `${fullConversation}\nuser: ${query}` : query;

    // Use centralized AI call with streaming
    const streamResult = await callAIStreaming({
      taskType: 'chat',
      systemPrompt,
      userContent,
      projectId,
      userId: user.id,
    }, supabase);

    if (!streamResult.success || !streamResult.stream) {
      return new Response(JSON.stringify({ error: streamResult.error || 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transform stream to inject sources
    const encoder = new TextEncoder();
    const transformStream = new TransformStream({
      start(controller) {
        const sourcesEvent = `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`;
        controller.enqueue(encoder.encode(sourcesEvent));
      },
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    const responseStream = streamResult.stream.pipeThrough(transformStream);

    return new Response(responseStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Capture error in Sentry
    await captureException(error as Error, {
      operation: 'project-chat',
      extra: {
        requestId: crypto.randomUUID().slice(0, 8),
      },
    });
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
