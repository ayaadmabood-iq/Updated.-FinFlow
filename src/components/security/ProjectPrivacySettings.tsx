// Project Privacy Settings - Configure data residency, AI providers, and privacy controls

import { useProjectPrivacySettings, useUpdateProjectPrivacySettings, type PIICategory } from '@/hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Globe, 
  Server, 
  Cpu, 
  Eye, 
  FileText, 
  Clock,
  CheckCircle,
  Lock,
  MapPin
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface ProjectPrivacySettingsProps {
  projectId: string;
}

const AI_PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (Default)', region: 'auto' },
  { value: 'openai', label: 'OpenAI', region: 'us' },
  { value: 'azure_openai', label: 'Azure OpenAI', region: 'configurable' },
  { value: 'anthropic', label: 'Anthropic Claude', region: 'us' },
  { value: 'google', label: 'Google Gemini', region: 'global' },
];

const REGIONS = [
  { value: 'auto', label: 'Auto (Best Performance)' },
  { value: 'us', label: 'United States' },
  { value: 'eu', label: 'European Union' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'asia', label: 'Asia Pacific' },
];

const PII_CATEGORIES = [
  { value: 'name', label: 'Names' },
  { value: 'email', label: 'Email Addresses' },
  { value: 'phone', label: 'Phone Numbers' },
  { value: 'ssn', label: 'Social Security Numbers' },
  { value: 'credit_card', label: 'Credit Card Numbers' },
  { value: 'address', label: 'Addresses' },
  { value: 'date_of_birth', label: 'Dates of Birth' },
  { value: 'ip_address', label: 'IP Addresses' },
  { value: 'medical', label: 'Medical Information' },
  { value: 'financial', label: 'Financial Data' },
];

export function ProjectPrivacySettings({ projectId }: ProjectPrivacySettingsProps) {
  const { data: settings, isLoading } = useProjectPrivacySettings(projectId);
  const updateSettings = useUpdateProjectPrivacySettings();

  const [localSettings, setLocalSettings] = useState<{
    piiMaskingEnabled: boolean;
    piiCategoriesToMask: PIICategory[];
    localProcessingOnly: boolean;
    aiProvider: string;
    aiProviderRegion: string;
    dataResidencyRegion: string;
    allowExternalAiCalls: boolean;
    requireConsentForAi: boolean;
    autoExpireDocumentsDays: number | undefined;
    watermarkExports: boolean;
    watermarkPreviews: boolean;
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
  }>({
    piiMaskingEnabled: true,
    piiCategoriesToMask: ['name', 'email', 'phone', 'ssn', 'credit_card'] as PIICategory[],
    localProcessingOnly: false,
    aiProvider: 'lovable',
    aiProviderRegion: 'auto',
    dataResidencyRegion: 'auto',
    allowExternalAiCalls: true,
    requireConsentForAi: false,
    autoExpireDocumentsDays: undefined,
    watermarkExports: true,
    watermarkPreviews: false,
    gdprCompliant: false,
    hipaaCompliant: false,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        piiMaskingEnabled: settings.piiMaskingEnabled,
        piiCategoriesToMask: settings.piiCategoriesToMask,
        localProcessingOnly: settings.localProcessingOnly,
        aiProvider: settings.aiProvider,
        aiProviderRegion: settings.aiProviderRegion,
        dataResidencyRegion: settings.dataResidencyRegion,
        allowExternalAiCalls: settings.allowExternalAiCalls,
        requireConsentForAi: settings.requireConsentForAi,
        autoExpireDocumentsDays: settings.autoExpireDocumentsDays,
        watermarkExports: settings.watermarkExports,
        watermarkPreviews: settings.watermarkPreviews,
        gdprCompliant: settings.gdprCompliant,
        hipaaCompliant: settings.hipaaCompliant,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({ projectId, settings: localSettings });
  };

  const togglePiiCategory = (category: PIICategory) => {
    setLocalSettings(prev => ({
      ...prev,
      piiCategoriesToMask: prev.piiCategoriesToMask.includes(category)
        ? prev.piiCategoriesToMask.filter(c => c !== category)
        : [...prev.piiCategoriesToMask, category],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PII Masking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            PII Masking (Privacy Shield)
          </CardTitle>
          <CardDescription>
            Automatically detect and mask sensitive information before sending to AI providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable PII Masking</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and redact PII before external AI processing
              </p>
            </div>
            <Switch
              checked={localSettings.piiMaskingEnabled}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, piiMaskingEnabled: checked }))}
            />
          </div>

          {localSettings.piiMaskingEnabled && (
            <>
              <Separator />
              <div>
                <Label className="text-sm mb-2 block">PII Categories to Mask</Label>
                <div className="flex flex-wrap gap-2">
                  {PII_CATEGORIES.map((category) => (
                    <Badge
                      key={category.value}
                      variant={localSettings.piiCategoriesToMask.includes(category.value as PIICategory) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePiiCategory(category.value as PIICategory)}
                    >
                      {localSettings.piiCategoriesToMask.includes(category.value as PIICategory) && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Residency & AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Data Residency & AI Provider
          </CardTitle>
          <CardDescription>
            Control where your data is processed and which AI providers are used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2 block">AI Provider</Label>
              <Select
                value={localSettings.aiProvider}
                onValueChange={(value) => setLocalSettings(prev => ({ ...prev, aiProvider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        {provider.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Data Residency Region</Label>
              <Select
                value={localSettings.dataResidencyRegion}
                onValueChange={(value) => setLocalSettings(prev => ({ ...prev, dataResidencyRegion: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {region.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Local Processing Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Use only local OCR and extraction without external API calls
              </p>
            </div>
            <Switch
              checked={localSettings.localProcessingOnly}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, localProcessingOnly: checked, allowExternalAiCalls: !checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Security
          </CardTitle>
          <CardDescription>
            Configure watermarking, expiration, and export controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Watermark Exports</Label>
              <p className="text-sm text-muted-foreground">
                Add user email and timestamp to all exported documents
              </p>
            </div>
            <Switch
              checked={localSettings.watermarkExports}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, watermarkExports: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Watermark Previews</Label>
              <p className="text-sm text-muted-foreground">
                Add visible watermarks to document previews
              </p>
            </div>
            <Switch
              checked={localSettings.watermarkPreviews}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, watermarkPreviews: checked }))}
            />
          </div>

          <Separator />

          <div>
            <Label className="text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Auto-Expire Documents (days)
            </Label>
            <Input
              type="number"
              placeholder="Never expire"
              value={localSettings.autoExpireDocumentsDays || ''}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                autoExpireDocumentsDays: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Documents will be automatically deleted after this many days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Compliance Settings
          </CardTitle>
          <CardDescription>
            Enable compliance modes for regulatory requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">GDPR Compliance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable enhanced data protection for EU data subjects
              </p>
            </div>
            <Switch
              checked={localSettings.gdprCompliant}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, gdprCompliant: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">HIPAA Compliance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable enhanced protection for healthcare data
              </p>
            </div>
            <Switch
              checked={localSettings.hipaaCompliant}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, hipaaCompliant: checked }))}
            />
          </div>

          {(localSettings.gdprCompliant || localSettings.hipaaCompliant) && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-sm text-warning flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance modes automatically enable: PII masking, audit logging, watermarks, and data residency controls
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending ? 'Saving...' : 'Save Privacy Settings'}
        </Button>
      </div>
    </div>
  );
}

export default ProjectPrivacySettings;
