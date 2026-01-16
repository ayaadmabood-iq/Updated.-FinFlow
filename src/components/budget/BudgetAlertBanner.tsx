import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Settings2,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBudgetSummary, useBudgetSettings } from '@/hooks/useBudget';
import { budgetService } from '@/services/budgetService';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BudgetAlertBannerProps {
  projectId: string;
  className?: string;
  dismissible?: boolean;
  showRecommendations?: boolean;
}

export function BudgetAlertBanner({
  projectId,
  className,
  dismissible = false,
  showRecommendations = true,
}: BudgetAlertBannerProps) {
  const { data: summary, isLoading: summaryLoading } = useBudgetSummary(projectId);
  const { data: settings, isLoading: settingsLoading } = useBudgetSettings(projectId);
  const [dismissed, setDismissed] = useState(false);
  
  if (summaryLoading || settingsLoading || dismissed) return null;
  if (!summary || !settings) return null;
  
  const { status, budgetUsedPercent, projectedMonthEnd, monthlyBudget, remainingBudget, daysRemaining } = summary;
  const isExceeded = status === 'over_budget';
  const isAtRisk = status === 'at_risk';
  const willExceed = projectedMonthEnd > monthlyBudget && !isExceeded;
  
  // Only show banner for concerning states
  if (!isExceeded && !isAtRisk && !willExceed) return null;
  
  const formatCurrency = budgetService.formatCurrency.bind(budgetService);
  
  const getBannerConfig = () => {
    if (isExceeded) {
      return {
        icon: XCircle,
        variant: 'destructive' as const,
        title: 'Monthly Budget Exceeded',
        description: `You've spent ${formatCurrency(summary.currentSpending)} of your ${formatCurrency(monthlyBudget)} monthly budget.`,
        recommendations: [
          settings.budgetEnforcementMode !== 'auto_downgrade' && {
            text: 'Enable auto-downgrade to continue at reduced cost',
            action: 'Enable Auto-Downgrade',
            href: `/projects/${projectId}/settings`,
          },
          {
            text: 'Increase your monthly budget',
            action: 'Adjust Budget',
            href: `/projects/${projectId}/budget`,
          },
        ].filter(Boolean),
      };
    }
    
    if (isAtRisk || willExceed) {
      const daysUntilExhausted = summary.daysUntilExhausted;
      return {
        icon: AlertTriangle,
        variant: 'default' as const,
        title: 'Budget At Risk',
        description: daysUntilExhausted 
          ? `At current pace, budget will be exhausted in ${daysUntilExhausted} days (${daysRemaining} days remain in month).`
          : `Projected month-end spending: ${formatCurrency(projectedMonthEnd)} (${formatCurrency(projectedMonthEnd - monthlyBudget)} over budget).`,
        recommendations: [
          {
            text: 'Review spending breakdown',
            action: 'View Dashboard',
            href: `/projects/${projectId}/budget`,
          },
          settings.budgetEnforcementMode === 'warn' && {
            text: 'Consider enabling cost controls',
            action: 'Settings',
            href: `/projects/${projectId}/settings`,
          },
        ].filter(Boolean),
      };
    }
    
    return null;
  };
  
  const config = getBannerConfig();
  if (!config) return null;
  
  const Icon = config.icon;
  
  const isWarningStyle = config.variant === 'default' && (isAtRisk || willExceed);
  
  return (
    <Alert 
      variant={config.variant} 
      className={cn(
        'relative',
        isWarningStyle && 'border-warning/50 bg-warning/10 text-warning-foreground [&>svg]:text-warning',
        className
      )}
    >
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <Icon className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2">
        {config.title}
        <span className="text-sm font-normal">
          ({budgetUsedPercent.toFixed(0)}% used)
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>{config.description}</p>
        
        {showRecommendations && config.recommendations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {config.recommendations.map((rec, idx) => (
              rec && (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-background/50 hover:bg-background"
                >
                  <Link to={rec.href}>
                    {rec.action}
                    <ChevronRight className="h-3 w-3 ms-1" />
                  </Link>
                </Button>
              )
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
