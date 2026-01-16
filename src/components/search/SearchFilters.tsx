import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchOptions, SearchMode, SUPPORTED_LANGUAGES } from '@/services/searchService';
import { useProjects } from '@/hooks/useProjects';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  options: SearchOptions & { searchMode?: SearchMode };
  onOptionsChange: (options: Partial<SearchOptions & { searchMode?: SearchMode }>) => void;
  onReset?: () => void;
}

const FILE_TYPES = [
  { value: 'text/plain', label: 'Text' },
  { value: 'application/pdf', label: 'PDF' },
  { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word' },
  { value: 'audio/mpeg', label: 'Audio (MP3)' },
  { value: 'video/mp4', label: 'Video (MP4)' },
];

export function SearchFilters({ options, onOptionsChange, onReset }: SearchFiltersProps) {
  const { t } = useTranslation();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data || [];

  const handleFileTypeChange = (type: string, checked: boolean) => {
    const currentTypes = options.fileTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter((t) => t !== type);
    onOptionsChange({ fileTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onOptionsChange({ dateFrom: date ? date.toISOString() : undefined });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onOptionsChange({ dateTo: date ? date.toISOString() : undefined });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{t('search.filters', 'Filters')}</h3>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2">
            <RotateCcw className="h-3 w-3 mr-1" />
            {t('common.reset', 'Reset')}
          </Button>
        )}
      </div>
      
      {/* Search mode */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.searchMode', 'Search Mode')}</Label>
        <Select
          value={options.searchMode || 'hybrid'}
          onValueChange={(value: SearchMode) => onOptionsChange({ searchMode: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hybrid">{t('search.modeHybrid', 'Hybrid (AI + Text)')}</SelectItem>
            <SelectItem value="semantic">{t('search.modeSemantic', 'Semantic (AI)')}</SelectItem>
            <SelectItem value="fulltext">{t('search.modeFulltext', 'Full-text')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project filter */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.filterByProject', 'Project')}</Label>
        <Select
          value={options.projectId || 'all'}
          onValueChange={(value) => onOptionsChange({ projectId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={t('search.allProjects', 'All projects')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.allProjects', 'All projects')}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language filter */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.filterByLanguage', 'Language')}</Label>
        <Select
          value={options.language || 'all'}
          onValueChange={(value) => onOptionsChange({ language: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={t('search.allLanguages', 'All languages')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.allLanguages', 'All languages')}</SelectItem>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range filters */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.dateRange', 'Date Range')}</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal flex-1",
                  !options.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {options.dateFrom ? format(new Date(options.dateFrom), 'PP') : t('search.from', 'From')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={options.dateFrom ? new Date(options.dateFrom) : undefined}
                onSelect={handleDateFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal flex-1",
                  !options.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {options.dateTo ? format(new Date(options.dateTo), 'PP') : t('search.to', 'To')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={options.dateTo ? new Date(options.dateTo) : undefined}
                onSelect={handleDateToChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* File type filter */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.filterByType', 'File types')}</Label>
        <div className="space-y-1">
          {FILE_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <Checkbox
                id={type.value}
                checked={options.fileTypes?.includes(type.value) || false}
                onCheckedChange={(checked) => handleFileTypeChange(type.value, checked as boolean)}
              />
              <Label htmlFor={type.value} className="text-xs font-normal cursor-pointer">
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Search chunks toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="searchChunks"
          checked={options.searchChunks ?? true}
          onCheckedChange={(checked) => onOptionsChange({ searchChunks: checked as boolean })}
        />
        <Label htmlFor="searchChunks" className="text-xs font-normal cursor-pointer">
          {t('search.includeChunks', 'Include document chunks')}
        </Label>
      </div>

      {/* Results limit */}
      <div className="space-y-2">
        <Label className="text-xs">{t('search.maxResults', 'Max results')}</Label>
        <Select
          value={String(options.limit || 10)}
          onValueChange={(value) => onOptionsChange({ limit: parseInt(value) })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
