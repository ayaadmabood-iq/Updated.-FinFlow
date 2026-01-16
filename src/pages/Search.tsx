import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { useSearchState } from '@/hooks/useSearch';
import { Search as SearchIcon, Sparkles, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Search() {
  const { t } = useTranslation();
  const {
    query,
    setQuery,
    options,
    updateOptions,
    clearSearch,
    resetFilters,
    results,
    isLoading,
    isSearching,
    totalResults,
    searchMode,
    searchDurationMs,
  } = useSearchState();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SearchIcon className="h-6 w-6" />
            {t('search.title', 'Semantic Search')}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {t('search.description', 'Search across all your documents using AI-powered semantic search.')}
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <FileSearch className="h-3 w-3" />
              Full-text
            </Badge>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters 
              options={options} 
              onOptionsChange={updateOptions}
              onReset={resetFilters}
            />
          </div>

          {/* Main search area */}
          <div className="lg:col-span-3 space-y-4">
            <SearchBar
              value={query}
              onChange={setQuery}
              onClear={clearSearch}
              isLoading={isSearching}
              placeholder={t('search.hybridPlaceholder', 'Search by meaning or keywords...')}
              className="max-w-2xl"
            />

            <SearchResults
              results={results}
              query={query}
              isLoading={isLoading}
              totalResults={totalResults}
              searchMode={searchMode}
              searchDurationMs={searchDurationMs}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
