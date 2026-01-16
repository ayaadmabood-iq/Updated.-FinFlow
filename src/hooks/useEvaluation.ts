import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationService, SourceChunk, VerificationResult, AIEvaluation, QualityBenchmark, BenchmarkRun, GoldStandardAnswer, ProjectPromptConfig } from "@/services/evaluationService";
import { toast } from "sonner";

// === Verification ===
export function useVerifyResponse() {
  return useMutation<
    VerificationResult,
    Error,
    { projectId: string; query: string; response: string; sourceChunks: SourceChunk[] }
  >({
    mutationFn: ({ projectId, query, response, sourceChunks }) =>
      evaluationService.verifyResponse(projectId, query, response, sourceChunks),
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });
}

// === Evaluations ===
export function useEvaluations(projectId: string | undefined) {
  return useQuery<AIEvaluation[]>({
    queryKey: ["evaluations", projectId],
    queryFn: () => evaluationService.getEvaluations(projectId!),
    enabled: !!projectId,
  });
}

export function useFlagEvaluation() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { evaluationId: string; projectId: string }>({
    mutationFn: ({ evaluationId }) => evaluationService.flagEvaluation(evaluationId),
    onSuccess: (_, { projectId }) => {
      toast.success("Evaluation flagged for review");
      queryClient.invalidateQueries({ queryKey: ["evaluations", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to flag evaluation: ${error.message}`);
    },
  });
}

// === Benchmarks ===
export function useBenchmarks(projectId: string | undefined) {
  return useQuery<QualityBenchmark[]>({
    queryKey: ["benchmarks", projectId],
    queryFn: () => evaluationService.getBenchmarks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateBenchmark() {
  const queryClient = useQueryClient();
  
  return useMutation<
    QualityBenchmark,
    Error,
    { projectId: string; name: string; description: string; questions: Array<{ id: string; question: string; expectedKeywords?: string[]; expectedAnswer?: string }> }
  >({
    mutationFn: ({ projectId, name, description, questions }) =>
      evaluationService.createBenchmark(projectId, name, description, questions),
    onSuccess: (_, { projectId }) => {
      toast.success("Benchmark created");
      queryClient.invalidateQueries({ queryKey: ["benchmarks", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to create benchmark: ${error.message}`);
    },
  });
}

export function useUpdateBenchmark() {
  const queryClient = useQueryClient();
  
  return useMutation<
    void,
    Error,
    { benchmarkId: string; projectId: string; updates: Partial<Pick<QualityBenchmark, 'name' | 'description' | 'questions' | 'expected_answers' | 'is_active'>> }
  >({
    mutationFn: ({ benchmarkId, updates }) =>
      evaluationService.updateBenchmark(benchmarkId, updates),
    onSuccess: (_, { projectId }) => {
      toast.success("Benchmark updated");
      queryClient.invalidateQueries({ queryKey: ["benchmarks", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to update benchmark: ${error.message}`);
    },
  });
}

export function useDeleteBenchmark() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { benchmarkId: string; projectId: string }>({
    mutationFn: ({ benchmarkId }) => evaluationService.deleteBenchmark(benchmarkId),
    onSuccess: (_, { projectId }) => {
      toast.success("Benchmark deleted");
      queryClient.invalidateQueries({ queryKey: ["benchmarks", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete benchmark: ${error.message}`);
    },
  });
}

export function useRunBenchmark() {
  const queryClient = useQueryClient();
  
  return useMutation<BenchmarkRun, Error, { benchmarkId: string; projectId: string }>({
    mutationFn: ({ benchmarkId, projectId }) =>
      evaluationService.runBenchmark(benchmarkId, projectId),
    onSuccess: (data, { benchmarkId, projectId }) => {
      toast.success(`Benchmark completed: ${data.passed_questions}/${data.total_questions} passed`);
      queryClient.invalidateQueries({ queryKey: ["benchmarks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["benchmark-runs", benchmarkId] });
    },
    onError: (error) => {
      toast.error(`Benchmark failed: ${error.message}`);
    },
  });
}

export function useBenchmarkRuns(benchmarkId: string | undefined) {
  return useQuery<BenchmarkRun[]>({
    queryKey: ["benchmark-runs", benchmarkId],
    queryFn: () => evaluationService.getBenchmarkRuns(benchmarkId!),
    enabled: !!benchmarkId,
  });
}

// === Gold Standards ===
export function useGoldStandards(projectId: string | undefined) {
  return useQuery<GoldStandardAnswer[]>({
    queryKey: ["gold-standards", projectId],
    queryFn: () => evaluationService.getGoldStandards(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateGoldStandard() {
  const queryClient = useQueryClient();
  
  return useMutation<
    GoldStandardAnswer,
    Error,
    { projectId: string; query: string; incorrectResponse: string; goldResponse: string; correctionNotes?: string; evaluationId?: string }
  >({
    mutationFn: ({ projectId, query, incorrectResponse, goldResponse, correctionNotes, evaluationId }) =>
      evaluationService.createGoldStandard(projectId, query, incorrectResponse, goldResponse, correctionNotes, evaluationId),
    onSuccess: (_, { projectId }) => {
      toast.success("Gold standard answer saved");
      queryClient.invalidateQueries({ queryKey: ["gold-standards", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to save gold standard: ${error.message}`);
    },
  });
}

export function useApplyCorrection() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { success: boolean; newInstructions: string; version: number },
    Error,
    { projectId: string; goldStandardId: string }
  >({
    mutationFn: ({ projectId, goldStandardId }) =>
      evaluationService.applyCorrection(projectId, goldStandardId),
    onSuccess: (data, { projectId }) => {
      toast.success(`Correction applied (v${data.version})`);
      queryClient.invalidateQueries({ queryKey: ["gold-standards", projectId] });
      queryClient.invalidateQueries({ queryKey: ["prompt-config", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to apply correction: ${error.message}`);
    },
  });
}

export function useDeleteGoldStandard() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { goldStandardId: string; projectId: string }>({
    mutationFn: ({ goldStandardId }) => evaluationService.deleteGoldStandard(goldStandardId),
    onSuccess: (_, { projectId }) => {
      toast.success("Gold standard deleted");
      queryClient.invalidateQueries({ queryKey: ["gold-standards", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete gold standard: ${error.message}`);
    },
  });
}

// === Prompt Config ===
export function usePromptConfig(projectId: string | undefined) {
  return useQuery<ProjectPromptConfig | null>({
    queryKey: ["prompt-config", projectId],
    queryFn: () => evaluationService.getPromptConfig(projectId!),
    enabled: !!projectId,
  });
}

export function useUpdatePromptConfig() {
  const queryClient = useQueryClient();
  
  return useMutation<
    ProjectPromptConfig,
    Error,
    { projectId: string; updates: Partial<Pick<ProjectPromptConfig, 'system_prompt' | 'additional_instructions'>> }
  >({
    mutationFn: ({ projectId, updates }) =>
      evaluationService.updatePromptConfig(projectId, updates),
    onSuccess: (_, { projectId }) => {
      toast.success("Prompt configuration updated");
      queryClient.invalidateQueries({ queryKey: ["prompt-config", projectId] });
    },
    onError: (error) => {
      toast.error(`Failed to update prompt config: ${error.message}`);
    },
  });
}
