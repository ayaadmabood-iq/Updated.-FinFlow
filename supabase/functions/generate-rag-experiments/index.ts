import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// Configuration Templates
// ============================================================================

const EMBEDDING_MODELS = [
  { model: 'text-embedding-3-small', version: '2024-01' },
  { model: 'text-embedding-3-large', version: '2024-01' },
  { model: 'text-embedding-ada-002', version: '2022-12' },
];

const TOP_K_VALUES = [3, 5, 10, 20];

const SIMILARITY_THRESHOLDS = [0.5, 0.7, 0.8];

interface GenerateRequest {
  project_id: string;
  include_existing_config?: boolean;  // Use project's existing chunking config
  embedding_models?: string[];        // Override default models
  top_k_values?: number[];            // Override default top_k
  thresholds?: number[];              // Override thresholds
  max_experiments?: number;           // Limit total experiments
}

interface ChunkingConfig {
  hash: string;
  chunk_size: number;
  chunk_overlap: number;
  chunk_strategy: string;
}

interface GeneratedExperiment {
  name: string;
  description: string;
  chunking_config_hash: string | null;
  embedding_model: string;
  embedding_model_version: string;
  retrieval_config: {
    top_k: number;
    similarity_threshold: number;
    filters: Record<string, unknown>;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function computeChunkingConfigHash(
  chunkSize: number,
  chunkOverlap: number,
  chunkStrategy: string
): string {
  const config = `${chunkSize}-${chunkOverlap}-${chunkStrategy}`;
  let hash = 0;
  for (let i = 0; i < config.length; i++) {
    hash = ((hash << 5) - hash) + config.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}

function generateExperimentName(
  embeddingModel: string,
  topK: number,
  threshold: number,
  chunkingHash: string | null
): string {
  const modelShort = embeddingModel.split('-').slice(-2).join('-');
  const thresholdPct = Math.round(threshold * 100);
  return `${modelShort}_k${topK}_t${thresholdPct}${chunkingHash ? `_c${chunkingHash.slice(0, 4)}` : ''}`;
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

    const {
      project_id,
      include_existing_config = true,
      embedding_models,
      top_k_values,
      thresholds,
      max_experiments = 50,
    }: GenerateRequest = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Generate Experiments] Starting for project: ${project_id}`);

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Collect chunking configs
    const chunkingConfigs: ChunkingConfig[] = [];

    // Add project's current chunking config
    if (include_existing_config) {
      const hash = computeChunkingConfigHash(
        project.chunk_size || 1000,
        project.chunk_overlap || 200,
        project.chunk_strategy || 'fixed'
      );
      chunkingConfigs.push({
        hash,
        chunk_size: project.chunk_size || 1000,
        chunk_overlap: project.chunk_overlap || 200,
        chunk_strategy: project.chunk_strategy || 'fixed',
      });
    }

    // Find unique chunking configs from existing documents
    const { data: documents } = await supabase
      .from('documents')
      .select('processing_metadata')
      .eq('project_id', project_id)
      .eq('owner_id', user.id)
      .not('processing_metadata', 'is', null);

    if (documents) {
      const seenHashes = new Set(chunkingConfigs.map(c => c.hash));
      for (const doc of documents) {
        const metadata = doc.processing_metadata as Record<string, unknown> | null;
        if (metadata?.chunking_config_hash && !seenHashes.has(metadata.chunking_config_hash as string)) {
          seenHashes.add(metadata.chunking_config_hash as string);
          chunkingConfigs.push({
            hash: metadata.chunking_config_hash as string,
            chunk_size: 0, // Unknown from hash
            chunk_overlap: 0,
            chunk_strategy: 'unknown',
          });
        }
      }
    }

    // Use default or provided values
    const models = embedding_models?.map(m => ({ model: m, version: 'latest' })) || EMBEDDING_MODELS;
    const topKs = top_k_values || TOP_K_VALUES;
    const simThresholds = thresholds || SIMILARITY_THRESHOLDS;

    // Generate experiment combinations
    const experiments: GeneratedExperiment[] = [];
    const batchId = crypto.randomUUID();

    for (const model of models) {
      for (const topK of topKs) {
        for (const threshold of simThresholds) {
          // For each chunking config (or null if none)
          const configs = chunkingConfigs.length > 0 ? chunkingConfigs : [null];
          
          for (const config of configs) {
            if (experiments.length >= max_experiments) break;

            const name = generateExperimentName(
              model.model,
              topK,
              threshold,
              config?.hash || null
            );

            experiments.push({
              name,
              description: `Auto-generated: ${model.model} with top_k=${topK}, threshold=${threshold}`,
              chunking_config_hash: config?.hash || null,
              embedding_model: model.model,
              embedding_model_version: model.version,
              retrieval_config: {
                top_k: topK,
                similarity_threshold: threshold,
                filters: {},
              },
            });
          }

          if (experiments.length >= max_experiments) break;
        }
        if (experiments.length >= max_experiments) break;
      }
      if (experiments.length >= max_experiments) break;
    }

    console.log(`[Generate Experiments] Generated ${experiments.length} experiment configurations`);

    // Check for existing experiments to avoid duplicates
    const { data: existingExperiments } = await supabase
      .from('rag_experiments')
      .select('name')
      .eq('project_id', project_id)
      .eq('user_id', user.id);

    const existingNames = new Set((existingExperiments || []).map(e => e.name));
    const newExperiments = experiments.filter(e => !existingNames.has(e.name));

    if (newExperiments.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'All experiment configurations already exist',
        created_count: 0,
        skipped_count: experiments.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert experiments
    const { data: created, error: insertError } = await supabase
      .from('rag_experiments')
      .insert(
        newExperiments.map(exp => ({
          project_id,
          user_id: user.id,
          name: exp.name,
          description: exp.description,
          chunking_config_hash: exp.chunking_config_hash,
          embedding_model: exp.embedding_model,
          embedding_model_version: exp.embedding_model_version,
          retrieval_config: exp.retrieval_config,
          auto_generated: true,
          generation_batch_id: batchId,
        }))
      )
      .select();

    if (insertError) {
      console.error('[Generate Experiments] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create experiments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[Generate Experiments] Created ${created?.length || 0} experiments in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      project_id,
      batch_id: batchId,
      created_count: created?.length || 0,
      skipped_count: experiments.length - newExperiments.length,
      experiments: created,
      generation_config: {
        embedding_models: models.map(m => m.model),
        top_k_values: topKs,
        similarity_thresholds: simThresholds,
        chunking_configs: chunkingConfigs.length,
      },
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Generate Experiments] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
