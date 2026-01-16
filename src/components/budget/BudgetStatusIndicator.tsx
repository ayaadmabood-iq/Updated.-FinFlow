import { DollarSign, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBudgetSummary } from '@/hooks/useBudget';
import { budgetService, BudgetStatus } from '@/services/budgetService';

interface BudgetStatusIndicatorProps {
  projectId: string;
  showLabel?: boolean;
}

const statusIcons: Record<BudgetStatus, React.ElementType> = {
  under_budget: CheckCircle,
  on_track: DollarSign,
  at_risk: AlertCircle,
  over_budget: AlertTriangle,
};

export function BudgetStatusIndicator({ projectId, showLabel = false }: BudgetStatusIndicatorProps) {
  const { data: summary, isLoading } = useBudgetSummary(projectId);

  if (isLoading || !summary) {
    return null;
  }

  const statusColor = budgetService.getStatusColor(summary.status);
  const Icon = statusIcons[summary.status];
  const displayLabel = summary.status.replace('_', ' ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`${statusColor} cursor-help ${showLabel ? '' : 'px-2'}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {showLabel && <span className="ms-1 capitalize">{displayLabel}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm space-y-1">
          <p className="font-medium capitalize">{displayLabel}</p>
          <p>Spent: {budgetService.formatCurrency(summary.currentSpending)}</p>
          <p>Remaining: {budgetService.formatCurrency(summary.remainingBudget)}</p>
          <p className="text-xs text-muted-foreground">
            {summary.budgetUsedPercent.toFixed(1)}% of {budgetService.formatCurrency(summary.monthlyBudget)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
