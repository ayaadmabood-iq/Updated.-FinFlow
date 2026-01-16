import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChunks } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AddToDatasetDialog } from '@/components/training/AddToDatasetDialog';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Layers,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface ChunkViewerProps {
  documentId: string;
  documentName?: string;
  projectId?: string;
}

export function ChunkViewer({ documentId, documentName, projectId }: ChunkViewerProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [showAddToDatasetDialog, setShowAddToDatasetDialog] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const pageSize = 10;

  const { data: chunksData, isLoading, error } = useChunks(documentId, page, pageSize);

  const handleToggleChunk = (chunkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedChunkIds.includes(chunkId)) {
      setSelectedChunkIds(selectedChunkIds.filter(id => id !== chunkId));
    } else {
      setSelectedChunkIds([...selectedChunkIds, chunkId]);
    }
  };

  const handleSelectAll = () => {
    if (!chunksData?.data) return;
    const allIds = chunksData.data.map(c => c.id);
    setSelectedChunkIds([...new Set([...selectedChunkIds, ...allIds])]);
  };

  const handleDeselectAll = () => {
    if (!chunksData?.data) return;
    const pageIds = new Set(chunksData.data.map(c => c.id));
    setSelectedChunkIds(selectedChunkIds.filter(id => !pageIds.has(id)));
  };

  const handleAddToDataset = () => {
    if (selectedChunkIds.length > 0) {
      setShowAddToDatasetDialog(true);
    }
  };

  const handleDatasetAdded = () => {
    setSelectedChunkIds([]);
    setSelectionMode(false);
    setShowAddToDatasetDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{t('common.error')}: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chunksData || chunksData.data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('chunks.noChunks')}</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {t('chunks.noChunksDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{documentName || t('documents.title')}</span>
          <Badge variant="secondary">
            {chunksData.total} {t('chunks.title').toLowerCase()}
          </Badge>
        </div>
        
        {/* Training Actions */}
        {projectId && (
          <div className="flex items-center gap-2">
            {!selectionMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
              >
                <Sparkles className="h-4 w-4 me-1" />
                {t('training.selectForTraining', 'Select for Training')}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  <Check className="h-3 w-3 me-1" />
                  {t('common.selectAll', 'Select All')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  <X className="h-3 w-3 me-1" />
                  {t('common.deselectAll', 'Clear')}
                </Button>
                {selectedChunkIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAddToDataset}
                    className="gap-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('training.addToDataset', 'Add {{count}} to Dataset', { count: selectedChunkIds.length })}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedChunkIds([]);
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selection Info */}
      {selectionMode && selectedChunkIds.length > 0 && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <span className="font-medium">{selectedChunkIds.length}</span> {t('training.chunksSelected', 'chunks selected for training dataset')}
        </div>
      )}

      {/* Chunks List */}
      <ScrollArea className="h-[500px] pe-4">
        <div className="space-y-3">
          {chunksData.data.map((chunk) => {
            const isSelected = selectedChunkIds.includes(chunk.id);
            
            return (
              <Card
                key={chunk.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  expandedChunk === chunk.id ? 'ring-2 ring-primary' : ''
                } ${selectionMode && isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => {
                  if (selectionMode) {
                    handleToggleChunk(chunk.id, { stopPropagation: () => {} } as React.MouseEvent);
                  } else {
                    setExpandedChunk(expandedChunk === chunk.id ? null : chunk.id);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectionMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleChunk(chunk.id, { stopPropagation: () => {} } as React.MouseEvent)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">{t('chunks.chunk')} {chunk.index + 1}</CardTitle>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {chunk.content.length} {t('chunks.chars')}
                    </Badge>
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
                  {expandedChunk !== chunk.id && chunk.content.length > 200 && !selectionMode && (
                    <Button variant="link" className="px-0 h-auto text-xs mt-1">
                      {t('chunks.clickToExpand')}
                    </Button>
                  )}
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
            {t('common.page')} {page} {t('common.of')} {chunksData.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(chunksData.totalPages, p + 1))}
              disabled={page === chunksData.totalPages}
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add to Dataset Dialog */}
      {projectId && (
        <AddToDatasetDialog
          open={showAddToDatasetDialog}
          onOpenChange={setShowAddToDatasetDialog}
          projectId={projectId}
          chunkIds={selectedChunkIds}
          documentId={documentId}
          onSuccess={handleDatasetAdded}
        />
      )}
    </div>
  );
}
