import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApiKeyStatus } from '@/hooks/useAutoTraining';
import { toast } from '@/hooks/use-toast';

export function useApiKeyGuard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: keyStatus, isLoading } = useApiKeyStatus();

  const hasValidKey = Boolean(keyStatus?.openaiKeySet);

  const guardTraining = (callback: () => void) => {
    if (!hasValidKey) {
      toast({
        variant: 'destructive',
        title: t('training.apiKeyRequired', 'API Key Required'),
        description: t('training.apiKeyRequiredDesc', 'Please add your OpenAI API key in Settings to start training.'),
      });
      navigate('/settings');
      return;
    }
    callback();
  };

  return {
    hasValidKey,
    isLoading,
    guardTraining,
  };
}
