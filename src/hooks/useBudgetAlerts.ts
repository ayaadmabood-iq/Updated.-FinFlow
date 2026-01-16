import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useBudgetSummary, useBudgetSettings } from '@/hooks/useBudget';
import { budgetService, BudgetStatus } from '@/services/budgetService';

export interface BudgetAlertConfig {
  enableToasts?: boolean;
  thresholds?: {
    warning: number; // Default 75%
    critical: number; // Default 90%
  };
}

export interface UseBudgetAlertsReturn {
  showWarning: boolean;
  showCritical: boolean;
  showExceeded: boolean;
  alertLevel: 'none' | 'warning' | 'critical' | 'exceeded';
  alertMessage: string | null;
  triggerDowngradeNotification: (details: DowngradeDetails) => void;
  triggerAbortNotification: (reason: string) => void;
}

export interface DowngradeDetails {
  originalCost: number;
  newCost: number;
  savingsPercent: number;
  qualityImpact: number;
}

export function useBudgetAlerts(
  projectId: string,
  config: BudgetAlertConfig = {}
): UseBudgetAlertsReturn {
  const { toast } = useToast();
  const { data: summary } = useBudgetSummary(projectId);
  const { data: settings } = useBudgetSettings(projectId);
  
  const { 
    enableToasts = true,
    thresholds = { warning: 75, critical: 90 }
  } = config;
  
  const lastAlertLevel = useRef<'none' | 'warning' | 'critical' | 'exceeded'>('none');
  const shownAlerts = useRef<Set<string>>(new Set());
  
  const budgetUsed = summary?.budgetUsedPercent ?? 0;
  const isExceeded = budgetUsed > 100;
  const isCritical = budgetUsed >= thresholds.critical && !isExceeded;
  const isWarning = budgetUsed >= thresholds.warning && !isCritical && !isExceeded;
  
  const getCurrentAlertLevel = (): 'none' | 'warning' | 'critical' | 'exceeded' => {
    if (isExceeded) return 'exceeded';
    if (isCritical) return 'critical';
    if (isWarning) return 'warning';
    return 'none';
  };
  
  const alertLevel = getCurrentAlertLevel();
  
  const getAlertMessage = (): string | null => {
    if (!summary) return null;
    
    const remaining = budgetService.formatCurrency(summary.remainingBudget);
    const spent = budgetService.formatCurrency(summary.currentSpending);
    const budget = budgetService.formatCurrency(summary.monthlyBudget);
    
    switch (alertLevel) {
      case 'exceeded':
        return `Your monthly budget of ${budget} has been exceeded. Current spending: ${spent}. Consider increasing your budget or enabling auto-downgrade.`;
      case 'critical':
        return `Critical: ${budgetUsed.toFixed(0)}% of your monthly budget used. Only ${remaining} remaining this month.`;
      case 'warning':
        return `${budgetUsed.toFixed(0)}% of your monthly budget used. ${remaining} remaining for the rest of the month.`;
      default:
        return null;
    }
  };
  
  // Trigger threshold-based toast alerts when level changes
  useEffect(() => {
    if (!enableToasts || !summary || !settings) return;
    
    const alertKey = `${projectId}-${alertLevel}`;
    
    // Only show alert if:
    // 1. Level is not 'none'
    // 2. Level has changed OR we haven't shown this specific alert
    if (alertLevel !== 'none' && !shownAlerts.current.has(alertKey)) {
      const message = getAlertMessage();
      if (message) {
        const variant = alertLevel === 'exceeded' ? 'destructive' : 'default';
        const title = alertLevel === 'exceeded' 
          ? '⚠️ Budget Exceeded' 
          : alertLevel === 'critical' 
            ? '🚨 Budget Critical' 
            : '📊 Budget Warning';
        
        toast({
          title,
          description: message,
          variant,
          duration: alertLevel === 'exceeded' ? 10000 : 7000,
        });
        
        shownAlerts.current.add(alertKey);
        lastAlertLevel.current = alertLevel;
      }
    }
  }, [alertLevel, projectId, summary, settings, enableToasts, toast]);
  
  const triggerDowngradeNotification = useCallback((details: DowngradeDetails) => {
    if (!enableToasts) return;
    
    const savings = budgetService.formatCurrency(details.originalCost - details.newCost);
    
    toast({
      title: '💡 Cost Optimization Applied',
      description: `This operation will save ${savings} (~${details.savingsPercent.toFixed(0)}% savings) with approximately ${details.qualityImpact.toFixed(1)}% quality impact. Your results remain highly accurate.`,
      duration: 8000,
    });
  }, [enableToasts, toast]);
  
  const triggerAbortNotification = useCallback((reason: string) => {
    if (!enableToasts) return;
    
    toast({
      title: '🛑 Operation Blocked',
      description: reason || 'This operation was blocked because it would exceed your monthly budget. View your Budget Dashboard for options.',
      variant: 'destructive',
      duration: 10000,
    });
  }, [enableToasts, toast]);
  
  return {
    showWarning: isWarning,
    showCritical: isCritical,
    showExceeded: isExceeded,
    alertLevel,
    alertMessage: getAlertMessage(),
    triggerDowngradeNotification,
    triggerAbortNotification,
  };
}
