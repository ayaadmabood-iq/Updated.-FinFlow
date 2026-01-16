// Domain AI hooks for style profiles, glossaries, feedback, system prompts, and Q&A curation

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  domainAIService,
  type StyleProfile,
  type ProjectGlossary,
  type GlossaryTerm,
  type AIFeedback,
  type SystemPromptVersion,
  type CuratedQAPair,
  type FeedbackRating,
  type FeedbackCategory,
  type QASourceType,
} from '@/services/domainAIService';
import { toast } from 'sonner';

// Re-export types
export type { 
  StyleProfile, 
  ProjectGlossary, 
  GlossaryTerm, 
  AIFeedback, 
  SystemPromptVersion, 
  CuratedQAPair,
  FeedbackRating,
  FeedbackCategory,
  QASourceType,
};

// ==================== Style Profiles ====================

export function useStyleProfiles(projectId: string) {
  return useQuery({
    queryKey: ['styleProfiles', projectId],
    queryFn: () => domainAIService.getStyleProfiles(projectId),
    enabled: !!projectId,
  });
}

export function useCreateStyleProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.createStyleProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['styleProfiles', data.projectId] });
      toast.success('Style profile created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create style profile: ${error.message}`);
    },
  });
}

export function useUpdateStyleProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof domainAIService.updateStyleProfile>[1] }) =>
      domainAIService.updateStyleProfile(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['styleProfiles', data.projectId] });
      toast.success('Style profile updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update style profile: ${error.message}`);
    },
  });
}

export function useDeleteStyleProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      domainAIService.deleteStyleProfile(id).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['styleProfiles', projectId] });
      toast.success('Style profile deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete style profile: ${error.message}`);
    },
  });
}

// ==================== Glossaries ====================

export function useGlossaries(projectId: string) {
  return useQuery({
    queryKey: ['glossaries', projectId],
    queryFn: () => domainAIService.getGlossaries(projectId),
    enabled: !!projectId,
  });
}

export function useCreateGlossary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.createGlossary,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['glossaries', data.projectId] });
      toast.success('Glossary created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create glossary: ${error.message}`);
    },
  });
}

export function useUpdateGlossary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof domainAIService.updateGlossary>[1] }) =>
      domainAIService.updateGlossary(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['glossaries', data.projectId] });
      toast.success('Glossary updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update glossary: ${error.message}`);
    },
  });
}

export function useDeleteGlossary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      domainAIService.deleteGlossary(id).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['glossaries', projectId] });
      toast.success('Glossary deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete glossary: ${error.message}`);
    },
  });
}

// ==================== Glossary Terms ====================

export function useGlossaryTerms(glossaryId: string) {
  return useQuery({
    queryKey: ['glossaryTerms', glossaryId],
    queryFn: () => domainAIService.getGlossaryTerms(glossaryId),
    enabled: !!glossaryId,
  });
}

export function useCreateGlossaryTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.createGlossaryTerm,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['glossaryTerms', data.glossaryId] });
      toast.success('Term added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add term: ${error.message}`);
    },
  });
}

export function useUpdateGlossaryTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, glossaryId, updates }: { id: string; glossaryId: string; updates: Parameters<typeof domainAIService.updateGlossaryTerm>[1] }) =>
      domainAIService.updateGlossaryTerm(id, updates).then(() => glossaryId),
    onSuccess: (glossaryId) => {
      queryClient.invalidateQueries({ queryKey: ['glossaryTerms', glossaryId] });
      toast.success('Term updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update term: ${error.message}`);
    },
  });
}

export function useDeleteGlossaryTerm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, glossaryId }: { id: string; glossaryId: string }) =>
      domainAIService.deleteGlossaryTerm(id).then(() => glossaryId),
    onSuccess: (glossaryId) => {
      queryClient.invalidateQueries({ queryKey: ['glossaryTerms', glossaryId] });
      toast.success('Term deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete term: ${error.message}`);
    },
  });
}

export function useFindRelevantTerms(projectId: string, query: string, limit = 10) {
  return useQuery({
    queryKey: ['relevantTerms', projectId, query],
    queryFn: () => domainAIService.findRelevantTerms(projectId, query, limit),
    enabled: !!projectId && !!query && query.length >= 2,
    staleTime: 60000,
  });
}

// ==================== AI Feedback ====================

export function useAIFeedback(projectId: string, options?: { rating?: FeedbackRating; limit?: number }) {
  return useQuery({
    queryKey: ['aiFeedback', projectId, options],
    queryFn: () => domainAIService.getFeedback(projectId, options),
    enabled: !!projectId,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.submitFeedback,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiFeedback', data.projectId] });
      if (data.rating === 'positive') {
        toast.success('Thanks for your feedback!');
      } else if (data.rating === 'negative') {
        toast.info('Thanks for your feedback. We\'ll use it to improve.');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof domainAIService.updateFeedback>[1] }) =>
      domainAIService.updateFeedback(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiFeedback', data.projectId] });
      toast.success('Feedback updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feedback: ${error.message}`);
    },
  });
}

// ==================== System Prompt Versions ====================

export function useSystemPromptVersions(projectId: string) {
  return useQuery({
    queryKey: ['systemPromptVersions', projectId],
    queryFn: () => domainAIService.getSystemPromptVersions(projectId),
    enabled: !!projectId,
  });
}

export function useCreateSystemPromptVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.createSystemPromptVersion,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemPromptVersions', data.projectId] });
      toast.success('System prompt created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create system prompt: ${error.message}`);
    },
  });
}

export function useActivateSystemPrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      domainAIService.activateSystemPrompt(id, projectId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['systemPromptVersions', projectId] });
      toast.success('System prompt activated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to activate system prompt: ${error.message}`);
    },
  });
}

export function useDeleteSystemPromptVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      domainAIService.deleteSystemPromptVersion(id).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['systemPromptVersions', projectId] });
      toast.success('System prompt deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete system prompt: ${error.message}`);
    },
  });
}

// ==================== Curated Q&A Pairs ====================

export function useCuratedQAPairs(datasetId: string, options?: { approvedOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ['curatedQAPairs', datasetId, options],
    queryFn: () => domainAIService.getCuratedQAPairs(datasetId, options),
    enabled: !!datasetId,
  });
}

export function useCreateCuratedQAPair() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: domainAIService.createCuratedQAPair,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['curatedQAPairs', data.datasetId] });
      toast.success('Q&A pair added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add Q&A pair: ${error.message}`);
    },
  });
}

export function useUpdateCuratedQAPair() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, datasetId, updates }: { 
      id: string; 
      datasetId: string; 
      updates: Parameters<typeof domainAIService.updateCuratedQAPair>[1] 
    }) => domainAIService.updateCuratedQAPair(id, updates).then(() => datasetId),
    onSuccess: (datasetId) => {
      queryClient.invalidateQueries({ queryKey: ['curatedQAPairs', datasetId] });
      toast.success('Q&A pair updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update Q&A pair: ${error.message}`);
    },
  });
}

export function useApproveCuratedQAPair() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, datasetId }: { id: string; datasetId: string }) =>
      domainAIService.approveCuratedQAPair(id).then(() => datasetId),
    onSuccess: (datasetId) => {
      queryClient.invalidateQueries({ queryKey: ['curatedQAPairs', datasetId] });
      toast.success('Q&A pair approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve Q&A pair: ${error.message}`);
    },
  });
}

export function useDeleteCuratedQAPair() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, datasetId }: { id: string; datasetId: string }) =>
      domainAIService.deleteCuratedQAPair(id).then(() => datasetId),
    onSuccess: (datasetId) => {
      queryClient.invalidateQueries({ queryKey: ['curatedQAPairs', datasetId] });
      toast.success('Q&A pair deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete Q&A pair: ${error.message}`);
    },
  });
}

export function useExportToJSONL() {
  return useMutation({
    mutationFn: ({ datasetId, options }: { 
      datasetId: string; 
      options?: { approvedOnly?: boolean; includeSystemPrompt?: boolean } 
    }) => domainAIService.exportToJSONL(datasetId, options),
    onSuccess: (jsonl) => {
      // Download as file
      const blob = new Blob([jsonl], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training_data.jsonl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Dataset exported to JSONL');
    },
    onError: (error: Error) => {
      toast.error(`Failed to export dataset: ${error.message}`);
    },
  });
}
