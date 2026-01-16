import { forwardRef, ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, AlertTriangle } from 'lucide-react';
import { useBudgetGuard } from '@/hooks/useBudgetGuard';
import { cn } from '@/lib/utils';

interface BudgetLockedButtonProps extends Omit<ButtonProps, 'disabled'> {
  projectId: string;
  children: ReactNode;
  /** Force enable even when budget is exceeded (use carefully) */
  forceEnable?: boolean;
  /** Show warning indicator instead of lock when in warn mode */
  showWarning?: boolean;
  /** Custom tooltip message when locked */
  lockedMessage?: string;
}

export const BudgetLockedButton = forwardRef<HTMLButtonElement, BudgetLockedButtonProps>(
  ({ 
    projectId, 
    children, 
    forceEnable = false,
    showWarning = true,
    lockedMessage,
    className,
    ...props 
  }, ref) => {
    const { 
      isOperationBlocked, 
      getBlockedMessage, 
      enforcementMode,
      isOverBudget,
      isAtRisk,
    } = useBudgetGuard(projectId);
    
    const isBlocked = !forceEnable && isOperationBlocked();
    const shouldShowWarning = showWarning && !isBlocked && (isOverBudget || isAtRisk);
    const message = lockedMessage || getBlockedMessage();
    
    // Determine the button content
    const buttonContent = (
      <Button
        ref={ref}
        disabled={isBlocked}
        className={cn(
          shouldShowWarning && 'border-warning/50',
          className
        )}
        {...props}
      >
        {isBlocked && <Lock className="h-4 w-4 me-2" />}
        {shouldShowWarning && !isBlocked && <AlertTriangle className="h-4 w-4 me-2 text-warning" />}
        {children}
      </Button>
    );
    
    // If blocked or has warning, wrap with tooltip
    if (isBlocked || (shouldShowWarning && message)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={isBlocked ? 'cursor-not-allowed' : undefined}>
                {buttonContent}
              </span>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-xs text-center"
            >
              <p>{message}</p>
              {isBlocked && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enforcement mode: Abort
                </p>
              )}
              {shouldShowWarning && enforcementMode === 'auto_downgrade' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cost-saving mode will be applied automatically
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return buttonContent;
  }
);

BudgetLockedButton.displayName = 'BudgetLockedButton';
