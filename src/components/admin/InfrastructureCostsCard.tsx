import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Zap, 
  TrendingUp, 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface CostMetrics {
  daily: Array<{ date: string; totalCost: number; totalTokens: number; documentsProcessed: number }>;
  monthly: { totalCost: number; totalTokens: number; avgCostPerDocument: number };
  byStage: Array<{ stage: string; totalCost: number; avgCost: number; totalTokens: number }>;
}

interface PipelineHealthMetrics {
  stages: Array<{
    stage: string;
    totalLast24h: number;
    successful: number;
    failed: number;
    failureRatePercent: number;
    avgDurationMs: number;
  }>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  unhealthyStages: string[];
}

interface ExpensiveDocument {
  documentId: string;
  documentName: string;
  projectName: string;
  processingCostUsd: number;
  totalTokensUsed: number;
  createdAt: string;
}

interface InfrastructureCostsProps {
  costMetrics?: CostMetrics;
  pipelineHealth?: PipelineHealthMetrics;
  expensiveDocuments?: ExpensiveDocument[];
  totalAiSpendUsd?: number;
  totalTokensUsed?: number;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function InfrastructureCostsCard({ 
  costMetrics, 
  pipelineHealth, 
  expensiveDocuments,
  totalAiSpendUsd,
  totalTokensUsed,
  isLoading 
}: InfrastructureCostsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const healthColor = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    critical: 'text-red-500',
  };

  const healthIcon = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    degraded: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    critical: <XCircle className="h-5 w-5 text-red-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAiSpendUsd || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(costMetrics?.monthly.avgCostPerDocument || 0)} avg/doc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(totalTokensUsed || 0)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costMetrics?.monthly.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(costMetrics?.monthly.totalTokens || 0)} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Health</CardTitle>
            {healthIcon[pipelineHealth?.overallHealth || 'healthy']}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${healthColor[pipelineHealth?.overallHealth || 'healthy']}`}>
              {pipelineHealth?.overallHealth || 'Healthy'}
            </div>
            {pipelineHealth?.unhealthyStages && pipelineHealth.unhealthyStages.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pipelineHealth.unhealthyStages.length} stage(s) need attention
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily AI Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costMetrics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-muted-foreground"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  className="text-muted-foreground"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'totalCost' ? formatCurrency(value) : formatTokens(value),
                    name === 'totalCost' ? 'Cost' : 'Tokens'
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCost" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costMetrics?.byStage || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis 
                    type="category" 
                    dataKey="stage" 
                    width={120}
                    tickFormatter={formatStageName}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={formatStageName}
                  />
                  <Bar dataKey="totalCost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Health Details */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Health (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(pipelineHealth?.stages || []).map((stage) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatStageName(stage.stage)}</span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={stage.failureRatePercent > 10 ? "destructive" : stage.failureRatePercent > 5 ? "secondary" : "default"}
                      >
                        {stage.failureRatePercent.toFixed(1)}% errors
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {stage.totalLast24h} runs
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={100 - stage.failureRatePercent} 
                    className="h-2"
                  />
                </div>
              ))}
              {(!pipelineHealth?.stages || pipelineHealth.stages.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pipeline data in the last 24 hours
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Expensive Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Most Expensive Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(expensiveDocuments || []).slice(0, 5).map((doc) => (
              <div key={doc.documentId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.documentName}</p>
                  <p className="text-xs text-muted-foreground">{doc.projectName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{formatCurrency(doc.processingCostUsd)}</p>
                  <p className="text-xs text-muted-foreground">{formatTokens(doc.totalTokensUsed)} tokens</p>
                </div>
              </div>
            ))}
            {(!expensiveDocuments || expensiveDocuments.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cost data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}