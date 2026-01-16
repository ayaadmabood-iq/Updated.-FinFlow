import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  budgetService,
  BudgetSettings,
  BudgetSummary,
  BudgetReport,
  CostCheckResult,
  BudgetDecision,
  CostBreakdownItem,
} from '@/services/budgetService';

export function useBudgetSettings(projectId: string) {
  return useQuery({
    queryKey: ['budget-settings', projectId],
    queryFn: () => budgetService.getBudgetSettings(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateBudgetSettings(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settings: Partial<BudgetSettings>) =>
      budgetService.updateBudgetSettings(projectId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-settings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', projectId] });
      toast({
        title: 'Budget settings updated',
        description: 'Your budget configuration has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useBudgetSummary(projectId: string) {
  return useQuery({
    queryKey: ['budget-summary', projectId],
    queryFn: () => budgetService.getBudgetSummary(projectId),
    enabled: !!projectId,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useBudgetReport(projectId: string) {
  return useQuery({
    queryKey: ['budget-report', projectId],
    queryFn: () => budgetService.getBudgetReport(projectId),
    enabled: !!projectId,
  });
}

export function useCostBreakdown(projectId: string) {
  return useQuery({
    queryKey: ['cost-breakdown', projectId],
    queryFn: () => budgetService.getCostBreakdown(projectId),
    enabled: !!projectId,
  });
}

export function useDailySpending(projectId: string, days = 30) {
  return useQuery({
    queryKey: ['daily-spending', projectId, days],
    queryFn: () => budgetService.getDailySpending(projectId, days),
    enabled: !!projectId,
  });
}

export function useBudgetDecisions(projectId: string, limit = 50) {
  return useQuery({
    queryKey: ['budget-decisions', projectId, limit],
    queryFn: () => budgetService.getBudgetDecisions(projectId, limit),
    enabled: !!projectId,
  });
}

export function useCheckBudget() {
  return useMutation({
    mutationFn: ({
      projectId,
      estimatedCost,
      config,
    }: {
      projectId: string;
      estimatedCost: number;
      config?: Record<string, unknown>;
    }) => budgetService.checkBudget(projectId, estimatedCost, config),
  });
}

export function useBudget(projectId: string) {
  const settings = useBudgetSettings(projectId);
  const summary = useBudgetSummary(projectId);
  const updateSettings = useUpdateBudgetSettings(projectId);
  const checkBudget = useCheckBudget();

  return {
    settings,
    summary,
    updateSettings,
    checkBudget,
    // Utility functions
    formatCurrency: budgetService.formatCurrency.bind(budgetService),
    getStatusColor: budgetService.getStatusColor.bind(budgetService),
    getStrategyDisplayName: budgetService.getStrategyDisplayName.bind(budgetService),
    getEnforcementDisplayName: budgetService.getEnforcementDisplayName.bind(budgetService),
    isLoading: settings.isLoading || summary.isLoading,
    error: settings.error || summary.error,
  };
}

export type {
  BudgetSettings,
  BudgetSummary,
  BudgetReport,
  CostCheckResult,
  BudgetDecision,
  CostBreakdownItem,
};
