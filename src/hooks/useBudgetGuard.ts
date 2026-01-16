import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { budgetService, CostCheckResult, EnforcementMode } from '@/services/budgetService';
import { useBudgetSummary, useBudgetSettings } from '@/hooks/useBudget';
import { auditService } from '@/services/auditService';

export type OperationType = 'optimization' | 'evaluation' | 'embedding' | 'training';

export interface BudgetGuardConfig {
  projectId: string;
  operationType: OperationType;
  operationName: string;
  estimatedCost?: number;
  config?: Record<string, unknown>;
  costThreshold?: number; // Only require preview if cost > threshold
}

export interface BudgetGuardResult {
  allowed: boolean;
  requiresPreview: boolean;
  costCheck: CostCheckResult | null;
  error: string | null;
}

export interface UseBudgetGuardReturn {
  // State
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  costCheck: CostCheckResult | null;
  isChecking: boolean;
  isLocked: boolean; // UI locking state to prevent double-clicks
  error: string | null;
  
  // Settings & Summary
  enforcementMode: EnforcementMode;
  budgetStatus: string;
  isOverBudget: boolean;
  isAtRisk: boolean;
  
  // Actions
  checkAndPrompt: (config?: BudgetGuardConfig) => Promise<BudgetGuardResult>;
  executeWithGuard: (
    onExecute: (useDowngrade: boolean) => Promise<void>,
    config: BudgetGuardConfig
  ) => Promise<void>;
  resetGuard: () => void;
  unlockOperation: () => void;
  
  // UI Helpers
  getBlockedMessage: () => string | null;
  isOperationBlocked: () => boolean;
  canProceedWithWarning: () => boolean;
  getHumanReadableError: (error: string) => string;
}

// Timeout for budget check operations
const BUDGET_CHECK_TIMEOUT_MS = 10000;

// Map of technical errors to human-readable messages
const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Unable to reach the budget service. Your operation has been blocked for safety. Please try again in a moment.',
  'Network Error': 'Network connection lost. Your budget is safe, and you can retry once connected.',
  'timeout': 'The budget check took too long. For your protection, the operation was blocked. Please try again.',
  '500': 'The AI service is currently experiencing issues. Your budget is safe, and you can retry in a few minutes.',
  '503': 'The service is temporarily unavailable. Please wait a moment and try again.',
  '429': 'Too many requests. Please wait a moment before trying again.',
  'quota': 'You have exceeded your processing quota for this period.',
};

export function useBudgetGuard(projectId: string): UseBudgetGuardReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showPreview, setShowPreview] = useState(false);
  const [costCheck, setCostCheck] = useState<CostCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<BudgetGuardConfig | null>(null);
  
  // Ref to track if operation is in progress (prevents race conditions)
  const operationInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useBudgetSettings(projectId);
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useBudgetSummary(projectId);
  
  // FAIL-SAFE: If settings/summary failed to load, default to blocked state
  const enforcementMode: EnforcementMode = settingsError ? 'abort' : (settings?.budgetEnforcementMode || 'warn');
  const budgetStatus = summaryError ? 'over_budget' : (summary?.status || 'under_budget');
  const isOverBudget = budgetStatus === 'over_budget';
  const isAtRisk = budgetStatus === 'at_risk' || isOverBudget;
  
  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Human-readable error translation
  const getHumanReadableError = useCallback((technicalError: string): string => {
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
      if (technicalError.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
    // Generic fallback with safety assurance
    return `An unexpected error occurred: ${technicalError}. Your budget is protected, and no charges were made.`;
  }, []);
  
  const checkBudgetMutation = useMutation({
    mutationFn: async (config: BudgetGuardConfig) => {
      // Create timeout promise for fail-safe
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Budget check timeout')), BUDGET_CHECK_TIMEOUT_MS);
      });
      
      const checkPromise = budgetService.checkBudget(
        config.projectId,
        config.estimatedCost || 0,
        { 
          operation_type: config.operationType,
          ...config.config 
        }
      );
      
      // Race between actual check and timeout
      return Promise.race([checkPromise, timeoutPromise]);
    },
  });
  
  const checkAndPrompt = useCallback(async (
    config?: BudgetGuardConfig
  ): Promise<BudgetGuardResult> => {
    const guardConfig = config || pendingConfig;
    if (!guardConfig) {
      return { allowed: false, requiresPreview: false, costCheck: null, error: 'No configuration provided' };
    }
    
    // FAIL-SAFE: Block if already in progress (race condition protection)
    if (operationInProgressRef.current) {
      return { 
        allowed: false, 
        requiresPreview: false, 
        costCheck: null, 
        error: 'An operation is already in progress. Please wait.' 
      };
    }
    
    // FAIL-SAFE: Block if settings/summary failed to load
    if (settingsError || summaryError) {
      const errorMsg = 'Unable to verify budget status. Operation blocked for your protection.';
      setError(errorMsg);
      
      // Log the safety block
      await auditService.log({
        action: 'budget_safety_block',
        resourceType: 'project',
        resourceId: guardConfig.projectId,
        resourceName: guardConfig.operationName,
        details: {
          reason: 'Budget data unavailable',
          operation_type: guardConfig.operationType,
        },
      }).catch(() => {}); // Don't fail if audit fails
      
      return { allowed: false, requiresPreview: false, costCheck: null, error: errorMsg };
    }
    
    setError(null);
    setPendingConfig(guardConfig);
    setIsLocked(true);
    operationInProgressRef.current = true;
    
    try {
      const result = await checkBudgetMutation.mutateAsync(guardConfig);
      setCostCheck(result);
      
      // Determine if preview is required
      const threshold = guardConfig.costThreshold ?? 0;
      const exceedsThreshold = result.estimatedCost > threshold;
      const wouldExceedBudget = result.estimatedCost + result.monthSpent > result.monthlyBudget;
      const requiresPreview = exceedsThreshold || wouldExceedBudget || result.downgrade?.recommended;
      
      if (requiresPreview) {
        setShowPreview(true);
        // Keep locked state while preview is shown
        return { allowed: false, requiresPreview: true, costCheck: result, error: null };
      }
      
      // No preview needed, check if allowed
      if (!result.allowed && result.enforceMode === 'abort') {
        const errorMsg = 'Operation blocked: Monthly budget exceeded';
        setError(errorMsg);
        setIsLocked(false);
        operationInProgressRef.current = false;
        
        // Log the abort decision
        await auditService.log({
          action: 'budget_abort',
          resourceType: 'project',
          resourceId: guardConfig.projectId,
          resourceName: guardConfig.operationName,
          details: {
            reason: errorMsg,
            estimated_cost: result.estimatedCost,
            monthly_budget: result.monthlyBudget,
            month_spent: result.monthSpent,
          },
        }).catch(() => {});
        
        return { allowed: false, requiresPreview: false, costCheck: result, error: 'Budget exceeded' };
      }
      
      setIsLocked(false);
      operationInProgressRef.current = false;
      return { allowed: result.allowed, requiresPreview: false, costCheck: result, error: null };
    } catch (err) {
      // FAIL-SAFE: On any error, default to blocked state
      const technicalError = err instanceof Error ? err.message : 'Failed to check budget';
      const humanError = getHumanReadableError(technicalError);
      setError(humanError);
      setIsLocked(false);
      operationInProgressRef.current = false;
      
      toast({
        title: 'Budget Check Failed',
        description: humanError,
        variant: 'destructive',
      });
      
      // Log the failure
      await auditService.logFailure(
        'budget_check_failed',
        'project',
        guardConfig.projectId,
        guardConfig.operationName,
        technicalError
      ).catch(() => {});
      
      return { allowed: false, requiresPreview: false, costCheck: null, error: humanError };
    }
  }, [checkBudgetMutation, pendingConfig, toast, settingsError, summaryError, getHumanReadableError]);
  
  const executeWithGuard = useCallback(async (
    onExecute: (useDowngrade: boolean) => Promise<void>,
    config: BudgetGuardConfig
  ): Promise<void> => {
    // Double-click protection
    if (isLocked || operationInProgressRef.current) {
      toast({
        title: 'Please Wait',
        description: 'An operation is already in progress.',
        variant: 'default',
      });
      return;
    }
    
    const guardResult = await checkAndPrompt(config);
    
    if (guardResult.requiresPreview) {
      // Preview modal will be shown, execution is deferred
      return;
    }
    
    if (guardResult.allowed) {
      setIsLocked(true);
      operationInProgressRef.current = true;
      
      try {
        await onExecute(false);
        // Invalidate budget queries after operation for sync verification
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['budget-summary', projectId] }),
          queryClient.invalidateQueries({ queryKey: ['budget-settings', projectId] }),
          queryClient.invalidateQueries({ queryKey: ['budget-report', projectId] }),
          queryClient.invalidateQueries({ queryKey: ['cost-breakdown', projectId] }),
        ]);
      } finally {
        setIsLocked(false);
        operationInProgressRef.current = false;
      }
    }
  }, [checkAndPrompt, projectId, queryClient, toast, isLocked]);
  
  const resetGuard = useCallback(() => {
    setShowPreview(false);
    setCostCheck(null);
    setError(null);
    setPendingConfig(null);
    setIsLocked(false);
    operationInProgressRef.current = false;
  }, []);
  
  const unlockOperation = useCallback(() => {
    setIsLocked(false);
    operationInProgressRef.current = false;
  }, []);
  
  const getBlockedMessage = useCallback((): string | null => {
    // FAIL-SAFE: Show blocked message if budget data unavailable
    if (settingsError || summaryError) {
      return 'Unable to verify budget status. Operations are blocked for your protection. Please refresh the page.';
    }
    
    if (settingsLoading || summaryLoading) {
      return 'Verifying budget status...';
    }
    
    if (!isOverBudget) return null;
    
    if (enforcementMode === 'abort') {
      return 'This operation is blocked because it would exceed your monthly budget. Increase your budget or wait until next month.';
    }
    
    if (enforcementMode === 'auto_downgrade') {
      return 'Your budget is exceeded. Operations will automatically use cost-saving configurations.';
    }
    
    return 'Warning: Your monthly budget has been exceeded.';
  }, [isOverBudget, enforcementMode, settingsError, summaryError, settingsLoading, summaryLoading]);
  
  const isOperationBlocked = useCallback((): boolean => {
    // FAIL-SAFE: Block if data unavailable
    if (settingsError || summaryError) return true;
    if (settingsLoading || summaryLoading) return true;
    return isOverBudget && enforcementMode === 'abort';
  }, [isOverBudget, enforcementMode, settingsError, summaryError, settingsLoading, summaryLoading]);
  
  const canProceedWithWarning = useCallback((): boolean => {
    // FAIL-SAFE: Cannot proceed if data unavailable
    if (settingsError || summaryError) return false;
    if (settingsLoading || summaryLoading) return false;
    if (!isOverBudget) return true;
    return enforcementMode === 'warn' || enforcementMode === 'auto_downgrade';
  }, [isOverBudget, enforcementMode, settingsError, summaryError, settingsLoading, summaryLoading]);
  
  return {
    showPreview,
    setShowPreview,
    costCheck,
    isChecking: checkBudgetMutation.isPending,
    isLocked,
    error,
    enforcementMode,
    budgetStatus,
    isOverBudget,
    isAtRisk,
    checkAndPrompt,
    executeWithGuard,
    resetGuard,
    unlockOperation,
    getBlockedMessage,
    isOperationBlocked,
    canProceedWithWarning,
    getHumanReadableError,
  };
}
