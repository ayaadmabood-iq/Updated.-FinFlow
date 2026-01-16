import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Link as LinkIcon, 
  AlignLeft, 
  Trash2, 
  File, 
  Image, 
  Music, 
  Video,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useDataSources, useDeleteDataSource, useFetchUrlContent } from '@/hooks/useDataSources';
import { DataSource } from '@/services/dataSourceService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface DataSourceListProps {
  projectId: string;
}

function getTypeIcon(source: DataSource) {
  if (source.source_type === 'url') {
    return <LinkIcon className="h-4 w-4 text-primary" />;
  }
  if (source.source_type === 'text') {
    return <AlignLeft className="h-4 w-4 text-muted-foreground" />;
  }
  // File type
  const mime = source.mime_type || '';
  if (mime.startsWith('image/')) return <Image className="h-4 w-4 text-success" />;
  if (mime.startsWith('audio/')) return <Music className="h-4 w-4 text-purple-500" />;
  if (mime.startsWith('video/')) return <Video className="h-4 w-4 text-orange-500" />;
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function getStatusBadge(status: DataSource['status'], t: (key: string) => string) {
  const statusConfig: Record<DataSource['status'], { className: string; label: string }> = {
    pending: { 
      className: 'bg-muted text-muted-foreground border-0', 
      label: 'Pending' 
    },
    processing: { 
      className: 'bg-[#FEF9C3] text-[#854D0E] border-0', 
      label: 'Processing' 
    },
    completed: { 
      className: 'bg-success text-success-foreground border-0', 
      label: 'Ready' 
    },
    failed: { 
      className: 'bg-destructive text-destructive-foreground border-0', 
      label: 'Failed' 
    },
  };
  
  const config = statusConfig[status];
  return (
    <Badge className={config.className}>
      {status === 'processing' && (
        <Loader2 className="h-3 w-3 me-1 animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DataSourceList({ projectId }: DataSourceListProps) {
  const { t } = useTranslation();
  const { data: sources, isLoading } = useDataSources(projectId);
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteDataSource(projectId);
  const { mutate: fetchContent, isPending: isFetching } = useFetchUrlContent(projectId);
  const [viewSource, setViewSource] = useState<DataSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<DataSource | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <File className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-foreground mb-1">{t('dataSources.empty')}</h3>
        <p className="text-sm text-muted-foreground">{t('dataSources.emptyHint')}</p>
      </div>
    );
  }

  const handleDelete = (source: DataSource) => {
    setSourceToDelete(source);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sourceToDelete) {
      deleteSource(sourceToDelete.id);
      setDeleteDialogOpen(false);
      setSourceToDelete(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="text-muted-foreground font-medium text-sm">Filename</TableHead>
            <TableHead className="text-muted-foreground font-medium text-sm">Size</TableHead>
            <TableHead className="text-muted-foreground font-medium text-sm">Status</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium text-sm w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={source.id} className="border-b border-border/50 hover:bg-muted/30">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  {getTypeIcon(source)}
                  <span className="font-medium truncate max-w-[300px]">{source.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground py-4">
                {source.source_type === 'file' 
                  ? formatSize(source.file_size)
                  : source.raw_content 
                    ? formatSize(source.raw_content.length)
                    : '-'}
              </TableCell>
              <TableCell className="py-4">{getStatusBadge(source.status, t)}</TableCell>
              <TableCell className="text-right py-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {source.source_type === 'url' && source.original_url && (
                      <DropdownMenuItem onClick={() => window.open(source.original_url!, '_blank')}>
                        <ExternalLink className="h-4 w-4 me-2" />
                        Open URL
                      </DropdownMenuItem>
                    )}
                    
                    {source.source_type === 'url' && source.status === 'pending' && (
                      <DropdownMenuItem onClick={() => fetchContent(source.id)} disabled={isFetching}>
                        <RefreshCw className="h-4 w-4 me-2" />
                        Fetch Content
                      </DropdownMenuItem>
                    )}

                    {(source.raw_content || source.source_type === 'text') && (
                      <DropdownMenuItem onClick={() => setViewSource(source)}>
                        <Eye className="h-4 w-4 me-2" />
                        View Content
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem 
                      onClick={() => handleDelete(source)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dataSources.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dataSources.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Content Dialog */}
      <Dialog open={!!viewSource} onOpenChange={() => setViewSource(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewSource?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-md">
              {viewSource?.raw_content || t('dataSources.noContent')}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
