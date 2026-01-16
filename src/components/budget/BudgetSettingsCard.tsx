import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Zap, Target, Shield, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBudget,
  BudgetSettings,
} from '@/hooks/useBudget';
import type { BaselineStrategy, EnforcementMode } from '@/services/budgetService';

interface BudgetSettingsCardProps {
  projectId: string;
}

export function BudgetSettingsCard({ projectId }: BudgetSettingsCardProps) {
  const { t } = useTranslation();
  const {
    settings: settingsQuery,
    summary: summaryQuery,
    updateSettings,
    formatCurrency,
    getStatusColor,
    getStrategyDisplayName,
    getEnforcementDisplayName,
  } = useBudget(projectId);

  const [localSettings, setLocalSettings] = useState<BudgetSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settingsQuery.data && !localSettings) {
      setLocalSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const handleChange = <K extends keyof BudgetSettings>(key: K, value: BudgetSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings.mutateAsync(localSettings);
      setHasChanges(false);
    }
  };

  if (settingsQuery.isLoading || !localSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const statusColor = summary ? getStatusColor(summary.status) : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('budget.settings', 'Budget & Cost Settings')}
            </CardTitle>
            <CardDescription>
              {t('budget.settingsDescription', 'Configure spending limits and cost optimization strategy')}
            </CardDescription>
          </div>
          {summary && (
            <Badge variant="outline" className={statusColor}>
              {summary.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        {summary && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current month spending</span>
              <span className="font-medium">{formatCurrency(summary.currentSpending)}</span>
            </div>
            <Progress value={summary.budgetUsedPercent} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium">{formatCurrency(summary.remainingBudget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projected month-end</span>
              <span className={summary.projectedMonthEnd > summary.monthlyBudget ? 'text-destructive font-medium' : 'font-medium'}>
                {formatCurrency(summary.projectedMonthEnd)}
              </span>
            </div>
          </div>
        )}

        {/* Budget Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Budget (USD)
            </Label>
            <Input
              id="monthly-budget"
              type="number"
              min={0}
              step={1}
              value={localSettings.monthlyBudgetUsd}
              onChange={(e) => handleChange('monthlyBudgetUsd', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-query-cost" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Max Cost Per Query (USD)
            </Label>
            <Input
              id="max-query-cost"
              type="number"
              min={0}
              step={0.001}
              value={localSettings.maxCostPerQueryUsd}
              onChange={(e) => handleChange('maxCostPerQueryUsd', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Baseline Strategy */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Preferred Baseline Strategy
          </Label>
          <Select
            value={localSettings.preferredBaselineStrategy}
            onValueChange={(value) => handleChange('preferredBaselineStrategy', value as BaselineStrategy)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quality_only">
                <div className="flex flex-col">
                  <span>Quality Only</span>
                  <span className="text-xs text-muted-foreground">Optimize for best results regardless of cost</span>
                </div>
              </SelectItem>
              <SelectItem value="cost_aware">
                <div className="flex flex-col">
                  <span>Cost Aware</span>
                  <span className="text-xs text-muted-foreground">Prioritize cost efficiency over quality</span>
                </div>
              </SelectItem>
              <SelectItem value="latency_aware">
                <div className="flex flex-col">
                  <span>Latency Aware</span>
                  <span className="text-xs text-muted-foreground">Optimize for fastest response times</span>
                </div>
              </SelectItem>
              <SelectItem value="balanced">
                <div className="flex flex-col">
                  <span>Balanced</span>
                  <span className="text-xs text-muted-foreground">Best mix of quality, cost, and speed</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Enforcement Mode */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Budget Enforcement Mode
          </Label>
          <RadioGroup
            value={localSettings.budgetEnforcementMode}
            onValueChange={(value) => handleChange('budgetEnforcementMode', value as EnforcementMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="warn" id="warn" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="warn" className="font-medium cursor-pointer">Warn Only</Label>
                <p className="text-sm text-muted-foreground">
                  Show warnings when approaching or exceeding budget, but allow operations to continue.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="abort" id="abort" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="abort" className="font-medium cursor-pointer">Abort Operation</Label>
                <p className="text-sm text-muted-foreground">
                  Stop operations that would exceed the budget. Strictest enforcement.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="auto_downgrade" id="auto_downgrade" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto_downgrade" className="font-medium cursor-pointer">Auto-Downgrade</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically use cheaper configurations when budget is tight. Best balance of control and functionality.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/budget`}>
              View Detailed Report
              <ExternalLink className="h-4 w-4 ms-2" />
            </Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
