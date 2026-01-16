import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Key, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ApiKeyRequiredBannerProps {
  show: boolean;
}

export function ApiKeyRequiredBanner({ show }: ApiKeyRequiredBannerProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <Key className="h-4 w-4" />
      <AlertTitle>{t('training.setupRequired', 'Setup Required')}</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
        <span className="flex-1">
          {t('training.apiKeyRequiredDesc', 'Please add your OpenAI API key in Settings to start training.')}
        </span>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/settings">
            {t('training.goToSettings', 'Go to Settings')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
