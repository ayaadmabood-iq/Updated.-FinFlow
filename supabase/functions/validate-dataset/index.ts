import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { datasetId } = await req.json();

    if (!datasetId) {
      return new Response(JSON.stringify({ error: 'datasetId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    

    // Get training pairs
    const { data: pairs, error } = await supabase
      .from('training_pairs')
      .select('*')
      .eq('dataset_id', datasetId);

    if (error) {
      console.error('Error fetching pairs:', error);
      throw error;
    }

    const issues: Array<{ type: string; message: string; pairIndex?: number }> = [];
    let totalTokens = 0;
    const tokenCounts: number[] = [];

    pairs?.forEach((pair, index) => {
      const tokens = Math.ceil((pair.user_message?.length || 0) / 4) +
                     Math.ceil((pair.assistant_message?.length || 0) / 4) +
                     Math.ceil((pair.system_message?.length || 0) / 4) + 10;
      totalTokens += tokens;
      tokenCounts.push(tokens);

      if (!pair.user_message?.trim()) {
        issues.push({ type: 'error', message: 'Empty user message', pairIndex: index });
      }
      if (!pair.assistant_message?.trim()) {
        issues.push({ type: 'error', message: 'Empty assistant message', pairIndex: index });
      }
      if (tokens > 4096) {
        issues.push({ type: 'warning', message: `Exceeds context limit (${tokens} tokens)`, pairIndex: index });
      }
      if (pair.assistant_message && pair.assistant_message.length < 10) {
        issues.push({ type: 'warning', message: `Very short assistant response`, pairIndex: index });
      }
    });

    // Check minimum examples
    const pairCount = pairs?.length || 0;
    if (pairCount < 10) {
      issues.push({ type: 'error', message: `Dataset has ${pairCount} examples. Minimum required: 10` });
    }

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const isValid = errorCount === 0 && pairCount >= 10;

    // Calculate quality score
    const validRatio = pairCount > 0 ? (pairCount - errorCount) / pairCount : 0;
    const qualityScore = Math.max(0, Math.round(validRatio * 100 - errorCount * 5 - warningCount * 2));

    

    return new Response(JSON.stringify({
      isValid,
      qualityScore: Math.min(qualityScore, 100),
      totalPairs: pairCount,
      totalTokens,
      avgTokensPerPair: pairCount > 0 ? Math.round(totalTokens / pairCount) : 0,
      errors: issues.filter(i => i.type === 'error'),
      warnings: issues.filter(i => i.type === 'warning'),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
