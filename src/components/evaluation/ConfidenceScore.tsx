import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ConfidenceScoreProps {
  score: number;
  sourceRelevance?: number;
  citationDensity?: number;
  verificationScore?: number;
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceScore({
  score,
  sourceRelevance,
  citationDensity,
  verificationScore,
  showBreakdown = false,
  size = "md",
  className,
}: ConfidenceScoreProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (value: number) => {
    if (value >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (value >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getScoreIcon = (value: number) => {
    if (value >= 80) return <CheckCircle className="h-4 w-4" />;
    if (value >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return "High Confidence";
    if (value >= 60) return "Medium Confidence";
    return "Low Confidence";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        getScoreBg(score),
        getScoreColor(score),
        sizeClasses[size],
        className
      )}
    >
      {getScoreIcon(score)}
      <span>{Math.round(score)}%</span>
    </div>
  );

  if (!showBreakdown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{getScoreLabel(score)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {content}
        <span className="text-sm text-muted-foreground">{getScoreLabel(score)}</span>
      </div>
      
      {(sourceRelevance !== undefined || citationDensity !== undefined || verificationScore !== undefined) && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {sourceRelevance !== undefined && (
            <div className="space-y-1">
              <div className="text-muted-foreground">Source Relevance</div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getScoreBg(sourceRelevance))}
                    style={{ width: `${sourceRelevance}%` }}
                  />
                </div>
                <span className={getScoreColor(sourceRelevance)}>{Math.round(sourceRelevance)}%</span>
              </div>
            </div>
          )}
          
          {citationDensity !== undefined && (
            <div className="space-y-1">
              <div className="text-muted-foreground">Citation Density</div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getScoreBg(citationDensity))}
                    style={{ width: `${citationDensity}%` }}
                  />
                </div>
                <span className={getScoreColor(citationDensity)}>{Math.round(citationDensity)}%</span>
              </div>
            </div>
          )}
          
          {verificationScore !== undefined && (
            <div className="space-y-1">
              <div className="text-muted-foreground">Verification</div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getScoreBg(verificationScore))}
                    style={{ width: `${verificationScore}%` }}
                  />
                </div>
                <span className={getScoreColor(verificationScore)}>{Math.round(verificationScore)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
