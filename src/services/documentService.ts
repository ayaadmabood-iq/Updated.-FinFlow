import { supabase } from '@/integrations/supabase/client';
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  PaginatedResponse,
  SignedUrlResponse,
  UploadUrlResponse,
} from '@/types';

const MAX_FILE_SIZE = 52428800; // 50MB
const BUCKET_NAME = 'project-documents';

class DocumentService {

  // Get documents for a project
  async getDocuments(
    projectId: string,
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResponse<Document>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .is('deleted_at', null),
    ]);

    if (error) throw error;

    return {
      data: (data || []).map(this.mapToDocument),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  // Get single document
  async getDocument(id: string): Promise<Document | null> {

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToDocument(data) : null;
  }

  // Upload a file
  async uploadFile(
    projectId: string,
    file: File,
    customName?: string,
  ): Promise<Document> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check documents quota
    const { data: docsQuota, error: docsQuotaError } = await supabase.rpc('check_quota', {
      _user_id: user.id,
      _quota_type: 'documents',
    });

    if (docsQuotaError) {
      throw new Error('Failed to check documents quota');
    }

    const docsQuotaResult = docsQuota as { allowed: boolean; current: number; limit: number | null; tier: string };

    if (!docsQuotaResult.allowed) {
      const error = new Error('Documents quota exceeded') as Error & {
        quotaExceeded: boolean;
        quotaType: string;
        current: number;
        limit: number | null;
        tier: string;
      };
      error.quotaExceeded = true;
      error.quotaType = 'documents';
      error.current = docsQuotaResult.current;
      error.limit = docsQuotaResult.limit;
      error.tier = docsQuotaResult.tier;
      throw error;
    }

    // Check storage quota
    const { data: storageQuota, error: storageQuotaError } = await supabase.rpc('check_storage_quota', {
      _user_id: user.id,
      _incoming_bytes: file.size,
    });

    if (storageQuotaError) {
      throw new Error('Failed to check storage quota');
    }

    const storageQuotaResult = storageQuota as { allowed: boolean; current: number; limit: number; tier: string };

    if (!storageQuotaResult.allowed) {
      const error = new Error('Storage quota exceeded') as Error & {
        quotaExceeded: boolean;
        quotaType: string;
        current: number;
        limit: number;
        tier: string;
      };
      error.quotaExceeded = true;
      error.quotaType = 'storage';
      error.current = storageQuotaResult.current;
      error.limit = storageQuotaResult.limit;
      error.tier = storageQuotaResult.tier;
      throw error;
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${projectId}/${timestamp}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        owner_id: user.id,
        name: customName || file.name,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        status: 'ready',
      })
      .select()
      .single();

    if (error) throw error;

    // Increment usage after successful upload
    await supabase.rpc('increment_usage', {
      _user_id: user.id,
      _quota_type: 'documents',
      _amount: 1,
    });

    await supabase.rpc('increment_usage', {
      _user_id: user.id,
      _quota_type: 'storage',
      _amount: file.size,
    });

    return this.mapToDocument(data);
  }

  // Update document
  async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document> {

    const { data, error } = await supabase
      .from('documents')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.status && { status: input.status }),
        ...(input.errorMessage !== undefined && { error_message: input.errorMessage }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDocument(data);
  }

  // Soft delete document
  async deleteDocument(id: string): Promise<void> {

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('delete-document', {
      body: { id },
    });

    if (error) throw new Error(error.message || 'Failed to delete document');
    if ((data as any)?.error) throw new Error((data as any).error);
  }

  // Get signed download URL (5 min expiry)
  async getDownloadUrl(id: string): Promise<SignedUrlResponse> {
    const document = await this.getDocument(id);
    if (!document) throw new Error('Document not found');

    // Security: Reduced TTL from 300s to 60s to minimize link leakage window
    const SIGNED_URL_TTL = 60;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(document.storagePath, SIGNED_URL_TTL);

    if (error) throw error;

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString(),
    };
  }

  // Get preview content (images and text only)
  async getPreview(id: string): Promise<{ content: string; mimeType: string } | null> {
    const document = await this.getDocument(id);
    if (!document) throw new Error('Document not found');

    const isImage = document.mimeType.startsWith('image/');
    const isText = document.mimeType.startsWith('text/') ||
                   document.mimeType === 'application/json' ||
                   document.mimeType === 'application/xml';

    if (!isImage && !isText) return null;

    if (isImage) {
      // Security: Reduced TTL from 300s to 60s to minimize link leakage window
      const SIGNED_URL_TTL = 60;
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(document.storagePath, SIGNED_URL_TTL);

      if (error) throw error;
      return { content: data.signedUrl, mimeType: document.mimeType };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(document.storagePath);

    if (error) throw error;

    const textContent = await data.text();
    return {
      content: textContent.substring(0, 10240),
      mimeType: document.mimeType,
    };
  }

  private mapToDocument(data: Record<string, unknown>): Document {
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
      wordCount: (data.word_count as number) || undefined,
      summary: (data.summary as string) || undefined,
      extractedText: (data.extracted_text as string) || undefined,
      language: (data.language as string) || undefined,
      qualityScore: (data.quality_score as number) || undefined,
      processingSteps: (data.processing_steps as Document['processingSteps']) || undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const documentService = new DocumentService();
