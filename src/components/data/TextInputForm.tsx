import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlignLeft, Loader2 } from 'lucide-react';
import { useAddText } from '@/hooks/useDataSources';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TextInputFormProps {
  projectId: string;
}

export function TextInputForm({ projectId }: TextInputFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: addText, isPending } = useAddText(projectId);

  const characterCount = content.length;
  const isValid = name.trim().length > 0 && content.length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('dataSources.nameRequired'));
      return;
    }

    if (content.length < 10) {
      setError(t('dataSources.textTooShort'));
      return;
    }

    addText(
      { name: name.trim(), content },
      {
        onSuccess: () => {
          setName('');
          setContent('');
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text-name">{t('dataSources.sourceName')}</Label>
        <div className="relative">
          <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="text-name"
            placeholder={t('dataSources.sourceNamePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="pl-9"
            maxLength={255}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text-content">{t('dataSources.textContent')}</Label>
        <Textarea
          id="text-content"
          placeholder={t('dataSources.textPlaceholder')}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          className="min-h-[200px]"
          disabled={isPending}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {characterCount < 10 
              ? t('dataSources.minCharacters', { count: 10 - characterCount }) 
              : t('dataSources.characters', { count: characterCount })}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={isPending || !isValid}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('common.loading')}
          </>
        ) : (
          t('dataSources.addText')
        )}
      </Button>
    </form>
  );
}
