import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  FolderOpen,
  Database,
  Cpu,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'project' | 'dataset' | 'job' | 'document';
  name: string;
  description?: string;
  status?: string;
  createdAt: string;
}

const RECENT_SEARCHES_KEY = 'fineflow_recent_searches';

export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const searchPattern = `%${debouncedQuery}%`;

        // Search in parallel
        const [projectsRes, datasetsRes, jobsRes, documentsRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, description, status, created_at')
            .eq('owner_id', user.id)
            .ilike('name', searchPattern)
            .limit(5),
          supabase
            .from('training_datasets')
            .select('id, name, description, status, created_at')
            .eq('user_id', user.id)
            .ilike('name', searchPattern)
            .limit(5),
          supabase
            .from('training_jobs')
            .select('id, base_model, status, created_at')
            .eq('user_id', user.id)
            .ilike('base_model', searchPattern)
            .limit(5),
          supabase
            .from('documents')
            .select('id, name, status, created_at')
            .eq('owner_id', user.id)
            .is('deleted_at', null)
            .ilike('name', searchPattern)
            .limit(5),
        ]);

        const searchResults: SearchResult[] = [
          ...(projectsRes.data || []).map(p => ({
            id: p.id,
            type: 'project' as const,
            name: p.name,
            description: p.description,
            status: p.status,
            createdAt: p.created_at,
          })),
          ...(datasetsRes.data || []).map(d => ({
            id: d.id,
            type: 'dataset' as const,
            name: d.name,
            description: d.description || undefined,
            status: d.status || undefined,
            createdAt: d.created_at || '',
          })),
          ...(jobsRes.data || []).map(j => ({
            id: j.id,
            type: 'job' as const,
            name: j.base_model,
            status: j.status,
            createdAt: j.created_at,
          })),
          ...(documentsRes.data || []).map(d => ({
            id: d.id,
            type: 'document' as const,
            name: d.name,
            status: d.status,
            createdAt: d.created_at,
          })),
        ];

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result.name);
    setOpen(false);
    setQuery('');

    switch (result.type) {
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'dataset':
        // Navigate to project with dataset
        navigate('/projects');
        break;
      case 'job':
        navigate('/models');
        break;
      case 'document':
        navigate('/projects');
        break;
    }
  };

  const handleRecentSelect = (term: string) => {
    setQuery(term);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'dataset':
        return <Database className="h-4 w-4" />;
      case 'job':
        return <Cpu className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'project':
        return t('search.project', 'Project');
      case 'dataset':
        return t('search.dataset', 'Dataset');
      case 'job':
        return t('search.trainingJob', 'Training Job');
      case 'document':
        return t('search.document', 'Document');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md hover:bg-accent transition-colors"
        title={t('search.shortcut', 'Press ⌘K to search')}
        aria-label={t('search.shortcut', 'Press ⌘K to search')}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('search.search', 'Search')}...</span>
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t('search.placeholder', 'Search projects, datasets, models...')}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          )}

          {!isLoading && !query && recentSearches.length > 0 && (
            <CommandGroup heading={t('search.recent', 'Recent Searches')}>
              {recentSearches.map((term, i) => (
                <CommandItem key={i} onSelect={() => handleRecentSelect(term)}>
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {term}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isLoading && !query && (
            <CommandGroup heading={t('search.quickActions', 'Quick Actions')}>
              <CommandItem onSelect={() => { setOpen(false); navigate('/projects'); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('search.goToProjects', 'Go to Projects')}
              </CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate('/models'); }}>
                <Cpu className="h-4 w-4 mr-2" />
                {t('search.goToModels', 'Go to Models')}
              </CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate('/templates'); }}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('search.browseTemplates', 'Browse Templates')}
              </CommandItem>
            </CommandGroup>
          )}

          {!isLoading && query && results.length === 0 && (
            <CommandEmpty>{t('search.noResults', 'No results found.')}</CommandEmpty>
          )}

          {!isLoading && results.length > 0 && (
            <>
              {['project', 'dataset', 'job', 'document'].map((type) => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;

                return (
                  <CommandGroup key={type} heading={getTypeLabel(type as SearchResult['type']) + 's'}>
                    {typeResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {getIcon(result.type)}
                          <span>{result.name}</span>
                        </div>
                        {result.status && (
                          <Badge variant="outline" className="text-xs">
                            {result.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
