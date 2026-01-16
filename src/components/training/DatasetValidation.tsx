import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Loader2,
  FileCheck,
  Info,
  Zap,
} from 'lucide-react';
import { TrainingDataset, TrainingPair } from '@/services/trainingService';
import { useTrainingPairs } from '@/hooks/useTraining';

interface DatasetValidationProps {
  dataset: TrainingDataset;
  onValidationComplete?: (isValid: boolean) => void;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  pairIndex?: number;
  field?: string;
}

const MAX_CONTEXT_TOKENS = 4096; // GPT-3.5 default
const MIN_EXAMPLES = 10;
const MAX_EXAMPLES = 50000;

export function DatasetValidation({ dataset, onValidationComplete }: DatasetValidationProps) {
  const { t } = useTranslation();
  const { data: pairsData, isLoading } = useTrainingPairs(dataset.id, 1, 1000);
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  const pairs = pairsData?.data || [];

  const validationResults = useMemo(() => {
    const issues: ValidationIssue[] = [];
    let validCount = 0;
    let totalTokens = 0;
    const tokenCounts: number[] = [];

    // Check minimum examples
    if (pairs.length < MIN_EXAMPLES) {
      issues.push({
        type: 'error',
        message: `Dataset has ${pairs.length} examples. Minimum required: ${MIN_EXAMPLES}`,
      });
    }

    // Check maximum examples
    if (pairs.length > MAX_EXAMPLES) {
      issues.push({
        type: 'warning',
        message: `Dataset has ${pairs.length} examples. Consider splitting for better training.`,
      });
    }

    // Validate each pair
    pairs.forEach((pair, index) => {
      const pairTokens = pair.tokenCount || estimateTokenCount(pair);
      tokenCounts.push(pairTokens);
      totalTokens += pairTokens;

      // Check if messages are empty
      if (!pair.userMessage?.trim()) {
        issues.push({
          type: 'error',
          message: `Empty user message`,
          pairIndex: index,
          field: 'userMessage',
        });
      }

      if (!pair.assistantMessage?.trim()) {
        issues.push({
          type: 'error',
          message: `Empty assistant message`,
          pairIndex: index,
          field: 'assistantMessage',
        });
      }

      // Check token limits
      if (pairTokens > MAX_CONTEXT_TOKENS) {
        issues.push({
          type: 'warning',
          message: `Example exceeds context limit (${pairTokens} > ${MAX_CONTEXT_TOKENS} tokens)`,
          pairIndex: index,
        });
      }

      // Check for very short responses
      if (pair.assistantMessage && pair.assistantMessage.length < 10) {
        issues.push({
          type: 'warning',
          message: `Very short assistant response (${pair.assistantMessage.length} chars)`,
          pairIndex: index,
          field: 'assistantMessage',
        });
      }

      // Check for validation errors from server
      if (pair.validationErrors && pair.validationErrors.length > 0) {
        pair.validationErrors.forEach((err) => {
          issues.push({
            type: 'error',
            message: err,
            pairIndex: index,
          });
        });
      }

      // Count valid pairs
      if (pair.isValid !== false) {
        validCount++;
      }
    });

    // Check for duplicate pairs
    const seenPairs = new Set<string>();
    pairs.forEach((pair, index) => {
      const key = `${pair.userMessage}::${pair.assistantMessage}`;
      if (seenPairs.has(key)) {
        issues.push({
          type: 'warning',
          message: `Duplicate example detected`,
          pairIndex: index,
        });
      }
      seenPairs.add(key);
    });

    // Add info about token distribution
    if (tokenCounts.length > 0) {
      const avgTokens = Math.round(totalTokens / tokenCounts.length);
      const maxTokens = Math.max(...tokenCounts);
      const minTokens = Math.min(...tokenCounts);

      issues.push({
        type: 'info',
        message: `Token stats: avg ${avgTokens}, min ${minTokens}, max ${maxTokens}`,
      });
    }

    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');
    const infos = issues.filter((i) => i.type === 'info');

    const isValid = errors.length === 0 && pairs.length >= MIN_EXAMPLES;
    const qualityScore = calculateQualityScore(validCount, pairs.length, errors.length, warnings.length);

    return {
      isValid,
      qualityScore,
      errors,
      warnings,
      infos,
      totalPairs: pairs.length,
      validPairs: validCount,
      totalTokens,
      avgTokensPerPair: pairs.length > 0 ? Math.round(totalTokens / pairs.length) : 0,
    };
  }, [pairs]);

  const handleValidate = () => {
    setIsValidating(true);
    // Simulate validation delay
    setTimeout(() => {
      setIsValidating(false);
      setValidationComplete(true);
      onValidationComplete?.(validationResults.isValid);
    }, 1000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Dataset Validation
        </CardTitle>
        <CardDescription>
          Validate your training data before fine-tuning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dataset Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Total Pairs"
            value={validationResults.totalPairs}
            status={validationResults.totalPairs >= MIN_EXAMPLES ? 'success' : 'error'}
          />
          <SummaryCard
            label="Valid Pairs"
            value={validationResults.validPairs}
            status={
              validationResults.validPairs === validationResults.totalPairs
                ? 'success'
                : 'warning'
            }
          />
          <SummaryCard
            label="Total Tokens"
            value={validationResults.totalTokens.toLocaleString()}
          />
          <SummaryCard
            label="Avg Tokens/Pair"
            value={validationResults.avgTokensPerPair}
            status={validationResults.avgTokensPerPair > MAX_CONTEXT_TOKENS ? 'warning' : 'default'}
          />
        </div>

        {/* Quality Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Quality Score</span>
            <span className="text-sm text-muted-foreground">
              {validationResults.qualityScore}%
            </span>
          </div>
          <Progress value={validationResults.qualityScore} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Based on validation errors, warnings, and data completeness
          </p>
        </div>

        {/* Validation Button */}
        {!validationComplete && (
          <Button onClick={handleValidate} disabled={isValidating} className="w-full">
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Validation
              </>
            )}
          </Button>
        )}

        {/* Validation Results */}
        {validationComplete && (
          <div className="space-y-4">
            {/* Overall Status */}
            {validationResults.isValid ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Dataset is Valid</AlertTitle>
                <AlertDescription>
                  Your dataset is ready for fine-tuning. Review any warnings below for
                  potential improvements.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Validation Failed</AlertTitle>
                <AlertDescription>
                  Please fix the errors below before starting training.
                </AlertDescription>
              </Alert>
            )}

            {/* Issues List */}
            <div className="space-y-4">
              {/* Errors */}
              {validationResults.errors.length > 0 && (
                <IssueSection
                  title="Errors"
                  issues={validationResults.errors}
                  icon={<AlertCircle className="h-4 w-4 text-destructive" />}
                  variant="destructive"
                />
              )}

              {/* Warnings */}
              {validationResults.warnings.length > 0 && (
                <IssueSection
                  title="Warnings"
                  issues={validationResults.warnings}
                  icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  variant="warning"
                />
              )}

              {/* Info */}
              {validationResults.infos.length > 0 && (
                <IssueSection
                  title="Information"
                  issues={validationResults.infos}
                  icon={<Info className="h-4 w-4 text-blue-500" />}
                  variant="info"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  status = 'default',
}: {
  label: string;
  value: string | number;
  status?: 'default' | 'success' | 'warning' | 'error';
}) {
  const statusColors = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    error: 'bg-destructive/10 border-destructive/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function IssueSection({
  title,
  issues,
  icon,
  variant,
}: {
  title: string;
  issues: ValidationIssue[];
  icon: React.ReactNode;
  variant: 'destructive' | 'warning' | 'info';
}) {
  const badgeVariants = {
    destructive: 'destructive' as const,
    warning: 'secondary' as const,
    info: 'outline' as const,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
        <Badge variant={badgeVariants[variant]}>{issues.length}</Badge>
      </div>
      <ScrollArea className="h-[150px]">
        <div className="space-y-1">
          {issues.map((issue, index) => (
            <div
              key={index}
              className="text-sm p-2 rounded bg-muted/50 flex items-start gap-2"
            >
              <span className="flex-1">{issue.message}</span>
              {issue.pairIndex !== undefined && (
                <Badge variant="outline" className="text-xs">
                  Row {issue.pairIndex + 1}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function estimateTokenCount(pair: TrainingPair): number {
  const systemTokens = pair.systemMessage ? Math.ceil(pair.systemMessage.length / 4) : 0;
  const userTokens = Math.ceil(pair.userMessage.length / 4);
  const assistantTokens = Math.ceil(pair.assistantMessage.length / 4);
  return systemTokens + userTokens + assistantTokens + 10; // +10 for message tokens
}

function calculateQualityScore(
  validPairs: number,
  totalPairs: number,
  errorCount: number,
  warningCount: number
): number {
  if (totalPairs === 0) return 0;

  const validRatio = validPairs / totalPairs;
  const errorPenalty = Math.min(errorCount * 5, 50);
  const warningPenalty = Math.min(warningCount * 2, 20);

  const score = Math.max(0, Math.round(validRatio * 100 - errorPenalty - warningPenalty));
  return Math.min(score, 100);
}
