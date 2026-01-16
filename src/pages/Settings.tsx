// Settings page
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { DemoDataSettings } from '@/components/settings/DemoDataSettings';
import { ApiKeySetup } from '@/components/training/ApiKeySetup';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name });
      toast({ title: t('common.success'), description: t('settings.profileDescription') });
    } catch {
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('settings.title')} description={t('settings.description')}>
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile')}</CardTitle>
            <CardDescription>{t('settings.profileDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? t('common.loading') : t('common.save')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.theme')}</CardTitle>
            <CardDescription>{t('settings.themeDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('settings.light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                  <SelectItem value="system">{t('settings.system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <ApiKeySetup />

        {/* Demo Data Settings */}
        {user && <DemoDataSettings userId={user.id} />}
      </div>
    </DashboardLayout>
  );
}
