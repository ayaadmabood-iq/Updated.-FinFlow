import { supabase } from '@/integrations/supabase/client';

export type MediaType = 'image' | 'chart' | 'diagram' | 'video' | 'audio';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MediaAsset {
  id: string;
  project_id: string;
  document_id?: string | null;
  user_id: string;
  media_type: MediaType;
  name: string;
  description?: string | null;
  storage_path: string;
  thumbnail_path?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  page_number?: number | null;
  source_coordinates?: Record<string, unknown> | null;
  ai_description?: string | null;
  ai_tags?: string[] | null;
  extracted_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VisualExtraction {
  id: string;
  media_asset_id: string;
  project_id: string;
  user_id: string;
  extraction_type: string;
  status: ExtractionStatus;
  extracted_data?: Record<string, unknown> | null;
  structured_table?: Record<string, unknown> | null;
  chart_type?: string | null;
  data_labels?: string[] | null;
  data_values?: Record<string, unknown> | null;
  confidence_score?: number | null;
  error_message?: string | null;
  tokens_used?: number | null;
  processing_cost_usd?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaTranscription {
  id: string;
  media_asset_id: string;
  project_id: string;
  user_id: string;
  status: TranscriptionStatus;
  transcript_text?: string | null;
  transcript_segments?: Record<string, unknown> | null;
  language?: string | null;
  duration_seconds?: number | null;
  word_count?: number | null;
  speaker_labels?: Record<string, unknown> | null;
  keyframes?: Record<string, unknown> | null;
  visual_summary?: string | null;
  tokens_used?: number | null;
  processing_cost_usd?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatImageUpload {
  id: string;
  project_id: string;
  thread_id?: string | null;
  message_id?: string | null;
  user_id: string;
  storage_path: string;
  thumbnail_path?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  ai_analysis?: Record<string, unknown> | null;
  selected_region?: Record<string, unknown> | null;
  created_at: string;
}

// Media Assets CRUD
export async function getMediaAssets(projectId: string, options?: {
  mediaType?: MediaType;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<MediaAsset[]> {
  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (options?.mediaType) {
    query = query.eq('media_type', options.mediaType);
  }

  if (options?.search) {
    query = query.textSearch('search_vector', options.search);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as MediaAsset[];
}

export async function getMediaAsset(assetId: string): Promise<MediaAsset | null> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) throw error;
  return data as unknown as MediaAsset;
}

export async function createMediaAsset(asset: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'>): Promise<MediaAsset> {
  const { data, error } = await supabase
    .from('media_assets')
    .insert([asset] as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MediaAsset;
}

export async function updateMediaAsset(assetId: string, updates: Partial<MediaAsset>): Promise<MediaAsset> {
  const { data, error } = await supabase
    .from('media_assets')
    .update(updates as unknown as Record<string, unknown>)
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MediaAsset;
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const { error } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', assetId);

  if (error) throw error;
}

// Visual Extractions
export async function getVisualExtractions(projectId: string, assetId?: string): Promise<VisualExtraction[]> {
  let query = supabase
    .from('visual_extractions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (assetId) {
    query = query.eq('media_asset_id', assetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as VisualExtraction[];
}

export async function createVisualExtraction(extraction: Omit<VisualExtraction, 'id' | 'created_at' | 'updated_at'>): Promise<VisualExtraction> {
  const { data, error } = await supabase
    .from('visual_extractions')
    .insert([extraction] as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as VisualExtraction;
}

// Transcriptions
export async function getTranscriptions(projectId: string, assetId?: string): Promise<MediaTranscription[]> {
  let query = supabase
    .from('media_transcriptions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (assetId) {
    query = query.eq('media_asset_id', assetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as MediaTranscription[];
}

export async function createTranscription(transcription: Omit<MediaTranscription, 'id' | 'created_at' | 'updated_at'>): Promise<MediaTranscription> {
  const { data, error } = await supabase
    .from('media_transcriptions')
    .insert([transcription] as never)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as MediaTranscription;
}

// Chat Image Uploads
export async function uploadChatImage(
  projectId: string,
  userId: string,
  file: File,
  threadId?: string
): Promise<ChatImageUpload> {
  // Upload to storage
  const fileName = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('media-assets')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Create record
  const { data, error } = await supabase
    .from('chat_image_uploads')
    .insert({
      project_id: projectId,
      user_id: userId,
      thread_id: threadId,
      storage_path: fileName,
      file_size_bytes: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ChatImageUpload;
}

export async function getChatImageUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage
    .from('media-assets')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

// Search media by content
export async function searchMediaByContent(projectId: string, query: string): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('project_id', projectId)
    .textSearch('search_vector', query)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as unknown as MediaAsset[];
}

// Analyze image with AI
export async function analyzeImage(
  projectId: string,
  imageUrl: string,
  prompt?: string,
  selectedRegion?: { x: number; y: number; width: number; height: number }
): Promise<{ description: string; tags: string[]; extractedData?: Record<string, unknown> }> {
  const { data, error } = await supabase.functions.invoke('analyze-visual', {
    body: { projectId, imageUrl, prompt, selectedRegion },
  });

  if (error) throw error;
  return data;
}

// Extract chart data
export async function extractChartData(
  assetId: string,
  imageUrl: string
): Promise<VisualExtraction> {
  const { data, error } = await supabase.functions.invoke('extract-chart-data', {
    body: { assetId, imageUrl },
  });

  if (error) throw error;
  return data;
}

// Transcribe media
export async function transcribeMedia(
  assetId: string,
  mediaUrl: string
): Promise<MediaTranscription> {
  const { data, error } = await supabase.functions.invoke('transcribe-media', {
    body: { assetId, mediaUrl },
  });

  if (error) throw error;
  return data;
}
