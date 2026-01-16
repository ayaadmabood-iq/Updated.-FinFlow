import { SearchResult } from '@/services/searchService';
import { SearchResultCard } from './SearchResultCard';
import { FileSearch, Sparkles, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  totalResults?: number;
  searchMode?: 'hybrid' | 'semantic' | 'fulltext';
  searchDurationMs?: number;
}

export function SearchResults({ 
  results, 
  query, 
  isLoading, 
  totalResults,
  searchMode,
  searchDurationMs,
}: SearchResultsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (query.length >= 2 && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">
          {t('search.noResults', 'No results found')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('search.noResultsDescription', 'Try adjusting your search terms or filters to find what you\'re looking for.')}
        </p>
      </div>
    );
  }

  if (query.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">
          {t('search.startSearching', 'Start searching')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('search.startSearchingDescription', 'Enter at least 2 characters to search across your documents using AI-powered hybrid search.')}
        </p>
        <div className="flex gap-2 mt-4">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Semantic AI
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <FileSearch className="h-3 w-3" />
            Full-text
          </Badge>
        </div>
      </div>
    );
  }

  const getSearchModeLabel = () => {
    switch (searchMode) {
      case 'semantic':
        return t('search.usingSemantic', 'AI Semantic');
      case 'fulltext':
        return t('search.usingFulltext', 'Full-text');
      default:
        return t('search.usingHybrid', 'Hybrid');
    }
  };

  return (
    <div className="space-y-4">
      {totalResults !== undefined && totalResults > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t('search.resultsCount', { count: totalResults, defaultValue: `${totalResults} results found` })}
          </span>
          {searchMode && (
            <Badge variant="outline" className="text-xs gap-1">
              {searchMode === 'semantic' || searchMode === 'hybrid' ? (
                <Sparkles className="h-3 w-3" />
              ) : (
                <FileSearch className="h-3 w-3" />
              )}
              {getSearchModeLabel()}
            </Badge>
          )}
          {searchDurationMs !== undefined && (
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {searchDurationMs}ms
            </span>
          )}
        </div>
      )}
      {results.map((result) => (
        <SearchResultCard
          key={result.type === 'document' ? result.id : `${result.documentId}-${result.chunkId}`}
          result={result}
          query={query}
        />
      ))}
    </div>
  );
}
