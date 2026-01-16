import { FileText, FileType, File, Image, Music, Video, ExternalLink, Sparkles, FileSearch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchResult } from '@/services/searchService';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sanitizeSearchSnippet } from '@/lib/sanitize';

interface SearchResultCardProps {
  result: SearchResult;
  query?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.includes('pdf')) return FileType;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  return File;
}

function formatSimilarity(similarity: number): string {
  return `${Math.round(similarity * 100)}%`;
}

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.7) return 'bg-green-500';
  if (similarity >= 0.5) return 'bg-yellow-500';
  if (similarity >= 0.3) return 'bg-orange-500';
  return 'bg-red-500';
}

// Render matched snippet with HTML highlights
function renderSnippet(snippet: string | null, fallback: string): React.ReactNode {
  if (!snippet) {
    return <span className="line-clamp-3">{fallback?.slice(0, 200)}</span>;
  }
  
  // The database function returns snippets with <mark> tags
  // Sanitize first, then add styling classes to mark tags
  const sanitized = sanitizeSearchSnippet(snippet);
  const styled = sanitized.replace(/<mark>/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">');
  
  return (
    <span 
      className="line-clamp-3"
      dangerouslySetInnerHTML={{ __html: styled }} 
    />
  );
}

export function SearchResultCard({ result, query = '' }: SearchResultCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = getFileIcon(result.mimeType);

  const handleOpenDocument = () => {
    if (result.type === 'document') {
      navigate(`/projects/${result.projectId}?document=${result.id}`);
    } else {
      navigate(`/projects/${result.projectId}?document=${result.documentId}&chunk=${result.chunkIndex}`);
    }
  };

  const hasSemanticScore = result.semanticScore > 0;
  const hasFulltextScore = result.fulltextScore > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium truncate">
                {result.type === 'document' ? result.name : result.documentName}
              </h4>
              <Badge variant="secondary" className="flex-shrink-0">
                {result.type === 'chunk' ? t('search.chunk', 'Chunk') : t('search.document', 'Document')}
              </Badge>
              {result.language && (
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  {result.language.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground mb-2">
              {result.type === 'document' && (
                renderSnippet(result.matchedSnippet, result.summary || '')
              )}
              {result.type === 'chunk' && (
                renderSnippet(result.matchedSnippet, result.content)
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {/* Combined score */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${getSimilarityColor(result.similarity)}`} />
                      <span>{t('search.relevance', 'Relevance')}: {formatSimilarity(result.similarity)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-xs">
                      {hasSemanticScore && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>Semantic: {formatSimilarity(result.semanticScore)}</span>
                        </div>
                      )}
                      {hasFulltextScore && (
                        <div className="flex items-center gap-1">
                          <FileSearch className="h-3 w-3" />
                          <span>Full-text: {formatSimilarity(Math.min(result.fulltextScore, 1))}</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Search type badges */}
              {hasSemanticScore && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
              {hasFulltextScore && (
                <Badge variant="outline" className="text-xs gap-1">
                  <FileSearch className="h-3 w-3" />
                  Text
                </Badge>
              )}

              {result.type === 'chunk' && (
                <span>
                  {t('search.chunkIndex', 'Part')} #{result.chunkIndex + 1}
                </span>
              )}
              
              <span className="truncate">{result.mimeType.split('/').pop()}</span>
              
              {result.createdAt && (
                <span className="truncate">
                  {format(new Date(result.createdAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenDocument}
            className="flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            {t('search.openDocument', 'Open')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
