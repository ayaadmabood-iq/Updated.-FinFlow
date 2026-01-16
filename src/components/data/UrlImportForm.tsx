import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAddUrl } from '@/hooks/useDataSources';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UrlImportFormProps {
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

export function UrlImportForm({ projectId }: UrlImportFormProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: addUrl, isPending } = useAddUrl(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError(t('dataSources.urlRequired'));
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError(t('dataSources.invalidUrl'));
      return;
    }

    addUrl(
      { url: trimmedUrl },
      {
        onSuccess: () => {
          setUrl('');
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            className="pl-9"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending || !url.trim()}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('dataSources.addUrl')
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t('dataSources.urlHint')}
      </p>
    </form>
  );
}
