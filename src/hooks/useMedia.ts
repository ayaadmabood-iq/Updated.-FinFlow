import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as mediaService from '@/services/mediaService';
import type { MediaType, MediaAsset } from '@/services/mediaService';

export function useMediaAssets(projectId: string, options?: {
  mediaType?: MediaType;
  search?: string;
}) {
  return useQuery({
    queryKey: ['media-assets', projectId, options],
    queryFn: () => mediaService.getMediaAssets(projectId, options),
    enabled: !!projectId,
  });
}

export function useMediaAsset(assetId: string) {
  return useQuery({
    queryKey: ['media-asset', assetId],
    queryFn: () => mediaService.getMediaAsset(assetId),
    enabled: !!assetId,
  });
}

export function useCreateMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'>) =>
      mediaService.createMediaAsset(asset),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-assets', data.project_id] });
      toast.success('Media asset created');
    },
    onError: (error) => {
      toast.error('Failed to create media asset', { description: error.message });
    },
  });
}

export function useUpdateMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MediaAsset> }) =>
      mediaService.updateMediaAsset(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media-assets', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['media-asset', data.id] });
      toast.success('Media asset updated');
    },
    onError: (error) => {
      toast.error('Failed to update media asset', { description: error.message });
    },
  });
}

export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => mediaService.deleteMediaAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      toast.success('Media asset deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete media asset', { description: error.message });
    },
  });
}

export function useVisualExtractions(projectId: string, assetId?: string) {
  return useQuery({
    queryKey: ['visual-extractions', projectId, assetId],
    queryFn: () => mediaService.getVisualExtractions(projectId, assetId),
    enabled: !!projectId,
  });
}

export function useTranscriptions(projectId: string, assetId?: string) {
  return useQuery({
    queryKey: ['transcriptions', projectId, assetId],
    queryFn: () => mediaService.getTranscriptions(projectId, assetId),
    enabled: !!projectId,
  });
}

export function useUploadChatImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId, file, threadId }: {
      projectId: string;
      userId: string;
      file: File;
      threadId?: string;
    }) => mediaService.uploadChatImage(projectId, userId, file, threadId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-images', data.project_id] });
      toast.success('Image uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload image', { description: error.message });
    },
  });
}

export function useSearchMedia(projectId: string, query: string) {
  return useQuery({
    queryKey: ['media-search', projectId, query],
    queryFn: () => mediaService.searchMediaByContent(projectId, query),
    enabled: !!projectId && !!query && query.length > 2,
  });
}

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: ({ projectId, imageUrl, prompt, selectedRegion }: {
      projectId: string;
      imageUrl: string;
      prompt?: string;
      selectedRegion?: { x: number; y: number; width: number; height: number };
    }) => mediaService.analyzeImage(projectId, imageUrl, prompt, selectedRegion),
    onError: (error) => {
      toast.error('Failed to analyze image', { description: error.message });
    },
  });
}

export function useExtractChartData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, imageUrl }: { assetId: string; imageUrl: string }) =>
      mediaService.extractChartData(assetId, imageUrl),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visual-extractions', data.project_id] });
      toast.success('Chart data extracted');
    },
    onError: (error) => {
      toast.error('Failed to extract chart data', { description: error.message });
    },
  });
}

export function useTranscribeMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, mediaUrl }: { assetId: string; mediaUrl: string }) =>
      mediaService.transcribeMedia(assetId, mediaUrl),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transcriptions', data.project_id] });
      toast.success('Media transcribed');
    },
    onError: (error) => {
      toast.error('Failed to transcribe media', { description: error.message });
    },
  });
}
