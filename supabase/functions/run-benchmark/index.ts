import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BenchmarkQuestion {
  id: string;
  question: string;
  expectedKeywords?: string[];
  expectedAnswer?: string;
}

interface BenchmarkResult {
  questionId: string;
  question: string;
  response: string;
  confidenceScore: number;
  passed: boolean;
  responseTimeMs: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  similarityScore?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { benchmarkId, projectId } = await req.json();
    
    if (!benchmarkId || !projectId) {
      throw new Error('Missing required fields: benchmarkId, projectId');
    }

    // Fetch the benchmark
    const { data: benchmark, error: benchmarkError } = await supabaseClient
      .from('quality_benchmarks')
      .select('*')
      .eq('id', benchmarkId)
      .single();

    if (benchmarkError || !benchmark) {
      throw new Error('Benchmark not found');
    }

    // Create the benchmark run
    const { data: run, error: runError } = await supabaseClient
      .from('benchmark_runs')
      .insert({
        benchmark_id: benchmarkId,
        project_id: projectId,
        user_id: user.id,
        status: 'running',
        started_at: new Date().toISOString(),
        total_questions: (benchmark.questions as BenchmarkQuestion[]).length,
      })
      .select()
      .single();

    if (runError || !run) {
      throw new Error('Failed to create benchmark run');
    }

    // Fetch project prompt config if exists
    const { data: promptConfig } = await supabaseClient
      .from('project_prompt_configs')
      .select('system_prompt, additional_instructions, version')
      .eq('project_id', projectId)
      .single();

    const systemPrompt = promptConfig?.system_prompt || 
      'You are a helpful AI assistant. Answer questions accurately and concisely based on the available information.';
    const additionalInstructions = promptConfig?.additional_instructions || '';

    const questions = benchmark.questions as BenchmarkQuestion[];
    const expectedAnswers = benchmark.expected_answers as Record<string, string> || {};
    const results: BenchmarkResult[] = [];
    let totalConfidence = 0;
    let totalResponseTime = 0;
    let passedCount = 0;
    let totalCost = 0;

    // Run each question with unified AI executor
    for (const q of questions) {
      const startTime = Date.now();
      
      try {
        // ✅ PROTECTED: Use unified AI executor with prompt injection protection
        const aiResult = await executeAIRequest({
          userId: user.id,
          projectId,
          operation: 'benchmark',
          userInput: q.question,
          systemPrompt: `${systemPrompt}\n\n${additionalInstructions}`,
          model: 'google/gemini-2.5-flash',
          temperature: 0.5,
          maxTokens: 1000,
        });

        const responseTimeMs = Date.now() - startTime;
        totalResponseTime += responseTimeMs;
        totalCost += aiResult.cost;

        if (aiResult.blocked) {
          console.warn('Benchmark question blocked:', q.id, aiResult.reason);
          results.push({
            questionId: q.id,
            question: q.question,
            response: `[BLOCKED: ${aiResult.reason}]`,
            confidenceScore: 0,
            passed: false,
            responseTimeMs,
            matchedKeywords: [],
            missedKeywords: q.expectedKeywords || [],
          });
          continue;
        }

        const response = aiResult.response || '';

        // Check keyword matching
        const matchedKeywords: string[] = [];
        const missedKeywords: string[] = [];
        
        if (q.expectedKeywords) {
          for (const keyword of q.expectedKeywords) {
            if (response.toLowerCase().includes(keyword.toLowerCase())) {
              matchedKeywords.push(keyword);
            } else {
              missedKeywords.push(keyword);
            }
          }
        }

        // Calculate a simple confidence score based on keyword matching
        let confidenceScore = 70; // Base score
        if (q.expectedKeywords && q.expectedKeywords.length > 0) {
          confidenceScore = Math.round((matchedKeywords.length / q.expectedKeywords.length) * 100);
        }

        // If expected answer exists, do similarity comparison
        const expectedAnswer = expectedAnswers[q.id] || q.expectedAnswer;
        let similarityScore: number | undefined;
        
        if (expectedAnswer) {
          // Simple word overlap similarity
          const expectedWords = new Set(expectedAnswer.toLowerCase().split(/\s+/));
          const responseWords = response.toLowerCase().split(/\s+/);
          const overlap = responseWords.filter(word => expectedWords.has(word)).length;
          similarityScore = Math.round((overlap / expectedWords.size) * 100);
          confidenceScore = Math.round((confidenceScore + similarityScore) / 2);
        }

        const passed = confidenceScore >= 60;
        if (passed) passedCount++;
        totalConfidence += confidenceScore;

        results.push({
          questionId: q.id,
          question: q.question,
          response,
          confidenceScore,
          passed,
          responseTimeMs,
          matchedKeywords,
          missedKeywords,
          similarityScore,
        });

      } catch (questionErr) {
        console.error(`Error processing question ${q.id}:`, questionErr);
        results.push({
          questionId: q.id,
          question: q.question,
          response: `Error: ${questionErr instanceof Error ? questionErr.message : 'Unknown error'}`,
          confidenceScore: 0,
          passed: false,
          responseTimeMs: Date.now() - startTime,
          matchedKeywords: [],
          missedKeywords: q.expectedKeywords || [],
        });
      }
    }

    // Update the benchmark run with results
    const avgConfidence = results.length > 0 ? Math.round(totalConfidence / results.length) : 0;
    const avgResponseTime = results.length > 0 ? Math.round(totalResponseTime / results.length) : 0;

    await supabaseClient
      .from('benchmark_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results,
        passed_questions: passedCount,
        avg_confidence_score: avgConfidence,
        avg_response_time_ms: avgResponseTime,
        model_version: 'google/gemini-2.5-flash',
        prompt_version: promptConfig?.version?.toString() || '1',
      })
      .eq('id', run.id);

    return new Response(JSON.stringify({
      success: true,
      runId: run.id,
      summary: {
        totalQuestions: questions.length,
        passedQuestions: passedCount,
        avgConfidenceScore: avgConfidence,
        avgResponseTimeMs: avgResponseTime,
        totalCost,
      },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in run-benchmark:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
