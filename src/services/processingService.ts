import { supabase } from '@/integrations/supabase/client';
import type { Document, PaginatedResponse } from '@/types';

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  extractedLength?: number;
  summary?: string;
  language?: string;
  chunkCount?: number;
  error?: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

class ProcessingService {
  // Process a document via pipeline-orchestrator (single execution path)
  async processDocument(documentId: string): Promise<ProcessingResult> {
    // First get document details for enqueue
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, project_id, storage_path, owner_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Use pipeline-orchestrator for processing (single execution path)
    const { data, error } = await supabase.functions.invoke('pipeline-orchestrator', {
      body: { 
        action: 'enqueue',
        documentId: document.id,
        projectId: document.project_id,
        storagePath: document.storage_path,
        ownerId: document.owner_id,
        priority: 0,
      },
    });

    if (error) {
      console.error('Processing invoke error:', error);
      throw new Error(error.message || 'Failed to process document');
    }

    // Return in expected format
    return {
      success: true,
      documentId: document.id,
      chunkCount: 0, // Will be updated when processing completes
      extractedLength: 0,
    } as ProcessingResult;
  }

  // Get chunks for a document
  async getChunks(
    documentId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Chunk>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('chunks')
        .select('*')
        .eq('document_id', documentId)
        .order('index', { ascending: true })
        .range(from, to),
      supabase
        .from('chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId),
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(this.mapToChunk),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  // Get document with extended processing data
  async getDocumentWithProcessing(id: string): Promise<Document & {
    extractedText?: string;
    summary?: string;
    language?: string;
    processedAt?: string;
  } | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToExtendedDocument(data);
  }

  private mapToChunk(data: Record<string, unknown>): Chunk {
    return {
      id: data.id as string,
      documentId: data.document_id as string,
      content: data.content as string,
      index: data.index as number,
      metadata: data.metadata as Record<string, unknown> | null,
      createdAt: data.created_at as string,
    };
  }

  private mapToExtendedDocument(data: Record<string, unknown>) {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      ownerId: data.owner_id as string,
      name: data.name as string,
      originalName: data.original_name as string,
      mimeType: data.mime_type as string,
      sizeBytes: Number(data.size_bytes),
      storagePath: data.storage_path as string,
      status: data.status as Document['status'],
      errorMessage: (data.error_message as string) || undefined,
      deletedAt: (data.deleted_at as string) || undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      extractedText: (data.extracted_text as string) || undefined,
      summary: (data.summary as string) || undefined,
      language: (data.language as string) || undefined,
      processedAt: (data.processed_at as string) || undefined,
      processingSteps: (data.processing_steps as Document['processingSteps']) || undefined,
    };
  }
}

export const processingService = new ProcessingService();
