import { supabase } from "@/integrations/supabase/client";

export interface SourceChunk {
  id: string;
  content: string;
  documentId: string;
  documentName: string;
}

export interface VerificationResult {
  success: boolean;
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
  evaluationId?: string;
  durationMs?: number;
}

export interface AIEvaluation {
  id: string;
  project_id: string;
  user_id: string;
  query: string;
  original_response: string;
  verified_response: string | null;
  confidence_score: number | null;
  source_relevance_score: number | null;
  citation_density_score: number | null;
  verification_score: number | null;
  status: 'pending' | 'verified' | 'corrected' | 'flagged';
  hallucinations_detected: any[];
  unsupported_claims: string[];
  reasoning_path: any[];
  source_chunks: any[];
  verification_duration_ms: number | null;
  verifier_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityBenchmark {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  questions: Array<{
    id: string;
    question: string;
    expectedKeywords?: string[];
    expectedAnswer?: string;
  }>;
  expected_answers: Record<string, string>;
  is_active: boolean;
  last_run_at: string | null;
  avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkRun {
  id: string;
  benchmark_id: string;
  project_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  total_questions: number;
  passed_questions: number;
  avg_confidence_score: number | null;
  avg_response_time_ms: number | null;
  results: any[];
  prompt_version: string | null;
  model_version: string | null;
  error_message: string | null;
  created_at: string;
}

export interface GoldStandardAnswer {
  id: string;
  project_id: string;
  evaluation_id: string | null;
  user_id: string;
  approved_by: string | null;
  query: string;
  incorrect_response: string;
  gold_response: string;
  correction_notes: string | null;
  is_applied_to_prompt: boolean;
  applied_at: string | null;
  source_document_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectPromptConfig {
  id: string;
  project_id: string;
  user_id: string;
  system_prompt: string | null;
  additional_instructions: string | null;
  learned_patterns: any[];
  version: number;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

class EvaluationService {
  // Verify a response for hallucinations
  async verifyResponse(
    projectId: string,
    query: string,
    response: string,
    sourceChunks: SourceChunk[]
  ): Promise<VerificationResult> {
    const { data, error } = await supabase.functions.invoke('verify-response', {
      body: { projectId, query, response, sourceChunks },
    });

    if (error) throw error;
    return data;
  }

  // Get evaluations for a project
  async getEvaluations(projectId: string, limit = 50): Promise<AIEvaluation[]> {
    const { data, error } = await supabase
      .from('ai_evaluations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as unknown as AIEvaluation[];
  }

  // Flag an evaluation
  async flagEvaluation(evaluationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_evaluations')
      .update({ status: 'flagged' })
      .eq('id', evaluationId);

    if (error) throw error;
  }

  // === Benchmarks ===

  // Get benchmarks for a project
  async getBenchmarks(projectId: string): Promise<QualityBenchmark[]> {
    const { data, error } = await supabase
      .from('quality_benchmarks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as QualityBenchmark[];
  }

  // Create a benchmark
  async createBenchmark(
    projectId: string,
    name: string,
    description: string,
    questions: Array<{ id: string; question: string; expectedKeywords?: string[]; expectedAnswer?: string }>
  ): Promise<QualityBenchmark> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('quality_benchmarks')
      .insert({
        project_id: projectId,
        user_id: user.id,
        name,
        description,
        questions,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as QualityBenchmark;
  }

  // Update a benchmark
  async updateBenchmark(
    benchmarkId: string,
    updates: Partial<Pick<QualityBenchmark, 'name' | 'description' | 'questions' | 'expected_answers' | 'is_active'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('quality_benchmarks')
      .update(updates)
      .eq('id', benchmarkId);

    if (error) throw error;
  }

  // Delete a benchmark
  async deleteBenchmark(benchmarkId: string): Promise<void> {
    const { error } = await supabase
      .from('quality_benchmarks')
      .delete()
      .eq('id', benchmarkId);

    if (error) throw error;
  }

  // Run a benchmark
  async runBenchmark(benchmarkId: string, projectId: string): Promise<BenchmarkRun> {
    const { data, error } = await supabase.functions.invoke('run-benchmark', {
      body: { benchmarkId, projectId },
    });

    if (error) throw error;
    return data;
  }

  // Get benchmark runs
  async getBenchmarkRuns(benchmarkId: string): Promise<BenchmarkRun[]> {
    const { data, error } = await supabase
      .from('benchmark_runs')
      .select('*')
      .eq('benchmark_id', benchmarkId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as BenchmarkRun[];
  }

  // === Gold Standard Answers ===

  // Get gold standards for a project
  async getGoldStandards(projectId: string): Promise<GoldStandardAnswer[]> {
    const { data, error } = await supabase
      .from('gold_standard_answers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as GoldStandardAnswer[];
  }

  // Create a gold standard answer
  async createGoldStandard(
    projectId: string,
    query: string,
    incorrectResponse: string,
    goldResponse: string,
    correctionNotes?: string,
    evaluationId?: string
  ): Promise<GoldStandardAnswer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('gold_standard_answers')
      .insert({
        project_id: projectId,
        user_id: user.id,
        evaluation_id: evaluationId,
        query,
        incorrect_response: incorrectResponse,
        gold_response: goldResponse,
        correction_notes: correctionNotes,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as GoldStandardAnswer;
  }

  // Apply a gold standard correction to the prompt
  async applyCorrection(projectId: string, goldStandardId: string): Promise<{ success: boolean; newInstructions: string; version: number }> {
    const { data, error } = await supabase.functions.invoke('apply-correction', {
      body: { projectId, goldStandardId },
    });

    if (error) throw error;
    return data;
  }

  // Delete a gold standard
  async deleteGoldStandard(goldStandardId: string): Promise<void> {
    const { error } = await supabase
      .from('gold_standard_answers')
      .delete()
      .eq('id', goldStandardId);

    if (error) throw error;
  }

  // === Prompt Config ===

  // Get prompt config for a project
  async getPromptConfig(projectId: string): Promise<ProjectPromptConfig | null> {
    const { data, error } = await supabase
      .from('project_prompt_configs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as ProjectPromptConfig;
  }

  // Update prompt config
  async updatePromptConfig(
    projectId: string,
    updates: Partial<Pick<ProjectPromptConfig, 'system_prompt' | 'additional_instructions'>>
  ): Promise<ProjectPromptConfig> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if config exists
    const existing = await this.getPromptConfig(projectId);

    if (existing) {
      const { data, error } = await supabase
        .from('project_prompt_configs')
        .update({
          ...updates,
          last_updated_by: user.id,
          version: existing.version + 1,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProjectPromptConfig;
    } else {
      const { data, error } = await supabase
        .from('project_prompt_configs')
        .insert({
          project_id: projectId,
          user_id: user.id,
          ...updates,
          last_updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProjectPromptConfig;
    }
  }
}

export const evaluationService = new EvaluationService();
