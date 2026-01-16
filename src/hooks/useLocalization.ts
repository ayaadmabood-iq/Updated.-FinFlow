import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  localizationService,
  type ProjectLocalization,
  type DialectMapping,
  type JurisdictionTerm,
  type DocumentDialectAnalysis,
  type CulturalToneTemplate,
  type CrossLanguageQuery,
  type JurisdictionRegion,
  type ArabicDialect,
} from '@/services/localizationService';

// Re-export types
export type {
  ProjectLocalization,
  DialectMapping,
  JurisdictionTerm,
  DocumentDialectAnalysis,
  CulturalToneTemplate,
  CrossLanguageQuery,
  JurisdictionRegion,
  ArabicDialect,
};

export { DIALECT_NAMES, JURISDICTION_NAMES } from '@/services/localizationService';

// Project Localization Hooks
export function useProjectLocalization(projectId: string) {
  return useQuery({
    queryKey: ['project-localization', projectId],
    queryFn: () => localizationService.getProjectLocalization(projectId),
    enabled: !!projectId,
  });
}

export function useUpsertProjectLocalization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      settings,
    }: {
      projectId: string;
      settings: Partial<Omit<ProjectLocalization, 'id' | 'projectId' | 'userId' | 'createdAt' | 'updatedAt'>>;
    }) => localizationService.upsertProjectLocalization(projectId, settings),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-localization', data.projectId] });
      toast.success('Localization settings saved');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Dialect Mapping Hooks
export function useDialectMappings(projectId?: string) {
  return useQuery({
    queryKey: ['dialect-mappings', projectId],
    queryFn: () => localizationService.getDialectMappings(projectId),
  });
}

export function useCreateDialectMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mapping: Omit<DialectMapping, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
      localizationService.createDialectMapping(mapping),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dialect-mappings'] });
      toast.success('Dialect mapping added');
    },
    onError: (error) => {
      toast.error(`Failed to add mapping: ${error.message}`);
    },
  });
}

export function useDeleteDialectMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => localizationService.deleteDialectMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialect-mappings'] });
      toast.success('Dialect mapping deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });
}

// Jurisdiction Terms Hooks
export function useJurisdictionTerms(jurisdiction?: JurisdictionRegion) {
  return useQuery({
    queryKey: ['jurisdiction-terms', jurisdiction],
    queryFn: () => localizationService.getJurisdictionTerms(jurisdiction),
  });
}

// Document Dialect Analysis Hooks
export function useDocumentDialectAnalysis(documentId: string) {
  return useQuery({
    queryKey: ['document-dialect-analysis', documentId],
    queryFn: () => localizationService.getDocumentDialectAnalysis(documentId),
    enabled: !!documentId,
  });
}

export function useCreateDocumentDialectAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysis: Omit<DocumentDialectAnalysis, 'id' | 'userId' | 'analyzedAt'>) =>
      localizationService.createDocumentDialectAnalysis(analysis),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-dialect-analysis', data.documentId] });
    },
    onError: (error) => {
      toast.error(`Failed to save analysis: ${error.message}`);
    },
  });
}

// Cultural Tone Templates Hooks
export function useToneTemplates(options?: {
  jurisdiction?: JurisdictionRegion;
  toneType?: string;
  usageContext?: string;
}) {
  return useQuery({
    queryKey: ['tone-templates', options],
    queryFn: () => localizationService.getToneTemplates(options),
  });
}

// Cross-Language Query Hooks
export function useCrossLanguageQueries(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ['cross-language-queries', projectId, limit],
    queryFn: () => localizationService.getCrossLanguageQueries(projectId, limit),
    enabled: !!projectId,
  });
}

export function useSaveCrossLanguageQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: {
      projectId: string;
      sourceQuery: string;
      sourceLanguage: string;
      translatedQuery: string;
      targetLanguage: string;
      resultCount?: number;
      avgRelevanceScore?: number;
    }) => localizationService.saveCrossLanguageQuery(query),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cross-language-queries', data.projectId] });
    },
  });
}

// Utility hooks
export function useLanguageDetection() {
  return {
    detectLanguage: localizationService.detectLanguage,
    hasRTLContent: localizationService.hasRTLContent,
  };
}
