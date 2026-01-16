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
  ExternalLink,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DataSource } from '@/services/dataSourceService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface DataSourceCardProps {
  source: DataSource;
  onDelete: (id: string) => void;
  onView?: (source: DataSource) => void;
}

function getTypeIcon(source: DataSource) {
  if (source.source_type === 'url') {
    return <LinkIcon className="h-8 w-8 text-primary" />;
  }
  if (source.source_type === 'text') {
    return <AlignLeft className="h-8 w-8 text-muted-foreground" />;
  }
  // File type
  const mime = source.mime_type || '';
  if (mime.startsWith('image/')) return <Image className="h-8 w-8 text-success" />;
  if (mime.startsWith('audio/')) return <Music className="h-8 w-8 text-purple-500" />;
  if (mime.startsWith('video/')) return <Video className="h-8 w-8 text-orange-500" />;
  if (mime === 'application/pdf') return <FileText className="h-8 w-8 text-destructive" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function getStatusBadge(status: DataSource['status'], t: (key: string) => string) {
  const variants: Record<DataSource['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    pending: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20' },
    processing: { variant: 'secondary', className: 'bg-primary/10 text-primary border-primary/20' },
    completed: { variant: 'secondary', className: 'bg-success/10 text-success border-success/20' },
    failed: { variant: 'destructive', className: '' },
  };
  
  return (
    <Badge variant={variants[status].variant} className={variants[status].className}>
      {t(`dataSources.status.${status}`)}
    </Badge>
  );
}

export function DataSourceCard({ source, onDelete, onView }: DataSourceCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getTypeIcon(source)}
            <div>
              <CardTitle className="text-sm font-medium truncate max-w-[180px]">
                {source.name}
              </CardTitle>
              <CardDescription className="text-xs capitalize">
                {source.source_type}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {source.source_type === 'url' && source.original_url && (
                <DropdownMenuItem onClick={() => window.open(source.original_url!, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('dataSources.openUrl')}
                </DropdownMenuItem>
              )}
              {onView && source.raw_content && (
                <DropdownMenuItem onClick={() => onView(source)}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('dataSources.viewContent')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(source.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {getStatusBadge(source.status, t)}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
