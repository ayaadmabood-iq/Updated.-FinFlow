import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// Cost Constants (per 1M tokens)
// ============================================================================

const EMBEDDING_COSTS: Record<string, { input: number }> = {
  'text-embedding-3-small': { input: 0.02 },
  'text-embedding-3-large': { input: 0.13 },
  'text-embedding-ada-002': { input: 0.10 },
};

// ============================================================================
// Types
// ============================================================================

interface EvaluationRequest {
  experiment_id: string;
  eval_set_id: string;
}

interface EvalQuery {
  id: string;
  query: string;
  expected_chunk_ids: string[];
  expected_document_ids: string[];
  relevance_scores: Record<string, number>;
}

interface RetrievalConfig {
  top_k: number;
  similarity_threshold: number;
  filters: Record<string, unknown>;
}

interface Experiment {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  chunking_config_hash: string | null;
  embedding_model: string;
  embedding_model_version: string | null;
  retrieval_config: RetrievalConfig;
}

interface QueryResult {
  query_id: string;
  query: string;
  retrieved_chunk_ids: string[];
  retrieved_document_ids: string[];
  expected_chunk_ids: string[];
  expected_document_ids: string[];
  latency_ms: number;
  metrics: {
    recall_at_k: number;
    precision_at_k: number;
    mrr: number;
    ndcg: number;
    hit_rate: number;
  };
}

interface AggregateMetrics {
  mean_recall_at_k: number;
  mean_precision_at_k: number;
  mean_mrr: number;
  mean_ndcg: number;
  mean_hit_rate: number;
  query_count: number;
  successful_queries: number;
  failed_queries: number;
}

interface CostMetrics {
  embedding_calls: number;
  embedding_tokens: number;
  embedding_cost_usd: number;
  evaluation_calls: number;
  total_tokens: number;
  estimated_usd: number;
  model_used: string;
}

interface LatencyStats {
  avg_query_latency_ms: number;
  p95_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
}

// ============================================================================
// Metrics Computation
// ============================================================================

/**
 * Recall@K: proportion of relevant items retrieved in top K results
 */
function computeRecallAtK(
  retrieved: string[],
  expected: string[],
  k: number
): number {
  if (expected.length === 0) return 1.0; // No expected items = perfect recall
  const topK = retrieved.slice(0, k);
  const hits = topK.filter(id => expected.includes(id)).length;
  return hits / expected.length;
}

/**
 * Precision@K: proportion of retrieved items that are relevant
 */
function computePrecisionAtK(
  retrieved: string[],
  expected: string[],
  k: number
): number {
  const topK = retrieved.slice(0, k);
  if (topK.length === 0) return 0;
  const hits = topK.filter(id => expected.includes(id)).length;
  return hits / topK.length;
}

/**
 * Mean Reciprocal Rank: 1/rank of first relevant result
 */
function computeMRR(
  retrieved: string[],
  expected: string[]
): number {
  if (expected.length === 0) return 1.0;
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.includes(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Discounted Cumulative Gain
 */
function computeDCG(
  retrieved: string[],
  relevanceScores: Record<string, number>,
  k: number
): number {
  let dcg = 0;
  const topK = retrieved.slice(0, k);
  for (let i = 0; i < topK.length; i++) {
    const relevance = relevanceScores[topK[i]] ?? 0;
    dcg += relevance / Math.log2(i + 2); // i+2 because log2(1) = 0
  }
  return dcg;
}

/**
 * Normalized DCG: DCG / Ideal DCG
 */
function computeNDCG(
  retrieved: string[],
  expected: string[],
  relevanceScores: Record<string, number>,
  k: number
): number {
  // Build ideal ranking (sorted by relevance)
  const idealRanking = [...expected].sort((a, b) => {
    const relA = relevanceScores[a] ?? 1;
    const relB = relevanceScores[b] ?? 1;
    return relB - relA;
  });

  const dcg = computeDCG(retrieved, relevanceScores, k);
  
  // For ideal DCG, use binary relevance if no scores provided
  const idealScores: Record<string, number> = {};
  for (const id of expected) {
    idealScores[id] = relevanceScores[id] ?? 1;
  }
  const idcg = computeDCG(idealRanking, idealScores, k);

  if (idcg === 0) return 1.0; // No ideal ranking = perfect score
  return dcg / idcg;
}

/**
 * Hit Rate: 1 if any relevant item in top K, 0 otherwise
 */
function computeHitRate(
  retrieved: string[],
  expected: string[],
  k: number
): number {
  if (expected.length === 0) return 1.0;
  const topK = retrieved.slice(0, k);
  return topK.some(id => expected.includes(id)) ? 1 : 0;
}

/**
 * Calculate P95 latency from sorted latencies
 */
function computeP95(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Estimate token count for text (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Embedding Generation (with cost tracking)
// ============================================================================

interface EmbeddingResult {
  embedding: number[] | null;
  tokens_used: number;
  cost_usd: number;
}

async function generateQueryEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingResult> {
  if (!OPENAI_API_KEY) {
    console.warn('[RAG Eval] OpenAI API key not configured');
    return { embedding: null, tokens_used: 0, cost_usd: 0 };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RAG Eval] Embedding API error:', errorText);
      return { embedding: null, tokens_used: 0, cost_usd: 0 };
    }

    const result = await response.json();
    const tokensUsed = result.usage?.total_tokens || estimateTokenCount(text);
    const costPerMillion = EMBEDDING_COSTS[model]?.input || 0.02;
    const costUsd = (tokensUsed / 1_000_000) * costPerMillion;

    return {
      embedding: result.data[0].embedding,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
    };
  } catch (error) {
    console.error('[RAG Eval] Failed to generate embedding:', error);
    return { embedding: null, tokens_used: 0, cost_usd: 0 };
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();

  try {
    // Verify authentication
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

    const { experiment_id, eval_set_id }: EvaluationRequest = await req.json();

    if (!experiment_id || !eval_set_id) {
      return new Response(JSON.stringify({ 
        error: 'experiment_id and eval_set_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[RAG Eval] Starting evaluation: experiment=${experiment_id}, eval_set=${eval_set_id}`);

    // Fetch experiment
    const { data: experiment, error: expError } = await supabase
      .from('rag_experiments')
      .select('*')
      .eq('id', experiment_id)
      .eq('user_id', user.id)
      .single();

    if (expError || !experiment) {
      return new Response(JSON.stringify({ error: 'Experiment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typedExperiment = experiment as Experiment;

    // Fetch eval set
    const { data: evalSet, error: setError } = await supabase
      .from('rag_eval_sets')
      .select('*')
      .eq('id', eval_set_id)
      .eq('user_id', user.id)
      .single();

    if (setError || !evalSet) {
      return new Response(JSON.stringify({ error: 'Evaluation set not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch eval queries
    const { data: queries, error: queryError } = await supabase
      .from('rag_eval_queries')
      .select('*')
      .eq('eval_set_id', eval_set_id);

    if (queryError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch queries' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const evalQueries = queries as EvalQuery[];

    if (evalQueries.length === 0) {
      return new Response(JSON.stringify({ error: 'No queries in evaluation set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create run record
    const { data: run, error: runError } = await supabase
      .from('rag_experiment_runs')
      .insert({
        experiment_id,
        eval_set_id,
        user_id: user.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !run) {
      return new Response(JSON.stringify({ error: 'Failed to create run record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const retrievalConfig = typedExperiment.retrieval_config;
    const topK = retrievalConfig.top_k || 5;
    const threshold = retrievalConfig.similarity_threshold || 0.7;
    const embeddingModel = typedExperiment.embedding_model || 'text-embedding-3-small';

    const queryResults: QueryResult[] = [];
    let successfulQueries = 0;
    let failedQueries = 0;
    const queryLatencies: number[] = [];

    // Cost tracking
    const costMetrics: CostMetrics = {
      embedding_calls: 0,
      embedding_tokens: 0,
      embedding_cost_usd: 0,
      evaluation_calls: evalQueries.length,
      total_tokens: 0,
      estimated_usd: 0,
      model_used: embeddingModel,
    };

    // Process each query
    for (const evalQuery of evalQueries) {
      const queryStartTime = Date.now();

      try {
        console.log(`[RAG Eval] Processing query: "${evalQuery.query.substring(0, 50)}..."`);

        // Generate embedding for query (with cost tracking)
        const embeddingResult = await generateQueryEmbedding(evalQuery.query, embeddingModel);
        
        costMetrics.embedding_calls++;
        costMetrics.embedding_tokens += embeddingResult.tokens_used;
        costMetrics.embedding_cost_usd += embeddingResult.cost_usd;

        if (!embeddingResult.embedding) {
          console.warn(`[RAG Eval] Could not generate embedding for query ${evalQuery.id}`);
          failedQueries++;
          continue;
        }

        // Run semantic search on chunks
        const { data: chunkResults, error: searchError } = await supabase.rpc(
          'search_chunks_by_embedding',
          {
            query_embedding: JSON.stringify(embeddingResult.embedding),
            match_threshold: threshold,
            match_count: topK,
            filter_project_id: typedExperiment.project_id,
            filter_owner_id: user.id,
          }
        );

        const queryLatency = Date.now() - queryStartTime;
        queryLatencies.push(queryLatency);

        if (searchError) {
          console.error(`[RAG Eval] Search error for query ${evalQuery.id}:`, searchError);
          failedQueries++;
          continue;
        }

        const retrievedChunkIds: string[] = (chunkResults || []).map((r: { chunk_id: string }) => r.chunk_id);
        const retrievedDocumentIds: string[] = [...new Set(
          (chunkResults || []).map((r: { document_id: string }) => r.document_id)
        )] as string[];

        // Build relevance scores for NDCG
        // If explicit scores provided, use them; otherwise use binary relevance
        const relevanceScores: Record<string, number> = {};
        for (const id of evalQuery.expected_chunk_ids) {
          relevanceScores[id] = (evalQuery.relevance_scores as Record<string, number>)[id] ?? 1;
        }

        // Compute metrics
        const metrics = {
          recall_at_k: computeRecallAtK(retrievedChunkIds, evalQuery.expected_chunk_ids, topK),
          precision_at_k: computePrecisionAtK(retrievedChunkIds, evalQuery.expected_chunk_ids, topK),
          mrr: computeMRR(retrievedChunkIds, evalQuery.expected_chunk_ids),
          ndcg: computeNDCG(retrievedChunkIds, evalQuery.expected_chunk_ids, relevanceScores, topK),
          hit_rate: computeHitRate(retrievedChunkIds, evalQuery.expected_chunk_ids, topK),
        };

        queryResults.push({
          query_id: evalQuery.id,
          query: evalQuery.query,
          retrieved_chunk_ids: retrievedChunkIds,
          retrieved_document_ids: retrievedDocumentIds,
          expected_chunk_ids: evalQuery.expected_chunk_ids,
          expected_document_ids: evalQuery.expected_document_ids,
          latency_ms: queryLatency,
          metrics,
        });

        successfulQueries++;

      } catch (err) {
        console.error(`[RAG Eval] Error processing query ${evalQuery.id}:`, err);
        failedQueries++;
      }
    }

    // Compute aggregate metrics
    const aggregateMetrics: AggregateMetrics = {
      mean_recall_at_k: 0,
      mean_precision_at_k: 0,
      mean_mrr: 0,
      mean_ndcg: 0,
      mean_hit_rate: 0,
      query_count: evalQueries.length,
      successful_queries: successfulQueries,
      failed_queries: failedQueries,
    };

    if (queryResults.length > 0) {
      aggregateMetrics.mean_recall_at_k = queryResults.reduce((sum, r) => sum + r.metrics.recall_at_k, 0) / queryResults.length;
      aggregateMetrics.mean_precision_at_k = queryResults.reduce((sum, r) => sum + r.metrics.precision_at_k, 0) / queryResults.length;
      aggregateMetrics.mean_mrr = queryResults.reduce((sum, r) => sum + r.metrics.mrr, 0) / queryResults.length;
      aggregateMetrics.mean_ndcg = queryResults.reduce((sum, r) => sum + r.metrics.ndcg, 0) / queryResults.length;
      aggregateMetrics.mean_hit_rate = queryResults.reduce((sum, r) => sum + r.metrics.hit_rate, 0) / queryResults.length;
    }

    // Compute latency stats
    const latencyStats: LatencyStats = {
      avg_query_latency_ms: queryLatencies.length > 0 
        ? queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length 
        : 0,
      p95_latency_ms: computeP95(queryLatencies),
      min_latency_ms: queryLatencies.length > 0 ? Math.min(...queryLatencies) : 0,
      max_latency_ms: queryLatencies.length > 0 ? Math.max(...queryLatencies) : 0,
    };

    // Finalize cost metrics
    costMetrics.total_tokens = costMetrics.embedding_tokens;
    costMetrics.estimated_usd = costMetrics.embedding_cost_usd;

    // Generate summary
    const summary = `Evaluated ${successfulQueries}/${evalQueries.length} queries. ` +
      `Mean Recall@${topK}: ${(aggregateMetrics.mean_recall_at_k * 100).toFixed(1)}%, ` +
      `Mean MRR: ${aggregateMetrics.mean_mrr.toFixed(3)}, ` +
      `Mean NDCG: ${aggregateMetrics.mean_ndcg.toFixed(3)}, ` +
      `Hit Rate: ${(aggregateMetrics.mean_hit_rate * 100).toFixed(1)}%. ` +
      `Avg latency: ${latencyStats.avg_query_latency_ms.toFixed(0)}ms, ` +
      `Cost: $${costMetrics.estimated_usd.toFixed(6)}`;

    // Update run record with all metrics
    const { error: updateError } = await supabase
      .from('rag_experiment_runs')
      .update({
        status: failedQueries === evalQueries.length ? 'failed' : 'completed',
        metrics: aggregateMetrics,
        query_results: queryResults,
        summary,
        completed_at: new Date().toISOString(),
        cost_metrics: costMetrics,
        avg_query_latency_ms: latencyStats.avg_query_latency_ms,
        p95_latency_ms: latencyStats.p95_latency_ms,
      })
      .eq('id', run.id);

    if (updateError) {
      console.error('[RAG Eval] Failed to update run:', updateError);
    }

    // Log cost to project_cost_logs
    const { error: costLogError } = await supabase
      .from('project_cost_logs')
      .insert({
        project_id: typedExperiment.project_id,
        user_id: user.id,
        operation_type: 'evaluation',
        operation_id: run.id,
        cost_usd: costMetrics.estimated_usd,
        tokens_used: costMetrics.total_tokens,
        model_used: costMetrics.model_used,
        metadata: {
          experiment_id,
          eval_set_id,
          query_count: evalQueries.length,
          successful_queries: successfulQueries,
        },
      });

    if (costLogError) {
      console.error('[RAG Eval] Failed to log cost:', costLogError);
    }

    const duration = Date.now() - startTime;
    console.log(`[RAG Eval] Completed in ${duration}ms: ${summary}`);

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      experiment_id,
      eval_set_id,
      metrics: aggregateMetrics,
      cost_metrics: costMetrics,
      latency_stats: latencyStats,
      summary,
      query_results: queryResults,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[RAG Eval] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
