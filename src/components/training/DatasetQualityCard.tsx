import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, XCircle, Database, Lightbulb } from 'lucide-react';

export interface DatasetQualityData {
  totalSamples: number;
  issues: string[];
  qualityScore: number;
  recommendations: string[];
  averageContentLength?: number;
  suggestedSplit: {
    train: number;
    validation: number;
    test: number;
  };
}

interface Props {
  validation: DatasetQualityData | undefined;
  isLoading: boolean;
}

export function DatasetQualityCard({ validation, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (score >= 0.5) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return t('training.qualityExcellent', 'Excellent');
    if (score >= 0.6) return t('training.qualityGood', 'Good');
    if (score >= 0.4) return t('training.qualityFair', 'Fair');
    return t('training.qualityPoor', 'Poor');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('training.datasetQuality', 'Dataset Quality')}
        </CardTitle>
        <CardDescription>
          {t('training.datasetQualityDesc', 'Quality assessment of your training data')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('training.qualityScore', 'Quality Score')}</span>
            <div className="flex items-center gap-2">
              {getScoreIcon(validation.qualityScore)}
              <span className={`text-2xl font-bold ${getScoreColor(validation.qualityScore)}`}>
                {(validation.qualityScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <Progress value={validation.qualityScore * 100} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {getScoreLabel(validation.qualityScore)}
          </p>
        </div>

        {/* Sample Counts */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-green-600">{validation.suggestedSplit.train}</p>
            <p className="text-xs text-muted-foreground">{t('training.trainingSamples', 'Training')}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-blue-600">{validation.suggestedSplit.validation}</p>
            <p className="text-xs text-muted-foreground">{t('training.validationSamples', 'Validation')}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-purple-600">{validation.suggestedSplit.test}</p>
            <p className="text-xs text-muted-foreground">{t('training.testSamples', 'Test')}</p>
          </div>
        </div>

        {/* Issues */}
        {validation.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t('training.issuesFound', 'Issues Found')}
            </h4>
            <div className="space-y-1">
              {validation.issues.map((issue, i) => (
                <Alert key={i} variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {validation.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              {t('training.recommendations', 'Recommendations')}
            </h4>
            <ul className="space-y-1">
              {validation.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        {validation.averageContentLength !== undefined && (
          <div className="flex items-center justify-between text-sm border-t pt-4">
            <span className="text-muted-foreground">{t('training.avgContentLength', 'Avg. Content Length')}</span>
            <Badge variant="outline">{validation.averageContentLength.toLocaleString()} chars</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
