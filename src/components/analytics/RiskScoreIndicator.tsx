import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Minus } from 'lucide-react';

interface RiskScoreIndicatorProps {
  riskScore: number | null;
  opportunityScore: number | null;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskScoreIndicator({
  riskScore,
  opportunityScore,
  showLabels = false,
  size = 'md',
  className,
}: RiskScoreIndicatorProps) {
  const getRiskLevel = (score: number | null): { level: string; color: string; bgColor: string } => {
    if (score === null) return { level: 'Unknown', color: 'text-muted-foreground', bgColor: 'bg-muted' };
    if (score >= 70) return { level: 'High', color: 'text-destructive', bgColor: 'bg-destructive/10' };
    if (score >= 40) return { level: 'Medium', color: 'text-yellow-600 dark:text-yellow-500', bgColor: 'bg-yellow-500/10' };
    return { level: 'Low', color: 'text-green-600 dark:text-green-500', bgColor: 'bg-green-500/10' };
  };

  const getOpportunityLevel = (score: number | null): { level: string; color: string; bgColor: string } => {
    if (score === null) return { level: 'Unknown', color: 'text-muted-foreground', bgColor: 'bg-muted' };
    if (score >= 70) return { level: 'High', color: 'text-green-600 dark:text-green-500', bgColor: 'bg-green-500/10' };
    if (score >= 40) return { level: 'Medium', color: 'text-blue-600 dark:text-blue-500', bgColor: 'bg-blue-500/10' };
    return { level: 'Low', color: 'text-muted-foreground', bgColor: 'bg-muted' };
  };

  const riskInfo = getRiskLevel(riskScore);
  const opportunityInfo = getOpportunityLevel(opportunityScore);

  const sizeClasses = {
    sm: 'h-2 w-12',
    md: 'h-3 w-16',
    lg: 'h-4 w-24',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (riskScore === null && opportunityScore === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn('text-muted-foreground', className)}>
              <Minus className={cn(iconSizes[size], 'mr-1')} />
              Not Scored
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This document hasn't been analyzed yet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {riskScore !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={cn(iconSizes[size], riskInfo.color)} />
                <div className={cn('rounded-full overflow-hidden', riskInfo.bgColor, sizeClasses[size])}>
                  <div
                    className={cn('h-full transition-all', {
                      'bg-destructive': riskScore >= 70,
                      'bg-yellow-500': riskScore >= 40 && riskScore < 70,
                      'bg-green-500': riskScore < 40,
                    })}
                    style={{ width: `${riskScore}%` }}
                  />
                </div>
                {showLabels && (
                  <span className={cn('text-xs font-medium', riskInfo.color)}>
                    {riskInfo.level}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Risk Score: {riskScore}% ({riskInfo.level})</p>
            </TooltipContent>
          </Tooltip>
        )}

        {opportunityScore !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <TrendingUp className={cn(iconSizes[size], opportunityInfo.color)} />
                <div className={cn('rounded-full overflow-hidden', opportunityInfo.bgColor, sizeClasses[size])}>
                  <div
                    className={cn('h-full transition-all', {
                      'bg-green-500': opportunityScore >= 70,
                      'bg-blue-500': opportunityScore >= 40 && opportunityScore < 70,
                      'bg-muted-foreground': opportunityScore < 40,
                    })}
                    style={{ width: `${opportunityScore}%` }}
                  />
                </div>
                {showLabels && (
                  <span className={cn('text-xs font-medium', opportunityInfo.color)}>
                    {opportunityInfo.level}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Opportunity Score: {opportunityScore}% ({opportunityInfo.level})</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
