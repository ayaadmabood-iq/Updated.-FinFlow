import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService, SearchOptions, SearchResult, SearchResponse, SearchMode } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useSemanticSearch(query: string, options: SearchOptions = {}, enabled = true) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['semantic-search', debouncedQuery, options],
    queryFn: () => searchService.semanticSearch(debouncedQuery, options),
    enabled: enabled && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export interface SearchStateOptions extends SearchOptions {
  searchMode?: SearchMode;
}

export function useSearchState(initialOptions: SearchStateOptions = {}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SearchStateOptions>({
    searchMode: 'hybrid',
    ...initialOptions,
  });
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  
  const searchQuery = useQuery({
    queryKey: ['semantic-search', debouncedQuery, options],
    queryFn: () => searchService.semanticSearch(debouncedQuery, options),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setIsSearching(searchQuery.isFetching);
  }, [searchQuery.isFetching]);

  const updateOptions = useCallback((newOptions: Partial<SearchStateOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  const resetFilters = useCallback(() => {
    setOptions({
      searchMode: 'hybrid',
      limit: 10,
      searchChunks: true,
    });
  }, []);

  return {
    query,
    setQuery,
    options,
    updateOptions,
    clearSearch,
    resetFilters,
    results: searchQuery.data?.results || [],
    isLoading: searchQuery.isLoading,
    isSearching,
    error: searchQuery.error,
    totalResults: searchQuery.data?.totalResults || 0,
    searchMode: searchQuery.data?.searchMode || options.searchMode,
    searchDurationMs: searchQuery.data?.searchDurationMs,
  };
}

export function useGenerateEmbedding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => searchService.generateEmbedding(documentId),
    onSuccess: (result, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      
      const chunks = result.chunkEmbeddings || 0;
      toast.success(`Embeddings generated: document + ${chunks} chunks`);
    },
    onError: (error: Error) => {
      toast.error(`Embedding generation failed: ${error.message}`);
    },
  });
}
