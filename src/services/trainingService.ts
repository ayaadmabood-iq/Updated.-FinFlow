import { supabase } from '@/integrations/supabase/client';

export type TrainingFormat = 'openai' | 'anthropic' | 'alpaca' | 'sharegpt';
export type GenerationMode = 'auto' | 'qa' | 'instruction' | 'conversation';
export type DatasetStatus = 'draft' | 'generating' | 'ready' | 'training' | 'completed' | 'failed';

export interface TrainingDataset {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  format: TrainingFormat;
  pairGenerationMode: GenerationMode;
  systemPrompt?: string;
  totalPairs: number;
  totalTokens: number;
  estimatedCost?: number;
  status: DatasetStatus;
  errorMessage?: string;
  jsonlContent?: string;
  validationResult?: ValidationResult;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPair {
  id: string;
  datasetId: string;
  systemMessage?: string;
  userMessage: string;
  assistantMessage: string;
  sourceChunkId?: string;
  sourceDocumentId?: string;
  qualityScore?: number;
  tokenCount?: number;
  isValid: boolean;
  validationErrors?: string[];
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalPairs: number;
    avgTokensPerPair: number;
    avgQualityScore: number;
    uniqueQuestions: number;
  };
}

export interface GenerateDatasetInput {
  projectId: string;
  datasetName: string;
  format: TrainingFormat;
  mode: GenerationMode;
  systemPrompt?: string;
  documentIds?: string[];
}

export interface GenerateResult {
  success: boolean;
  datasetId: string;
  totalPairs: number;
  totalTokens: number;
  estimatedCost: number;
  validation: ValidationResult;
}

class TrainingService {
  async generateDataset(input: GenerateDatasetInput): Promise<GenerateResult> {
    const { data, error } = await supabase.functions.invoke('generate-training-data', {
      body: input,
    });

    if (error) {
      console.error('Generation invoke error:', error);
      throw new Error(error.message || 'Failed to generate training data');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as GenerateResult;
  }

  async getDatasets(projectId: string): Promise<TrainingDataset[]> {
    const { data, error } = await supabase
      .from('training_datasets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapToDataset);
  }

  async getDataset(id: string): Promise<TrainingDataset | null> {
    const { data, error } = await supabase
      .from('training_datasets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToDataset(data) : null;
  }

  async getPairs(datasetId: string, page = 1, pageSize = 20): Promise<{
    data: TrainingPair[];
    total: number;
  }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('training_pairs')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at')
        .range(from, to),
      supabase
        .from('training_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId),
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(this.mapToPair),
      total: count || 0,
    };
  }

  async updatePair(id: string, updates: {
    userMessage?: string;
    assistantMessage?: string;
    systemMessage?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('training_pairs')
      .update({
        user_message: updates.userMessage,
        assistant_message: updates.assistantMessage,
        system_message: updates.systemMessage,
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deletePair(id: string): Promise<void> {
    const { error } = await supabase
      .from('training_pairs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deleteDataset(id: string): Promise<void> {
    const { error } = await supabase
      .from('training_datasets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async downloadJsonl(datasetId: string): Promise<{ content: string; filename: string }> {
    const dataset = await this.getDataset(datasetId);
    if (!dataset || !dataset.jsonlContent) {
      throw new Error('Dataset not found or not generated');
    }

    return {
      content: dataset.jsonlContent,
      filename: `${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dataset.format}.jsonl`,
    };
  }

  private mapToDataset(data: Record<string, unknown>): TrainingDataset {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      userId: data.user_id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      format: data.format as TrainingFormat,
      pairGenerationMode: data.pair_generation_mode as GenerationMode,
      systemPrompt: data.system_prompt as string | undefined,
      totalPairs: (data.total_pairs as number) || 0,
      totalTokens: (data.total_tokens as number) || 0,
      estimatedCost: data.estimated_cost as number | undefined,
      status: data.status as DatasetStatus,
      errorMessage: data.error_message as string | undefined,
      jsonlContent: data.jsonl_content as string | undefined,
      validationResult: data.validation_result as ValidationResult | undefined,
      generatedAt: data.generated_at as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapToPair(data: Record<string, unknown>): TrainingPair {
    return {
      id: data.id as string,
      datasetId: data.dataset_id as string,
      systemMessage: data.system_message as string | undefined,
      userMessage: data.user_message as string,
      assistantMessage: data.assistant_message as string,
      sourceChunkId: data.source_chunk_id as string | undefined,
      sourceDocumentId: data.source_document_id as string | undefined,
      qualityScore: data.quality_score as number | undefined,
      tokenCount: data.token_count as number | undefined,
      isValid: data.is_valid as boolean,
      validationErrors: data.validation_errors as string[] | undefined,
      createdAt: data.created_at as string,
    };
  }
}

export const trainingService = new TrainingService();
