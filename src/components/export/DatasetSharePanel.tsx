import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingDatasets } from '@/hooks/useTraining';
import { toast } from '@/hooks/use-toast';
import {
  Share2,
  Link,
  Copy,
  Globe,
  Lock,
  Users,
  Loader2,
  FileJson,
  ExternalLink,
} from 'lucide-react';

interface DatasetSharePanelProps {
  projectId: string;
}

interface ShareSettings {
  isPublic: boolean;
  allowDownload: boolean;
  expiresIn: 'never' | '1day' | '7days' | '30days';
}

export function DatasetSharePanel({ projectId }: DatasetSharePanelProps) {
  const { t } = useTranslation();
  const { data: datasets, isLoading } = useTrainingDatasets(projectId);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    allowDownload: true,
    expiresIn: '7days',
  });
  const [shareLink, setShareLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const readyDatasets = datasets?.filter(d => d.status === 'ready' || d.status === 'completed') || [];

  const handleGenerateLink = async () => {
    if (!selectedDatasetId) return;

    setIsGenerating(true);
    try {
      // Simulate generating a share link (in production this would call an edge function)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const baseUrl = window.location.origin;
      const shareId = `share_${selectedDatasetId.slice(0, 8)}_${Date.now().toString(36)}`;
      const generatedLink = `${baseUrl}/shared/dataset/${shareId}`;
      
      setShareLink(generatedLink);
      
      toast({
        title: t('export.linkGenerated', 'Share link generated'),
        description: t('export.linkDesc', 'Your dataset can now be shared'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('export.linkFailed', 'Failed to generate link'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    
    await navigator.clipboard.writeText(shareLink);
    toast({
      title: t('export.linkCopied', 'Link copied'),
      description: t('export.linkCopiedDesc', 'Share link copied to clipboard'),
    });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {t('export.shareDataset', 'Share Dataset')}
        </CardTitle>
        <CardDescription>
          {t('export.shareDesc', 'Create shareable links for your training datasets')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {readyDatasets.length === 0 ? (
          <div className="text-center py-8">
            <FileJson className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('export.noDatasets', 'No Datasets Available')}
            </h3>
            <p className="text-muted-foreground">
              {t('export.noDatasetsDesc', 'Generate a training dataset first to share it.')}
            </p>
          </div>
        ) : (
          <>
            {/* Dataset Selection */}
            <div className="space-y-2">
              <Label>{t('export.selectDataset', 'Select Dataset')}</Label>
              <Select 
                value={selectedDatasetId} 
                onValueChange={(v) => {
                  setSelectedDatasetId(v);
                  setShareLink('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('export.choosePlaceholder', 'Choose a dataset to share')} />
                </SelectTrigger>
                <SelectContent>
                  {readyDatasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <span>{dataset.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dataset.totalPairs} pairs
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Share Settings */}
            <div className="space-y-4">
              <Label>{t('export.shareSettings', 'Share Settings')}</Label>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {shareSettings.isPublic ? (
                    <Globe className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {shareSettings.isPublic 
                        ? t('export.publicAccess', 'Public Access')
                        : t('export.privateAccess', 'Private Access')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shareSettings.isPublic
                        ? t('export.publicDesc', 'Anyone with the link can view')
                        : t('export.privateDesc', 'Only team members can access')
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={shareSettings.isPublic}
                  onCheckedChange={(checked) => 
                    setShareSettings(prev => ({ ...prev, isPublic: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('export.allowDownload', 'Allow Download')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('export.allowDownloadDesc', 'Viewers can download the JSONL file')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={shareSettings.allowDownload}
                  onCheckedChange={(checked) => 
                    setShareSettings(prev => ({ ...prev, allowDownload: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t('export.linkExpiry', 'Link Expiry')}</Label>
                <Select 
                  value={shareSettings.expiresIn} 
                  onValueChange={(v) => 
                    setShareSettings(prev => ({ ...prev, expiresIn: v as ShareSettings['expiresIn'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t('export.never', 'Never')}</SelectItem>
                    <SelectItem value="1day">{t('export.oneDay', '1 day')}</SelectItem>
                    <SelectItem value="7days">{t('export.sevenDays', '7 days')}</SelectItem>
                    <SelectItem value="30days">{t('export.thirtyDays', '30 days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generate Link */}
            <Button
              onClick={handleGenerateLink}
              disabled={!selectedDatasetId || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              {t('export.generateLink', 'Generate Share Link')}
            </Button>

            {/* Share Link Display */}
            {shareLink && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>{t('export.shareLink', 'Share Link')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={shareLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {shareSettings.expiresIn === 'never'
                    ? t('export.linkNeverExpires', 'This link never expires')
                    : t('export.linkExpires', 'This link expires in {{days}}', { 
                        days: shareSettings.expiresIn 
                      })
                  }
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
