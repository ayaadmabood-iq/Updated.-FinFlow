import { FileText, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import type { SourceCitation as SourceCitationType } from '@/services/chatService';

interface SourceCitationProps {
  source: SourceCitationType;
  projectId: string;
  compact?: boolean;
  onClick?: () => void;
}

export function SourceCitation({ source, projectId, compact = false, onClick }: SourceCitationProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to document detail with chunk highlight
      const url = source.chunkId
        ? `/projects/${projectId}?doc=${source.documentId}&chunk=${source.chunkId}`
        : `/projects/${projectId}?doc=${source.documentId}`;
      navigate(url);
    }
  };

  const relevancePercent = Math.round(source.relevanceScore * 100);
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleClick}
            >
              <FileText className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{source.documentName}</span>
              {source.chunkIndex !== undefined && (
                <span className="text-muted-foreground">#{source.chunkIndex + 1}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px]">
            <p className="text-xs line-clamp-3">{source.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Relevance: {relevancePercent}%
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{source.documentName}</span>
          {source.chunkIndex !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Part {source.chunkIndex + 1}
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="text-xs ml-auto"
            style={{
              borderColor: relevancePercent > 70 
                ? 'hsl(var(--chart-2))' 
                : relevancePercent > 40 
                  ? 'hsl(var(--chart-4))' 
                  : 'hsl(var(--muted-foreground))'
            }}
          >
            {relevancePercent}% match
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {source.content}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

interface SourceCitationsListProps {
  sources: SourceCitationType[];
  projectId: string;
  maxVisible?: number;
}

export function SourceCitationsList({ sources, projectId, maxVisible = 3 }: SourceCitationsListProps) {
  if (!sources || sources.length === 0) return null;

  const visibleSources = sources.slice(0, maxVisible);
  const hiddenCount = sources.length - maxVisible;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Sources ({sources.length})
      </p>
      <div className="space-y-2">
        {visibleSources.map((source, idx) => (
          <SourceCitation
            key={`${source.documentId}-${source.chunkId || idx}`}
            source={source}
            projectId={projectId}
          />
        ))}
        {hiddenCount > 0 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            +{hiddenCount} more sources
          </p>
        )}
      </div>
    </div>
  );
}
