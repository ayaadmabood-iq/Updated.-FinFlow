import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  TrendingDown,
  Shield,
  XCircle,
  Sparkles,
  Info,
} from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { budgetService, CostCheckResult, EnforcementMode } from '@/services/budgetService';
import { cn } from '@/lib/utils';

interface CostPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCheck: CostCheckResult | null;
  operationName: string;
  isLoading?: boolean;
  onProceed: (useDowngrade: boolean) => void;
  onCancel: () => void;
}

export function CostPreviewModal({
  open,
  onOpenChange,
  costCheck,
  operationName,
  isLoading = false,
  onProceed,
  onCancel,
}: CostPreviewModalProps) {
  const { t } = useTranslation();
  const [proceedingWithDowngrade, setProceedingWithDowngrade] = useState(false);

  if (!costCheck) return null;

  const willExceed = costCheck.estimatedCost + costCheck.monthSpent > costCheck.monthlyBudget;
  const hasDowngrade = costCheck.downgrade?.recommended;
  const newPercentUsed = ((costCheck.monthSpent + costCheck.estimatedCost) / costCheck.monthlyBudget) * 100;
  const isAbortMode = costCheck.enforceMode === 'abort';
  const isAutoDowngradeMode = costCheck.enforceMode === 'auto_downgrade';
  
  const getStatusInfo = () => {
    if (newPercentUsed > 100) {
      return { 
        status: 'over_budget' as const, 
        label: 'Exceeds Budget',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: XCircle,
      };
    }
    if (newPercentUsed > 90) {
      return { 
        status: 'at_risk' as const, 
        label: 'Critical',
        color: 'bg-warning/10 text-warning border-warning/20',
        icon: AlertTriangle,
      };
    }
    if (newPercentUsed > 75) {
      return { 
        status: 'on_track' as const, 
        label: 'On Track',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: Info,
      };
    }
    return { 
      status: 'under_budget' as const, 
      label: 'Within Budget',
      color: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle,
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleProceed = (useDowngrade: boolean) => {
    setProceedingWithDowngrade(useDowngrade);
    onProceed(useDowngrade);
  };

  // Calculate human-readable savings message
  const getSavingsMessage = () => {
    if (!costCheck.downgrade) return null;
    const savings = costCheck.estimatedCost - costCheck.downgrade.estimatedNewCost;
    const savingsFormatted = budgetService.formatCurrency(savings);
    const qualityImpact = costCheck.downgrade.qualityImpactPercent;
    
    if (qualityImpact < 5) {
      return `This will save ~${savingsFormatted} with minimal impact on quality (<5%). Your results will remain highly accurate.`;
    }
    return `This will save ~${savingsFormatted} (~${costCheck.downgrade.costSavingsPercent.toFixed(0)}% savings) with approximately ${qualityImpact.toFixed(1)}% quality impact.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <span>Review Cost: {operationName}</span>
          </DialogTitle>
          <DialogDescription>
            Please review the estimated cost before proceeding with this operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Cost Summary Card */}
          <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated Cost</span>
              <span className="text-2xl font-bold">
                {budgetService.formatCurrency(costCheck.estimatedCost)}
              </span>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Spending</p>
                <p className="font-medium">{budgetService.formatCurrency(costCheck.monthSpent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Budget</p>
                <p className="font-medium">{budgetService.formatCurrency(costCheck.monthlyBudget)}</p>
              </div>
            </div>
          </div>

          {/* Budget Impact Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget After Operation</span>
              <Badge variant="outline" className={cn('gap-1', statusInfo.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            
            <div className="relative">
              <Progress 
                value={Math.min(costCheck.percentUsed, 100)} 
                className="h-3 bg-muted"
              />
              {/* Show projected position */}
              <div 
                className="absolute top-0 h-3 bg-primary/30 rounded-r-full transition-all"
                style={{ 
                  left: `${Math.min(costCheck.percentUsed, 100)}%`,
                  width: `${Math.min(newPercentUsed - costCheck.percentUsed, 100 - costCheck.percentUsed)}%`
                }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Remaining after: {budgetService.formatCurrency(Math.max(0, costCheck.remainingBudget - costCheck.estimatedCost))}
              </span>
              <span>{newPercentUsed.toFixed(0)}% of budget</span>
            </div>
          </div>

          {/* Warning for exceeding budget without downgrade option */}
          {willExceed && !hasDowngrade && (
            <div className={cn(
              "flex items-start gap-3 p-4 rounded-lg border",
              isAbortMode 
                ? "bg-destructive/10 border-destructive/20" 
                : "bg-warning/10 border-warning/20"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5 mt-0.5 shrink-0",
                isAbortMode ? "text-destructive" : "text-warning"
              )} />
              <div className="space-y-1">
                <p className={cn(
                  "font-medium",
                  isAbortMode ? "text-destructive" : "text-warning"
                )}>
                  {isAbortMode ? 'Operation Blocked' : 'Will Exceed Budget'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAbortMode 
                    ? "This operation is blocked because it would exceed your monthly budget. Increase your budget or enable auto-downgrade to proceed."
                    : `This will put you ${budgetService.formatCurrency(costCheck.monthSpent + costCheck.estimatedCost - costCheck.monthlyBudget)} over your monthly budget.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Downgrade Option - Enterprise UX */}
          {hasDowngrade && costCheck.downgrade && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 border-b flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Cost-Saving Option Available</span>
                {isAutoDowngradeMode && (
                  <Badge variant="secondary" className="ms-auto text-xs">
                    Recommended
                  </Badge>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                {/* Human-readable explanation */}
                <p className="text-sm text-muted-foreground">
                  {getSavingsMessage()}
                </p>
                
                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Original</p>
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(costCheck.downgrade.originalConfig).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-sm font-medium">
                        {budgetService.formatCurrency(costCheck.estimatedCost)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                    <p className="text-xs text-success mb-2 font-medium flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Optimized
                    </p>
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(costCheck.downgrade.adjustedConfig).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="text-success">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-success/20">
                      <span className="text-sm font-medium text-success">
                        {budgetService.formatCurrency(costCheck.downgrade.estimatedNewCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Impact Summary */}
                <div className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-success font-medium">
                      Save {costCheck.downgrade.costSavingsPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>~{costCheck.downgrade.qualityImpactPercent.toFixed(1)}% quality tradeoff</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enforcement Mode Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded">
            <Shield className="h-3 w-3" />
            <span>
              Enforcement: <strong>{budgetService.getEnforcementDisplayName(costCheck.enforceMode)}</strong>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          {hasDowngrade && costCheck.downgrade ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Only show full cost option if allowed */}
              {costCheck.allowed && (
                <Button
                  variant="outline"
                  onClick={() => handleProceed(false)}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading && !proceedingWithDowngrade && (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  )}
                  Full Cost ({budgetService.formatCurrency(costCheck.estimatedCost)})
                </Button>
              )}
              <Button
                onClick={() => handleProceed(true)}
                disabled={isLoading}
                className={cn(
                  "w-full sm:w-auto",
                  isAutoDowngradeMode && "bg-success hover:bg-success/90"
                )}
              >
                {isLoading && proceedingWithDowngrade && (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                )}
                {isAutoDowngradeMode ? 'Proceed (Optimized)' : 'Proceed with Savings'}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleProceed(false)}
              disabled={isLoading || (isAbortMode && !costCheck.allowed)}
              className="w-full sm:w-auto"
            >
              {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {costCheck.allowed ? 'Proceed' : 'Blocked'}
              {costCheck.allowed && <ArrowRight className="h-4 w-4 ms-2" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
