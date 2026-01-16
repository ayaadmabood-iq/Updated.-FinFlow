import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useChunks } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Hash,
  Layers,
  Filter,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ChunkSelectorProps {
  documentId: string;
  documentName?: string;
  selectedChunkIds: string[];
  onSelectionChange: (chunkIds: string[]) => void;
  onAddToDataset?: (chunkIds: string[]) => void;
}

interface ChunkFilters {
  minLength: number;
  maxLength: number;
  minQualityScore: number;
  excludeDuplicates: boolean;
  excludeHeaders: boolean;
}

const DEFAULT_FILTERS: ChunkFilters = {
  minLength: 100,
  maxLength: 10000,
  minQualityScore: 0,
  excludeDuplicates: true,
  excludeHeaders: true,
};

// Heuristic: detect if chunk is likely a header/footer/boilerplate
function isLikelyNoise(content: string): boolean {
  const trimmed = content.trim();
  const lines = trimmed.split('\n').length;
  const words = trimmed.split(/\s+/).length;
  
  // Very short chunks with few words
  if (words < 10) return true;
  
  // Common header/footer patterns
  const noisePatterns = [
    /^page\s+\d+/i,
    /^copyright/i,
    /^\d+\s*$/,
    /^table of contents/i,
    /^chapter\s+\d+/i,
    /^section\s+\d+/i,
    /all rights reserved/i,
    /confidential/i,
  ];
  
  return noisePatterns.some(pattern => pattern.test(trimmed));
}

export function ChunkSelector({
  documentId,
  documentName,
  selectedChunkIds,
  onSelectionChange,
  onAddToDataset,
}: ChunkSelectorProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ChunkFilters>(DEFAULT_FILTERS);
  const pageSize = 10;

  const { data: chunksData, isLoading, error } = useChunks(documentId, page, pageSize);

  // Apply filters to chunks
  const filteredChunks = useMemo(() => {
    if (!chunksData?.data) return [];
    
    return chunksData.data.filter(chunk => {
      // Length filters
      if (chunk.content.length < filters.minLength) return false;
      if (chunk.content.length > filters.maxLength) return false;
      
      // Quality score filter (if available)
      const qualityScore = (chunk as unknown as { qualityScore?: number }).qualityScore || 0;
      if (qualityScore < filters.minQualityScore) return false;
      
      // Duplicate filter
      if (filters.excludeDuplicates && (chunk as unknown as { isDuplicate?: boolean }).isDuplicate) {
        return false;
      }
      
      // Header/boilerplate filter
      if (filters.excludeHeaders && isLikelyNoise(chunk.content)) {
        return false;
      }
      
      return true;
    });
  }, [chunksData?.data, filters]);

  const handleToggleChunk = (chunkId: string) => {
    if (selectedChunkIds.includes(chunkId)) {
      onSelectionChange(selectedChunkIds.filter(id => id !== chunkId));
    } else {
      onSelectionChange([...selectedChunkIds, chunkId]);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredChunks.map(c => c.id);
    onSelectionChange([...new Set([...selectedChunkIds, ...allIds])]);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredChunks.map(c => c.id));
    onSelectionChange(selectedChunkIds.filter(id => !filteredIds.has(id)));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chunksData || chunksData.data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('chunks.noChunks', 'No Chunks')}</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {t('chunks.noChunksDescription', 'Process this document to generate chunks.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedCount = selectedChunkIds.length;
  const filteredCount = filteredChunks.length;

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{documentName || t('documents.title', 'Document')}</span>
          <Badge variant="secondary">{chunksData.total} chunks</Badge>
          {filteredCount < chunksData.total && (
            <Badge variant="outline">{filteredCount} filtered</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 me-1" />
            {t('training.filters', 'Filters')}
          </Button>
          
          {selectedCount > 0 && onAddToDataset && (
            <Button
              size="sm"
              onClick={() => onAddToDataset(selectedChunkIds)}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              {t('training.addToDataset', 'Add {{count}} to Dataset', { count: selectedCount })}
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t('training.dataCleaningFilters', 'Data Cleaning Filters')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('training.minLength', 'Min Length (chars)')}</Label>
                <Input
                  type="number"
                  value={filters.minLength}
                  onChange={(e) => setFilters(f => ({ ...f, minLength: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">{t('training.maxLength', 'Max Length (chars)')}</Label>
                <Input
                  type="number"
                  value={filters.maxLength}
                  onChange={(e) => setFilters(f => ({ ...f, maxLength: parseInt(e.target.value) || 10000 }))}
                  min={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">{t('training.minQuality', 'Min Quality Score')}</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[filters.minQualityScore]}
                    onValueChange={([v]) => setFilters(f => ({ ...f, minQualityScore: v }))}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">{filters.minQualityScore}%</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excludeDuplicates"
                    checked={filters.excludeDuplicates}
                    onCheckedChange={(checked) => 
                      setFilters(f => ({ ...f, excludeDuplicates: !!checked }))
                    }
                  />
                  <Label htmlFor="excludeDuplicates" className="text-xs cursor-pointer">
                    {t('training.excludeDuplicates', 'Exclude Duplicates')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excludeHeaders"
                    checked={filters.excludeHeaders}
                    onCheckedChange={(checked) => 
                      setFilters(f => ({ ...f, excludeHeaders: !!checked }))
                    }
                  />
                  <Label htmlFor="excludeHeaders" className="text-xs cursor-pointer">
                    {t('training.excludeNoise', 'Exclude Headers/Footers')}
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Selection Controls */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={handleSelectAll}>
          <Check className="h-3 w-3 me-1" />
          {t('common.selectAll', 'Select All')}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
          <X className="h-3 w-3 me-1" />
          {t('common.deselectAll', 'Deselect All')}
        </Button>
        {selectedCount > 0 && (
          <span className="text-muted-foreground">
            {selectedCount} {t('training.selected', 'selected')}
          </span>
        )}
      </div>

      {/* Chunks List */}
      <ScrollArea className="h-[400px] pe-4">
        <div className="space-y-3">
          {filteredChunks.map((chunk) => {
            const isSelected = selectedChunkIds.includes(chunk.id);
            const isNoise = isLikelyNoise(chunk.content);
            
            return (
              <Card
                key={chunk.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                } ${isNoise ? 'opacity-60' : ''}`}
                onClick={() => setExpandedChunk(expandedChunk === chunk.id ? null : chunk.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleChunk(chunk.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Chunk {chunk.index + 1}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {chunk.content.length} chars
                      </Badge>
                      {isNoise && (
                        <Badge variant="secondary" className="text-xs">
                          {t('training.noise', 'Noise')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                      expandedChunk === chunk.id ? '' : 'line-clamp-3'
                    }`}
                  >
                    {chunk.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {chunksData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t('common.page', 'Page')} {page} {t('common.of', 'of')} {chunksData.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(chunksData.totalPages, p + 1))}
              disabled={page === chunksData.totalPages}
            >
              {t('common.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
