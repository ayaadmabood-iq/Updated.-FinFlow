import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentSelectorProps {
  projectId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
}

export function ReportDocumentSelector({
  projectId,
  selectedIds,
  onSelectionChange,
  maxSelection,
}: DocumentSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: docsData, isLoading } = useDocuments(projectId, 1, 100);
  
  const documents = useMemo(() => {
    if (!docsData?.data) return [];
    
    let filtered = docsData.data.filter(doc => doc.status === 'ready');
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.originalName.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [docsData?.data, searchQuery]);

  const toggleDocument = (docId: string) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter(id => id !== docId));
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) {
        return;
      }
      onSelectionChange([...selectedIds, docId]);
    }
  };

  const selectAll = () => {
    const allIds = documents.map(d => d.id);
    if (maxSelection) {
      onSelectionChange(allIds.slice(0, maxSelection));
    } else {
      onSelectionChange(allIds);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t('reports.selectedDocuments', 'Selected Documents')}
          </span>
          <Badge variant="secondary">
            {selectedIds.length} / {documents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            disabled={documents.length === 0}
          >
            <Check className="h-4 w-4 me-1" />
            {t('common.selectAll', 'Select All')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
          >
            <X className="h-4 w-4 me-1" />
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
          isRtl ? "right-3" : "left-3"
        )} />
        <Input
          placeholder={t('documents.search', 'Search documents...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(isRtl ? "pr-10" : "pl-10")}
        />
      </div>

      <ScrollArea className="h-[300px] border rounded-lg">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? t('common.noResults', 'No results found')
                : t('documents.noDocuments', 'No processed documents available')
              }
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.id);
              const isDisabled = !isSelected && maxSelection && selectedIds.length >= maxSelection;
              
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isDisabled && toggleDocument(doc.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => toggleDocument(doc.id)}
                  />
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.originalName}
                    </p>
                  </div>
                  {doc.language && (
                    <Badge variant="outline" className="text-xs">
                      {doc.language.toUpperCase()}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {maxSelection && (
        <p className="text-xs text-muted-foreground">
          {t('reports.maxSelection', 'You can select up to {{max}} documents', { max: maxSelection })}
        </p>
      )}
    </div>
  );
}
