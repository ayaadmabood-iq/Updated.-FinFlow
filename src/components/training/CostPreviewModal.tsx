import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetSummary, useBudgetSettings } from '@/hooks/useBudget';
import type { TrainingDataset } from '@/services/trainingService';
import {
  DollarSign,
  Coins,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface CostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: TrainingDataset;
  projectId: string;
  onApprove: () => void;
}

// Estimated costs per 1K tokens for different models (approximate)
const MODEL_COSTS: Record<string, { training: number; inference: number }> = {
  'gpt-4o-mini-2024-07-18': { training: 0.003, inference: 0.0006 },
  'gpt-4o-2024-08-06': { training: 0.025, inference: 0.005 },
  'gpt-4-0613': { training: 0.045, inference: 0.06 },
  'gpt-3.5-turbo-0125': { training: 0.008, inference: 0.002 },
};

export function CostPreviewModal({
  open,
  onOpenChange,
  dataset,
  projectId,
  onApprove,
}: CostPreviewModalProps) {
  const { t } = useTranslation();
  const { data: budgetSummary } = useBudgetSummary(projectId);
  const { data: budgetSettings } = useBudgetSettings(projectId);
  
  const [selectedModel] = useState('gpt-4o-mini-2024-07-18');

  // Calculate estimated training cost
  const tokensInK = dataset.totalTokens / 1000;
  const modelCost = MODEL_COSTS[selectedModel] || MODEL_COSTS['gpt-4o-mini-2024-07-18'];
  const estimatedTrainingCost = tokensInK * modelCost.training * 3; // ~3 epochs default
  const estimatedInferenceCost = tokensInK * modelCost.inference;
  const totalEstimatedCost = estimatedTrainingCost + estimatedInferenceCost;

  // Budget checks
  const remainingBudget = budgetSettings?.monthlyBudgetUsd 
    ? budgetSettings.monthlyBudgetUsd - (budgetSummary?.currentSpending || 0)
    : Infinity;
  const willExceedBudget = totalEstimatedCost > remainingBudget;
  const isNearLimit = totalEstimatedCost > remainingBudget * 0.8;

  // Log budget check mutation
  const logBudgetCheckMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: user.email || 'Unknown',
        action: approved ? 'training_cost_approved' : 'training_cost_blocked',
        resource_type: 'training_dataset',
        resource_id: dataset.id,
        resource_name: dataset.name,
        severity_level: approved ? 'info' : 'warning',
        details: {
          estimated_cost: totalEstimatedCost,
          remaining_budget: remainingBudget,
          tokens: dataset.totalTokens,
          pairs: dataset.totalPairs,
        },
      });
    },
  });

  const handleApprove = async () => {
    await logBudgetCheckMutation.mutateAsync(true);
    onApprove();
  };

  const handleCancel = async () => {
    if (willExceedBudget) {
      await logBudgetCheckMutation.mutateAsync(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('training.costPreview', 'Cost Preview')}
          </DialogTitle>
          <DialogDescription>
            {t('training.costPreviewDesc', 'Review estimated costs before starting training')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dataset Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">{dataset.name}</h4>
                <Badge variant="outline">{dataset.format.toUpperCase()}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{dataset.totalPairs}</p>
                  <p className="text-xs text-muted-foreground">{t('training.pairs', 'Pairs')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{(dataset.totalTokens / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">{t('training.tokens', 'Tokens')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{dataset.validationResult?.stats?.avgQualityScore?.toFixed(0) || 0}%</p>
                  <p className="text-xs text-muted-foreground">{t('training.quality', 'Quality')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              {t('training.estimatedCosts', 'Estimated Costs')}
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('training.trainingCost', 'Training (~3 epochs)')}</span>
                <span>${estimatedTrainingCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('training.validationCost', 'Validation')}</span>
                <span>${estimatedInferenceCost.toFixed(4)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>{t('training.totalEstimated', 'Total Estimated')}</span>
                <span className="text-lg">${totalEstimatedCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Budget Status */}
          {budgetSettings?.monthlyBudgetUsd && (
            <Card className={willExceedBudget ? 'border-destructive' : isNearLimit ? 'border-yellow-500' : 'border-green-500'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {willExceedBudget ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : isNearLimit ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-medium">
                    {willExceedBudget 
                      ? t('budget.exceedsBudget', 'Exceeds Budget')
                      : isNearLimit
                      ? t('budget.nearLimit', 'Near Budget Limit')
                      : t('budget.withinBudget', 'Within Budget')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('budget.remaining', 'Remaining Budget')}</span>
                  <span className={willExceedBudget ? 'text-destructive' : ''}>${remainingBudget.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('budget.afterTraining', 'After Training')}</span>
                  <span className={remainingBudget - totalEstimatedCost < 0 ? 'text-destructive' : ''}>
                    ${(remainingBudget - totalEstimatedCost).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {willExceedBudget && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('training.budgetWarning', 'This training job will exceed your monthly budget. Adjust your budget settings or reduce the dataset size.')}
              </AlertDescription>
            </Alert>
          )}

          {!willExceedBudget && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                {t('training.openAiCostNote', 'Training costs will be charged directly to your OpenAI account.')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={willExceedBudget || logBudgetCheckMutation.isPending}
          >
            {logBudgetCheckMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : null}
            {t('training.proceedToTraining', 'Proceed to Training')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
