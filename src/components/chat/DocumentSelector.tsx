import { useState } from 'react';
import { FileText, Search, Check, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  mimeType: string;
  status: string;
}

interface DocumentSelectorProps {
  documents: Document[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function DocumentSelector({
  documents,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: DocumentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const processedDocs = documents.filter(d => d.status === 'processed' || d.status === 'ready');
  
  const filteredDocs = processedDocs.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (docId: string) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter(id => id !== docId));
    } else {
      onSelectionChange([...selectedIds, docId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === processedDocs.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(processedDocs.map(d => d.id));
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === processedDocs.length && processedDocs.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || processedDocs.length === 0}
          className={cn(
            'gap-2',
            selectedCount > 0 && 'border-primary'
          )}
        >
          <Filter className="h-4 w-4" />
          {selectedCount === 0 ? (
            <span>All Documents</span>
          ) : (
            <span>{selectedCount} Selected</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="p-2 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 text-xs"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-7 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-1">
            {filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No processed documents found
              </p>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggle(doc.id)}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(doc.id)}
                      className="pointer-events-none"
                    />
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{doc.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {selectedCount > 0 && (
          <div className="p-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Chat will use {selectedCount} document{selectedCount > 1 ? 's' : ''} for context
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
