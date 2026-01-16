import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApiKeyStatus, useSetApiKey, useRemoveApiKey } from '@/hooks/useAutoTraining';
import { Key, Check, X, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';

export function ApiKeySetup() {
  const { t } = useTranslation();
  const { data: keyStatus, isLoading } = useApiKeyStatus();
  const setApiKeyMutation = useSetApiKey();
  const removeApiKeyMutation = useRemoveApiKey();

  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [editingOpenai, setEditingOpenai] = useState(false);
  const [editingAnthropic, setEditingAnthropic] = useState(false);

  const handleSaveOpenai = async () => {
    if (!openaiKey.trim()) return;
    await setApiKeyMutation.mutateAsync({ provider: 'openai', apiKey: openaiKey.trim() });
    setOpenaiKey('');
    setEditingOpenai(false);
  };

  const handleSaveAnthropic = async () => {
    if (!anthropicKey.trim()) return;
    await setApiKeyMutation.mutateAsync({ provider: 'anthropic', apiKey: anthropicKey.trim() });
    setAnthropicKey('');
    setEditingAnthropic(false);
  };

  const handleRemoveOpenai = async () => {
    await removeApiKeyMutation.mutateAsync('openai');
    setEditingOpenai(false);
  };

  const handleRemoveAnthropic = async () => {
    await removeApiKeyMutation.mutateAsync('anthropic');
    setEditingAnthropic(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t('training.apiKeys', 'API Keys')}
        </CardTitle>
        <CardDescription>
          {t('training.apiKeysDesc', 'Connect your AI platform API keys to enable auto-training')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OpenAI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">OpenAI</Label>
              {keyStatus?.openaiKeySet ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  {t('training.connected', 'Connected')}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-500">
                  {t('training.notSet', 'Not set')}
                </Badge>
              )}
            </div>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {t('training.getKey', 'Get API key')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {(editingOpenai || !keyStatus?.openaiKeySet) && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showOpenaiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSaveOpenai}
                disabled={!openaiKey.trim() || setApiKeyMutation.isPending}
              >
                {setApiKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('common.save', 'Save')
                )}
              </Button>
              {keyStatus?.openaiKeySet && (
                <Button variant="outline" onClick={() => setEditingOpenai(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              )}
            </div>
          )}

          {keyStatus?.openaiKeySet && !editingOpenai && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingOpenai(true)}>
                {t('training.updateKey', 'Update key')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveOpenai}
                disabled={removeApiKeyMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                {removeApiKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                {t('training.removeKey', 'Remove')}
              </Button>
            </div>
          )}
        </div>

        {/* Anthropic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">Anthropic</Label>
              {keyStatus?.anthropicKeySet ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  {t('training.connected', 'Connected')}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-500">
                  {t('training.notSet', 'Not set')}
                </Badge>
              )}
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {t('training.getKey', 'Get API key')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {(editingAnthropic || !keyStatus?.anthropicKeySet) && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAnthropicKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                >
                  {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSaveAnthropic}
                disabled={!anthropicKey.trim() || setApiKeyMutation.isPending}
              >
                {setApiKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('common.save', 'Save')
                )}
              </Button>
              {keyStatus?.anthropicKeySet && (
                <Button variant="outline" onClick={() => setEditingAnthropic(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              )}
            </div>
          )}

          {keyStatus?.anthropicKeySet && !editingAnthropic && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingAnthropic(true)}>
                {t('training.updateKey', 'Update key')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAnthropic}
                disabled={removeApiKeyMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                {removeApiKeyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                {t('training.removeKey', 'Remove')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
