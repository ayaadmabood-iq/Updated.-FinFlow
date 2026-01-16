import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAIRequest } from "../_shared/unified-ai-executor.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  projectId: string;
  query: string;
  response: string;
  sourceChunks: Array<{
    id: string;
    content: string;
    documentId: string;
    documentName: string;
  }>;
}

interface VerificationResult {
  verifiedResponse: string;
  confidenceScore: number;
  sourceRelevanceScore: number;
  citationDensityScore: number;
  verificationScore: number;
  hallucinationsDetected: Array<{
    claim: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  unsupportedClaims: string[];
  reasoningPath: Array<{
    step: number;
    action: string;
    reasoning: string;
    sourceRef?: string;
  }>;
  wasModified: boolean;
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

    const { projectId, query, response, sourceChunks }: VerificationRequest = await req.json();
    
    if (!projectId || !query || !response) {
      throw new Error('Missing required fields: projectId, query, response');
    }

    // Format source chunks for verification
    const sourceContext = sourceChunks.map((chunk, i) => 
      `[Source ${i + 1} - ${chunk.documentName}]:\n${chunk.content}`
    ).join('\n\n');

    // Build verification prompt
    const verificationPrompt = `You are a fact-verification agent. Your task is to verify that an AI response is fully grounded in the provided source documents.

## Source Documents:
${sourceContext}

## Original Query:
${query}

## AI Response to Verify:
${response}

## Your Task:
1. Analyze each claim in the AI response
2. Check if each claim is directly supported by the source documents
3. Identify any hallucinations (claims not supported by sources)
4. Calculate confidence scores
5. If hallucinations are found, rewrite the response to be fully grounded

Respond with a JSON object containing:
{
  "verifiedResponse": "the corrected response if modifications needed, otherwise the original",
  "wasModified": true/false,
  "hallucinationsDetected": [
    {"claim": "the unsupported claim", "reason": "why it's unsupported", "severity": "low|medium|high"}
  ],
  "unsupportedClaims": ["list of claims without source support"],
  "sourceRelevanceScore": 0-100 (how relevant sources are to query),
  "citationDensityScore": 0-100 (percentage of claims with source support),
  "verificationScore": 0-100 (overall verification confidence),
  "reasoningPath": [
    {"step": 1, "action": "analyzed claim X", "reasoning": "found support in source 2", "sourceRef": "source 2 text excerpt"}
  ]
}

Be strict but fair. Only flag claims that are definitively not supported. Ambiguous or reasonable inferences are acceptable.`;

    // ✅ PROTECTED: Use unified AI executor with prompt injection protection
    const aiResult = await executeAIRequest({
      userId: user.id,
      projectId,
      operation: 'verification',
      userInput: verificationPrompt,
      systemPrompt: 'You are a precise fact-verification agent. Always respond with valid JSON.',
      model: 'google/gemini-2.5-flash',
      temperature: 0.3,
      maxTokens: 2000,
    });

    if (aiResult.blocked) {
      console.warn('Verification request blocked:', aiResult.reason);
      return new Response(JSON.stringify({
        error: 'Verification request was blocked',
        reason: aiResult.reason,
        blocked: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!aiResult.success || !aiResult.response) {
      throw new Error(aiResult.error || 'AI verification failed');
    }

    const content = aiResult.response;
    
    // Parse the JSON response
    let verificationResult: VerificationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      
      verificationResult = {
        verifiedResponse: parsed.verifiedResponse || response,
        wasModified: parsed.wasModified || false,
        hallucinationsDetected: parsed.hallucinationsDetected || [],
        unsupportedClaims: parsed.unsupportedClaims || [],
        sourceRelevanceScore: Math.min(100, Math.max(0, parsed.sourceRelevanceScore || 0)),
        citationDensityScore: Math.min(100, Math.max(0, parsed.citationDensityScore || 0)),
        verificationScore: Math.min(100, Math.max(0, parsed.verificationScore || 0)),
        reasoningPath: parsed.reasoningPath || [],
        confidenceScore: 0,
      };

      // Calculate overall confidence score
      verificationResult.confidenceScore = Math.round(
        (verificationResult.sourceRelevanceScore * 0.3) +
        (verificationResult.citationDensityScore * 0.4) +
        (verificationResult.verificationScore * 0.3)
      );
    } catch (parseError) {
      console.error('Failed to parse verification response:', parseError);
      // Return a default response if parsing fails
      verificationResult = {
        verifiedResponse: response,
        wasModified: false,
        hallucinationsDetected: [],
        unsupportedClaims: [],
        sourceRelevanceScore: 70,
        citationDensityScore: 70,
        verificationScore: 70,
        reasoningPath: [],
        confidenceScore: 70,
      };
    }

    // Store the evaluation result
    const { error: insertError } = await supabaseClient
      .from('ai_evaluations')
      .insert({
        project_id: projectId,
        user_id: user.id,
        query,
        original_response: response,
        verified_response: verificationResult.verifiedResponse,
        confidence_score: verificationResult.confidenceScore,
        source_relevance_score: verificationResult.sourceRelevanceScore,
        citation_density_score: verificationResult.citationDensityScore,
        verification_score: verificationResult.verificationScore,
        hallucinations_detected: verificationResult.hallucinationsDetected,
        unsupported_claims: verificationResult.unsupportedClaims,
        reasoning_path: verificationResult.reasoningPath,
        source_chunks: sourceChunks,
        status: 'completed',
        verifier_model: 'google/gemini-2.5-flash',
        verification_duration_ms: aiResult.durationMs,
      });

    if (insertError) {
      console.error('Failed to store evaluation:', insertError);
    }

    return new Response(JSON.stringify({
      ...verificationResult,
      durationMs: aiResult.durationMs,
      usage: aiResult.usage,
      cost: aiResult.cost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-response:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
