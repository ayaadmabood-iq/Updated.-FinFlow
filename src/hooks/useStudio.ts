import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  studioService,
  GenerateContentRequest,
  TransformContentRequest,
  DraftDocumentRequest,
} from '@/services/studioService';

export function useProjectGeneratedContent(projectId: string) {
  return useQuery({
    queryKey: ['generated-content', projectId],
    queryFn: () => studioService.getProjectContent(projectId),
    enabled: !!projectId,
  });
}

export function useGeneratedContent(contentId: string) {
  return useQuery({
    queryKey: ['generated-content-detail', contentId],
    queryFn: () => studioService.getContent(contentId),
    enabled: !!contentId,
  });
}

export function useContentVersions(contentId: string) {
  return useQuery({
    queryKey: ['content-versions', contentId],
    queryFn: () => studioService.getContentVersions(contentId),
    enabled: !!contentId,
  });
}

export function useGenerateContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: GenerateContentRequest) => studioService.generateContent(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-content', variables.projectId] });
      toast({ title: 'Content generated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate content',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useTransformContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: TransformContentRequest) => studioService.transformContent(request),
    onSuccess: (_, variables) => {
      if (variables.contentId) {
        queryClient.invalidateQueries({ queryKey: ['content-versions', variables.contentId] });
        queryClient.invalidateQueries({ queryKey: ['generated-content-detail', variables.contentId] });
      }
      toast({ title: 'Content transformed successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to transform content',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDraftDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: DraftDocumentRequest) => studioService.draftDocument(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-content', variables.projectId] });
      toast({ title: 'Document drafted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to draft document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteGeneratedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ contentId }: { contentId: string; projectId: string }) => 
      studioService.deleteContent(contentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-content', variables.projectId] });
      toast({ title: 'Content deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete content',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
