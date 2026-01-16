import { supabase } from '@/integrations/supabase/client';

export type TargetFormat = 
  | 'presentation_outline'
  | 'linkedin_post'
  | 'twitter_thread'
  | 'executive_memo'
  | 'blog_post'
  | 'email_draft'
  | 'contract_draft'
  | 'report_summary'
  | 'meeting_notes'
  | 'press_release'
  | 'custom';

export type TransformationType =
  | 'professional'
  | 'casual'
  | 'simplify'
  | 'formal_arabic'
  | 'technical'
  | 'concise'
  | 'expand'
  | 'translate'
  | 'custom';

export interface GeneratedContent {
  id: string;
  projectId: string;
  userId: string;
  sourceDocumentIds: string[];
  sourceText?: string;
  title: string;
  targetFormat: TargetFormat;
  customFormatDescription?: string;
  tone?: string;
  language?: string;
  instructions?: string;
  generatedContent?: string;
  structuredOutput?: Record<string, unknown>;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
  tokensUsed: number;
  generationCostUsd: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ContentVersion {
  id: string;
  generatedContentId: string;
  userId: string;
  versionNumber: number;
  content: string;
  structuredOutput?: Record<string, unknown>;
  changesSummary?: string;
  diffFromPrevious?: {
    additions: number;
    deletions: number;
    similarity: number;
  };
  createdAt: string;
}

export interface GenerateContentRequest {
  projectId: string;
  documentIds?: string[];
  targetFormat: TargetFormat;
  title: string;
  tone?: string;
  language?: string;
  instructions?: string;
  customFormatDescription?: string;
  sourceText?: string;
}

export interface TransformContentRequest {
  contentId?: string;
  text: string;
  transformation: TransformationType;
  targetLanguage?: string;
  customInstructions?: string;
}

export interface DraftDocumentRequest {
  projectId: string;
  sourceDocumentId: string;
  targetDocumentType: string;
  modifications: string;
  title: string;
  additionalContext?: string;
}

export interface GenerateContentResponse {
  id: string;
  content: string;
  structuredOutput?: Record<string, unknown>;
  tokens: number;
  status: string;
}

export interface TransformContentResponse {
  originalText: string;
  transformedText: string;
  transformation: string;
  tokens: number;
  diff: {
    additions: number;
    deletions: number;
    similarity: number;
  };
}

export interface DraftDocumentResponse {
  id?: string;
  sourceDocument: {
    id: string;
    name: string;
  };
  draft: string;
  tokens: number;
  status: string;
}

class StudioService {
  // Generate content in various formats
  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: request,
    });

    if (error) {
      console.error('Generate content error:', error);
      throw new Error(error.message || 'Failed to generate content');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as GenerateContentResponse;
  }

  // Transform/rewrite content
  async transformContent(request: TransformContentRequest): Promise<TransformContentResponse> {
    const { data, error } = await supabase.functions.invoke('transform-content', {
      body: request,
    });

    if (error) {
      console.error('Transform content error:', error);
      throw new Error(error.message || 'Failed to transform content');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as TransformContentResponse;
  }

  // Draft a new document based on existing one
  async draftDocument(request: DraftDocumentRequest): Promise<DraftDocumentResponse> {
    const { data, error } = await supabase.functions.invoke('draft-document', {
      body: request,
    });

    if (error) {
      console.error('Draft document error:', error);
      throw new Error(error.message || 'Failed to draft document');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as DraftDocumentResponse;
  }

  // Get all generated content for a project
  async getProjectContent(projectId: string): Promise<GeneratedContent[]> {
    const { data, error } = await supabase
      .from('generated_content')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToGeneratedContent);
  }

  // Get a specific generated content
  async getContent(contentId: string): Promise<GeneratedContent | null> {
    const { data, error } = await supabase
      .from('generated_content')
      .select('*')
      .eq('id', contentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapToGeneratedContent(data);
  }

  // Get versions for a content
  async getContentVersions(contentId: string): Promise<ContentVersion[]> {
    const { data, error } = await supabase
      .from('content_versions')
      .select('*')
      .eq('generated_content_id', contentId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToContentVersion);
  }

  // Delete generated content
  async deleteContent(contentId: string): Promise<void> {
    const { error } = await supabase
      .from('generated_content')
      .delete()
      .eq('id', contentId);

    if (error) throw error;
  }

  // Copy content to clipboard
  async copyToClipboard(content: string): Promise<void> {
    await navigator.clipboard.writeText(content);
  }

  // Export content as file
  downloadContent(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Export presentation outline to PowerPoint-compatible format (PPTX XML)
  exportPresentationOutline(outline: { title: string; slides: Array<{ title: string; bulletPoints: string[]; speakerNotes: string }> }): string {
    // Generate a simple markdown format that can be imported into PowerPoint
    let content = `# ${outline.title}\n\n`;
    
    for (const slide of outline.slides) {
      content += `---\n\n## ${slide.title}\n\n`;
      for (const point of slide.bulletPoints) {
        content += `- ${point}\n`;
      }
      if (slide.speakerNotes) {
        content += `\n> Speaker Notes: ${slide.speakerNotes}\n`;
      }
      content += '\n';
    }

    return content;
  }

  private mapToGeneratedContent(data: Record<string, unknown>): GeneratedContent {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      userId: data.user_id as string,
      sourceDocumentIds: (data.source_document_ids as string[]) || [],
      sourceText: data.source_text as string | undefined,
      title: data.title as string,
      targetFormat: data.target_format as TargetFormat,
      customFormatDescription: data.custom_format_description as string | undefined,
      tone: data.tone as string | undefined,
      language: (data.language as string) || 'en',
      instructions: data.instructions as string | undefined,
      generatedContent: data.generated_content as string | undefined,
      structuredOutput: data.structured_output as Record<string, unknown> | undefined,
      status: data.status as GeneratedContent['status'],
      errorMessage: data.error_message as string | undefined,
      tokensUsed: (data.tokens_used as number) || 0,
      generationCostUsd: Number(data.generation_cost_usd) || 0,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      completedAt: data.completed_at as string | undefined,
    };
  }

  private mapToContentVersion(data: Record<string, unknown>): ContentVersion {
    return {
      id: data.id as string,
      generatedContentId: data.generated_content_id as string,
      userId: data.user_id as string,
      versionNumber: data.version_number as number,
      content: data.content as string,
      structuredOutput: data.structured_output as Record<string, unknown> | undefined,
      changesSummary: data.changes_summary as string | undefined,
      diffFromPrevious: data.diff_from_previous as ContentVersion['diffFromPrevious'] | undefined,
      createdAt: data.created_at as string,
    };
  }
}

export const studioService = new StudioService();
