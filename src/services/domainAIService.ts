// Domain AI Service - Style profiles, glossaries, feedback, system prompts, and Q&A curation

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ==================== Types ====================

export interface StyleProfile {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical' | 'creative';
  formalityLevel: number;
  writingStyle?: string;
  language: string;
  exampleDocumentIds: string[];
  customInstructions?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGlossary {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  autoInject: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryTerm {
  id: string;
  glossaryId: string;
  term: string;
  definition: string;
  aliases: string[];
  category?: string;
  examples?: string[];
  contextHints?: string[];
  doNotTranslate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FeedbackRating = 'positive' | 'negative' | 'neutral';
export type FeedbackCategory = 'factual_error' | 'style' | 'incomplete' | 'irrelevant' | 'too_long' | 'too_short' | 'wrong_format' | 'other';

export interface AIFeedback {
  id: string;
  projectId: string;
  userId: string;
  messageId?: string;
  documentId?: string;
  query: string;
  aiResponse: string;
  rating: FeedbackRating;
  correctedResponse?: string;
  feedbackText?: string;
  feedbackCategory?: FeedbackCategory;
  isUsedForTraining: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface SystemPromptVersion {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  mode: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  includeGlossary: boolean;
  includeStyleProfile: boolean;
  isActive: boolean;
  versionNumber: number;
  parentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type QASourceType = 'chat_history' | 'document_summary' | 'manual' | 'feedback_correction';

export interface CuratedQAPair {
  id: string;
  datasetId: string;
  projectId: string;
  userId: string;
  sourceType: QASourceType;
  sourceId?: string;
  systemPrompt?: string;
  userMessage: string;
  assistantResponse: string;
  qualityScore?: number;
  qualityFlags: string[];
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  metadata: Record<string, unknown>;
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== Style Profiles ====================

export const domainAIService = {
  // Style Profiles
  async getStyleProfiles(projectId: string): Promise<StyleProfile[]> {
    const { data, error } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapStyleProfile);
  },

  async createStyleProfile(input: {
    projectId: string;
    name: string;
    description?: string;
    tone?: string;
    formalityLevel?: number;
    writingStyle?: string;
    language?: string;
    exampleDocumentIds?: string[];
    customInstructions?: string;
  }): Promise<StyleProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('style_profiles')
      .insert({
        project_id: input.projectId,
        user_id: user.id,
        name: input.name,
        description: input.description,
        tone: input.tone || 'professional',
        formality_level: input.formalityLevel || 5,
        writing_style: input.writingStyle,
        language: input.language || 'en',
        example_document_ids: input.exampleDocumentIds || [],
        custom_instructions: input.customInstructions,
      })
      .select()
      .single();

    if (error) throw error;
    return mapStyleProfile(data);
  },

  async updateStyleProfile(id: string, updates: Partial<{
    name: string;
    description: string;
    tone: string;
    formalityLevel: number;
    writingStyle: string;
    language: string;
    exampleDocumentIds: string[];
    customInstructions: string;
    isActive: boolean;
    isDefault: boolean;
  }>): Promise<StyleProfile> {
    const { data, error } = await supabase
      .from('style_profiles')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.tone !== undefined && { tone: updates.tone }),
        ...(updates.formalityLevel !== undefined && { formality_level: updates.formalityLevel }),
        ...(updates.writingStyle !== undefined && { writing_style: updates.writingStyle }),
        ...(updates.language !== undefined && { language: updates.language }),
        ...(updates.exampleDocumentIds !== undefined && { example_document_ids: updates.exampleDocumentIds }),
        ...(updates.customInstructions !== undefined && { custom_instructions: updates.customInstructions }),
        ...(updates.isActive !== undefined && { is_active: updates.isActive }),
        ...(updates.isDefault !== undefined && { is_default: updates.isDefault }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapStyleProfile(data);
  },

  async deleteStyleProfile(id: string): Promise<void> {
    const { error } = await supabase
      .from('style_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Glossaries
  async getGlossaries(projectId: string): Promise<ProjectGlossary[]> {
    const { data, error } = await supabase
      .from('project_glossaries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapGlossary);
  },

  async createGlossary(input: {
    projectId: string;
    name: string;
    description?: string;
    autoInject?: boolean;
  }): Promise<ProjectGlossary> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('project_glossaries')
      .insert({
        project_id: input.projectId,
        user_id: user.id,
        name: input.name,
        description: input.description,
        auto_inject: input.autoInject ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return mapGlossary(data);
  },

  async updateGlossary(id: string, updates: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    autoInject: boolean;
  }>): Promise<ProjectGlossary> {
    const { data, error } = await supabase
      .from('project_glossaries')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.isActive !== undefined && { is_active: updates.isActive }),
        ...(updates.autoInject !== undefined && { auto_inject: updates.autoInject }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapGlossary(data);
  },

  async deleteGlossary(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_glossaries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Glossary Terms
  async getGlossaryTerms(glossaryId: string): Promise<GlossaryTerm[]> {
    const { data, error } = await supabase
      .from('glossary_terms')
      .select('*')
      .eq('glossary_id', glossaryId)
      .order('term', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapGlossaryTerm);
  },

  async createGlossaryTerm(input: {
    glossaryId: string;
    term: string;
    definition: string;
    aliases?: string[];
    category?: string;
    examples?: string[];
    contextHints?: string[];
    doNotTranslate?: boolean;
  }): Promise<GlossaryTerm> {
    const { data, error } = await supabase
      .from('glossary_terms')
      .insert({
        glossary_id: input.glossaryId,
        term: input.term,
        definition: input.definition,
        aliases: input.aliases || [],
        category: input.category,
        examples: input.examples,
        context_hints: input.contextHints,
        do_not_translate: input.doNotTranslate ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return mapGlossaryTerm(data);
  },

  async updateGlossaryTerm(id: string, updates: Partial<{
    term: string;
    definition: string;
    aliases: string[];
    category: string;
    examples: string[];
    contextHints: string[];
    doNotTranslate: boolean;
  }>): Promise<GlossaryTerm> {
    const { data, error } = await supabase
      .from('glossary_terms')
      .update({
        ...(updates.term !== undefined && { term: updates.term }),
        ...(updates.definition !== undefined && { definition: updates.definition }),
        ...(updates.aliases !== undefined && { aliases: updates.aliases }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.examples !== undefined && { examples: updates.examples }),
        ...(updates.contextHints !== undefined && { context_hints: updates.contextHints }),
        ...(updates.doNotTranslate !== undefined && { do_not_translate: updates.doNotTranslate }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapGlossaryTerm(data);
  },

  async deleteGlossaryTerm(id: string): Promise<void> {
    const { error } = await supabase
      .from('glossary_terms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async findRelevantTerms(projectId: string, query: string, limit = 10): Promise<GlossaryTerm[]> {
    // Get glossaries for this project first
    const { data: glossaries, error: glossaryError } = await supabase
      .from('project_glossaries')
      .select('id')
      .eq('project_id', projectId);

    if (glossaryError) throw glossaryError;
    if (!glossaries || glossaries.length === 0) return [];

    const glossaryIds = glossaries.map(g => g.id);

    // Search terms using text search
    const { data, error } = await supabase
      .from('glossary_terms')
      .select('*')
      .in('glossary_id', glossaryIds)
      .or(`term.ilike.%${query}%,definition.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return (data || []).map((t) => ({
      id: t.id,
      glossaryId: t.glossary_id,
      term: t.term,
      definition: t.definition,
      aliases: t.aliases || [],
      category: t.category || undefined,
      doNotTranslate: t.do_not_translate || false,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  },

  // AI Feedback
  async submitFeedback(input: {
    projectId: string;
    messageId?: string;
    documentId?: string;
    query: string;
    aiResponse: string;
    rating: FeedbackRating;
    correctedResponse?: string;
    feedbackText?: string;
    feedbackCategory?: FeedbackCategory;
  }): Promise<AIFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_feedback')
      .insert({
        project_id: input.projectId,
        user_id: user.id,
        message_id: input.messageId,
        document_id: input.documentId,
        query: input.query,
        ai_response: input.aiResponse,
        rating: input.rating,
        corrected_response: input.correctedResponse,
        feedback_text: input.feedbackText,
        feedback_category: input.feedbackCategory,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFeedback(data);
  },

  async getFeedback(projectId: string, options?: {
    rating?: FeedbackRating;
    limit?: number;
    offset?: number;
  }): Promise<AIFeedback[]> {
    let query = supabase
      .from('ai_feedback')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (options?.rating) {
      query = query.eq('rating', options.rating);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapFeedback);
  },

  async updateFeedback(id: string, updates: Partial<{
    correctedResponse: string;
    feedbackText: string;
    feedbackCategory: FeedbackCategory;
  }>): Promise<AIFeedback> {
    const { data, error } = await supabase
      .from('ai_feedback')
      .update({
        ...(updates.correctedResponse !== undefined && { corrected_response: updates.correctedResponse }),
        ...(updates.feedbackText !== undefined && { feedback_text: updates.feedbackText }),
        ...(updates.feedbackCategory !== undefined && { feedback_category: updates.feedbackCategory }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFeedback(data);
  },

  // System Prompt Versions
  async getSystemPromptVersions(projectId: string): Promise<SystemPromptVersion[]> {
    const { data, error } = await supabase
      .from('system_prompt_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapSystemPromptVersion);
  },

  async createSystemPromptVersion(input: {
    projectId: string;
    name: string;
    description?: string;
    mode?: string;
    systemPrompt: string;
    temperature?: number;
    maxTokens?: number;
    includeGlossary?: boolean;
    includeStyleProfile?: boolean;
    parentVersionId?: string;
  }): Promise<SystemPromptVersion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get next version number for this name
    const { data: existing } = await supabase
      .from('system_prompt_versions')
      .select('version_number')
      .eq('project_id', input.projectId)
      .eq('name', input.name)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version_number + 1 : 1;

    const { data, error } = await supabase
      .from('system_prompt_versions')
      .insert({
        project_id: input.projectId,
        user_id: user.id,
        name: input.name,
        description: input.description,
        mode: input.mode || 'default',
        system_prompt: input.systemPrompt,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 2048,
        include_glossary: input.includeGlossary ?? true,
        include_style_profile: input.includeStyleProfile ?? true,
        version_number: nextVersion,
        parent_version_id: input.parentVersionId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapSystemPromptVersion(data);
  },

  async activateSystemPrompt(id: string, projectId: string): Promise<void> {
    // Deactivate all other prompts for this project
    await supabase
      .from('system_prompt_versions')
      .update({ is_active: false })
      .eq('project_id', projectId);

    // Activate the selected prompt
    const { error } = await supabase
      .from('system_prompt_versions')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSystemPromptVersion(id: string): Promise<void> {
    const { error } = await supabase
      .from('system_prompt_versions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Curated Q&A Pairs
  async getCuratedQAPairs(datasetId: string, options?: {
    approvedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CuratedQAPair[]> {
    let query = supabase
      .from('curated_qa_pairs')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('created_at', { ascending: false });

    if (options?.approvedOnly) {
      query = query.eq('is_approved', true);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapCuratedQAPair);
  },

  async createCuratedQAPair(input: {
    datasetId: string;
    projectId: string;
    sourceType: QASourceType;
    sourceId?: string;
    systemPrompt?: string;
    userMessage: string;
    assistantResponse: string;
    qualityScore?: number;
    metadata?: Record<string, unknown>;
  }): Promise<CuratedQAPair> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Estimate token count (rough approximation)
    const tokenCount = Math.ceil((input.userMessage.length + input.assistantResponse.length + (input.systemPrompt?.length || 0)) / 4);

    const { data, error } = await supabase
      .from('curated_qa_pairs')
      .insert({
        dataset_id: input.datasetId,
        project_id: input.projectId,
        user_id: user.id,
        source_type: input.sourceType,
        source_id: input.sourceId,
        system_prompt: input.systemPrompt,
        user_message: input.userMessage,
        assistant_response: input.assistantResponse,
        quality_score: input.qualityScore,
        metadata: input.metadata as Json || {},
        token_count: tokenCount,
      })
      .select()
      .single();

    if (error) throw error;
    return mapCuratedQAPair(data);
  },

  async updateCuratedQAPair(id: string, updates: Partial<{
    systemPrompt: string;
    userMessage: string;
    assistantResponse: string;
    qualityScore: number;
    qualityFlags: string[];
  }>): Promise<CuratedQAPair> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.systemPrompt !== undefined) updateData.system_prompt = updates.systemPrompt;
    if (updates.userMessage !== undefined) updateData.user_message = updates.userMessage;
    if (updates.assistantResponse !== undefined) updateData.assistant_response = updates.assistantResponse;
    if (updates.qualityScore !== undefined) updateData.quality_score = updates.qualityScore;
    if (updates.qualityFlags !== undefined) updateData.quality_flags = updates.qualityFlags;

    // Recalculate token count if content changed
    if (updates.userMessage !== undefined || updates.assistantResponse !== undefined || updates.systemPrompt !== undefined) {
      const { data: current } = await supabase
        .from('curated_qa_pairs')
        .select('user_message, assistant_response, system_prompt')
        .eq('id', id)
        .single();
      
      if (current) {
        const userMsg = updates.userMessage ?? current.user_message;
        const assistantResp = updates.assistantResponse ?? current.assistant_response;
        const sysPrompt = updates.systemPrompt ?? current.system_prompt ?? '';
        updateData.token_count = Math.ceil((userMsg.length + assistantResp.length + sysPrompt.length) / 4);
      }
    }

    const { data, error } = await supabase
      .from('curated_qa_pairs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapCuratedQAPair(data);
  },

  async approveCuratedQAPair(id: string): Promise<CuratedQAPair> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('curated_qa_pairs')
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapCuratedQAPair(data);
  },

  async deleteCuratedQAPair(id: string): Promise<void> {
    const { error } = await supabase
      .from('curated_qa_pairs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Export to JSONL for fine-tuning
  async exportToJSONL(datasetId: string, options?: {
    approvedOnly?: boolean;
    includeSystemPrompt?: boolean;
  }): Promise<string> {
    const pairs = await this.getCuratedQAPairs(datasetId, {
      approvedOnly: options?.approvedOnly ?? true,
    });

    const lines = pairs.map(pair => {
      const messages: Array<{ role: string; content: string }> = [];
      
      if (options?.includeSystemPrompt && pair.systemPrompt) {
        messages.push({ role: 'system', content: pair.systemPrompt });
      }
      
      messages.push({ role: 'user', content: pair.userMessage });
      messages.push({ role: 'assistant', content: pair.assistantResponse });

      return JSON.stringify({ messages });
    });

    return lines.join('\n');
  },
};

// ==================== Mappers ====================

function mapStyleProfile(data: Record<string, unknown>): StyleProfile {
  return {
    id: data.id as string,
    projectId: data.project_id as string,
    userId: data.user_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    tone: data.tone as StyleProfile['tone'],
    formalityLevel: data.formality_level as number,
    writingStyle: data.writing_style as string | undefined,
    language: data.language as string,
    exampleDocumentIds: (data.example_document_ids as string[]) || [],
    customInstructions: data.custom_instructions as string | undefined,
    isActive: data.is_active as boolean,
    isDefault: data.is_default as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapGlossary(data: Record<string, unknown>): ProjectGlossary {
  return {
    id: data.id as string,
    projectId: data.project_id as string,
    userId: data.user_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    isActive: data.is_active as boolean,
    autoInject: data.auto_inject as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapGlossaryTerm(data: Record<string, unknown>): GlossaryTerm {
  return {
    id: data.id as string,
    glossaryId: data.glossary_id as string,
    term: data.term as string,
    definition: data.definition as string,
    aliases: (data.aliases as string[]) || [],
    category: data.category as string | undefined,
    examples: data.examples as string[] | undefined,
    contextHints: data.context_hints as string[] | undefined,
    doNotTranslate: data.do_not_translate as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapFeedback(data: Record<string, unknown>): AIFeedback {
  return {
    id: data.id as string,
    projectId: data.project_id as string,
    userId: data.user_id as string,
    messageId: data.message_id as string | undefined,
    documentId: data.document_id as string | undefined,
    query: data.query as string,
    aiResponse: data.ai_response as string,
    rating: data.rating as FeedbackRating,
    correctedResponse: data.corrected_response as string | undefined,
    feedbackText: data.feedback_text as string | undefined,
    feedbackCategory: data.feedback_category as FeedbackCategory | undefined,
    isUsedForTraining: data.is_used_for_training as boolean,
    reviewedAt: data.reviewed_at as string | undefined,
    reviewedBy: data.reviewed_by as string | undefined,
    createdAt: data.created_at as string,
  };
}

function mapSystemPromptVersion(data: Record<string, unknown>): SystemPromptVersion {
  return {
    id: data.id as string,
    projectId: data.project_id as string,
    userId: data.user_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    mode: data.mode as string,
    systemPrompt: data.system_prompt as string,
    temperature: Number(data.temperature) || 0.7,
    maxTokens: data.max_tokens as number,
    includeGlossary: data.include_glossary as boolean,
    includeStyleProfile: data.include_style_profile as boolean,
    isActive: data.is_active as boolean,
    versionNumber: data.version_number as number,
    parentVersionId: data.parent_version_id as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapCuratedQAPair(data: Record<string, unknown>): CuratedQAPair {
  return {
    id: data.id as string,
    datasetId: data.dataset_id as string,
    projectId: data.project_id as string,
    userId: data.user_id as string,
    sourceType: data.source_type as QASourceType,
    sourceId: data.source_id as string | undefined,
    systemPrompt: data.system_prompt as string | undefined,
    userMessage: data.user_message as string,
    assistantResponse: data.assistant_response as string,
    qualityScore: data.quality_score as number | undefined,
    qualityFlags: (data.quality_flags as string[]) || [],
    isApproved: data.is_approved as boolean,
    approvedBy: data.approved_by as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    metadata: (data.metadata as Record<string, unknown>) || {},
    tokenCount: data.token_count as number | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
