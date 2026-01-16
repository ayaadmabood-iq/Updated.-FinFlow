import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon, Loader2, CheckCircle } from 'lucide-react';
import { useBulkAddUrls } from '@/hooks/useDataSources';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkUrlImportProps {
  projectId: string;
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function BulkUrlImport({ projectId }: BulkUrlImportProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ created: number; total: number } | null>(null);

  const { mutate: bulkAdd, isPending } = useBulkAddUrls(projectId);

  const urlStats = useMemo(() => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const validUrls = lines.filter(isValidUrl);
    return {
      total: lines.length,
      valid: validUrls.length,
      invalid: lines.length - validUrls.length,
    };
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const urls = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && isValidUrl(line));

    if (urls.length === 0) return;

    bulkAdd(urls, {
      onSuccess: (data) => {
        setText('');
        setResult({
          created: data.summary.created,
          total: data.summary.total_requested,
        });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Textarea
          placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          className="min-h-[150px] font-mono text-sm"
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {urlStats.total > 0 && (
            <>
              <Badge variant="outline" className="gap-1">
                <LinkIcon className="h-3 w-3" />
                {urlStats.valid} {t('dataSources.validUrls')}
              </Badge>
              {urlStats.invalid > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {urlStats.invalid} {t('dataSources.invalidUrls')}
                </Badge>
              )}
            </>
          )}
        </div>

        <Button type="submit" disabled={isPending || urlStats.valid === 0}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('dataSources.importing')}
            </>
          ) : (
            t('dataSources.importAll')
          )}
        </Button>
      </div>

      {result && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          {t('dataSources.importSuccess', { created: result.created, total: result.total })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('dataSources.bulkHint')}
      </p>
    </form>
  );
}
