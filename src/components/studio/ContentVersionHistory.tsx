import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  History,
  RotateCcw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useContentVersions } from '@/hooks/useStudio';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContentVersion } from '@/services/studioService';

interface ContentVersionHistoryProps {
  contentId: string;
  onRestore?: (version: ContentVersion) => void;
}

export function ContentVersionHistory({
  contentId,
  onRestore,
}: ContentVersionHistoryProps) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useContentVersions(contentId);
  const [previewVersion, setPreviewVersion] = useState<ContentVersion | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t('studio.versionHistory', 'Version History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t('studio.versionHistory', 'Version History')}
            {versions && (
              <Badge variant="secondary" className="ml-auto">
                {versions.length} {t('studio.versions', 'versions')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!versions || versions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {t('studio.noVersions', 'No versions yet')}
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-3 border rounded-lg ${
                      index === 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            v{version.versionNumber}
                          </span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {t('studio.current', 'Current')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(version.createdAt), 'PPp')}
                        </p>
                        {version.changesSummary && (
                          <p className="text-xs mt-1">{version.changesSummary}</p>
                        )}
                        {version.diffFromPrevious && (
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="flex items-center gap-1 text-green-600">
                              <ArrowUpRight className="h-3 w-3" />
                              +{version.diffFromPrevious.additions}
                            </span>
                            <span className="flex items-center gap-1 text-red-600">
                              <ArrowDownRight className="h-3 w-3" />
                              -{version.diffFromPrevious.deletions}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Percent className="h-3 w-3" />
                              {version.diffFromPrevious.similarity}% similar
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setPreviewVersion(version)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {onRestore && index !== 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onRestore(version)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {t('studio.versionPreview', 'Version {{version}} Preview', {
                version: previewVersion?.versionNumber,
              })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                {previewVersion?.content}
              </pre>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
