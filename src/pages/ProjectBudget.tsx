import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  PieChart,
  Lightbulb,
  History,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Calendar,
  Target,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/hooks/useProjects';
import {
  useBudgetSummary,
  useCostBreakdown,
  useDailySpending,
  useBudgetDecisions,
} from '@/hooks/useBudget';
import { budgetService } from '@/services/budgetService';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function ProjectBudget() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const projectId = id || '';

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: summary, isLoading: summaryLoading } = useBudgetSummary(projectId);
  const { data: breakdown, isLoading: breakdownLoading } = useCostBreakdown(projectId);
  const { data: dailyData, isLoading: dailyLoading } = useDailySpending(projectId, 30);
  const { data: decisions, isLoading: decisionsLoading } = useBudgetDecisions(projectId, 20);

  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [decisionsOpen, setDecisionsOpen] = useState(false);

  const isLoading = projectLoading || summaryLoading;

  if (isLoading) {
    return (
      <DashboardLayout title={t('common.loading')} description="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project || !summary) {
    return (
      <DashboardLayout title={t('common.noResults')} description="">
        <Card className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button asChild>
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('common.back')}
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const statusColor = budgetService.getStatusColor(summary.status);
  const pieData = breakdown?.map((item) => ({
    name: item.operationType,
    value: item.totalCost,
  })) || [];

  // Calculate savings from decisions
  const savings = {
    totalSavedUsd: decisions?.reduce((acc, d) => acc + (d.costSavingsPercent || 0) * (d.estimatedCostUsd || 0) / 100, 0) || 0,
    qualityPreservedPercent: decisions?.length 
      ? 100 - (decisions.reduce((acc, d) => acc + (d.qualityImpactPercent || 0), 0) / decisions.length)
      : 100,
    downgradeCount: decisions?.filter(d => d.decisionType === 'auto_downgrade').length || 0,
  };

  const filteredDecisions = decisions?.filter(d => 
    decisionFilter === 'all' || d.decisionType === decisionFilter
  ) || [];

  return (
    <DashboardLayout
      title={`${project.name} - Budget`}
      description="Monitor spending, projections, and cost optimization"
      actions={
        <Button variant="outline" asChild>
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4 me-2" />
            Back to Project
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Budget</p>
                  <p className="text-2xl font-bold mt-1">
                    {budgetService.formatCurrency(summary.monthlyBudget)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Spending</p>
                  <p className="text-2xl font-bold mt-1">
                    {budgetService.formatCurrency(summary.currentSpending)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.budgetUsedPercent.toFixed(1)}% used
                  </p>
                </div>
                <div className={`p-3 rounded-full ${statusColor}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold mt-1">
                    {budgetService.formatCurrency(summary.remainingBudget)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.daysRemaining} days left
                  </p>
                </div>
                <div className="p-3 rounded-full bg-success/10">
                  <Target className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-2 ${statusColor}`}>
                    {summary.status.replace('_', ' ')}
                  </Badge>
                  {summary.daysUntilExhausted && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ~{summary.daysUntilExhausted} days until exhausted
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(summary.budgetUsedPercent, 100)} className="h-4" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{budgetService.formatCurrency(summary.currentSpending)} spent</span>
              <span>{budgetService.formatCurrency(summary.remainingBudget)} remaining</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projections Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projections
              </CardTitle>
              <CardDescription>Month-end spending forecast</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily burn rate</span>
                <span className="font-medium">{budgetService.formatCurrency(summary.dailyBurnRate)}/day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Projected month-end</span>
                <span className={`font-medium ${summary.projectedMonthEnd > summary.monthlyBudget ? 'text-destructive' : ''}`}>
                  {budgetService.formatCurrency(summary.projectedMonthEnd)}
                </span>
              </div>
              {summary.projectedMonthEnd > summary.monthlyBudget && (
                <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    Projected to exceed budget by {budgetService.formatCurrency(summary.projectedMonthEnd - summary.monthlyBudget)}
                  </p>
                </div>
              )}

              {/* Daily Spending Chart */}
              {!dailyLoading && dailyData && dailyData.length > 0 && (
                <div className="h-48 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        formatter={(value: number) => [budgetService.formatCurrency(value), 'Cost']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
              <CardDescription>Spending by operation type</CardDescription>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pieData.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => budgetService.formatCurrency(value)}
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {breakdown?.map((item, index) => (
                      <div key={item.operationType} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{item.operationType}</span>
                        </div>
                        <span className="font-medium">{budgetService.formatCurrency(item.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <PieChart className="h-8 w-8 mb-2" />
                  <p>No cost data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Savings Analysis Card */}
        {savings.downgradeCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-success" />
                Savings Analysis
              </CardTitle>
              <CardDescription>Cost optimizations applied this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-success/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success">
                    {budgetService.formatCurrency(savings.totalSavedUsd)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">
                    {savings.qualityPreservedPercent.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Quality Preserved</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">
                    {savings.downgradeCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Auto-Downgrades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.status === 'at_risk' && (
              <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium">Budget at risk</p>
                  <p className="text-sm text-muted-foreground">
                    Consider enabling auto-downgrade mode or reducing operation frequency.
                  </p>
                </div>
              </div>
            )}
            {summary.status === 'over_budget' && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Budget exceeded</p>
                  <p className="text-sm text-muted-foreground">
                    Increase your monthly budget or switch to abort mode to prevent further spending.
                  </p>
                </div>
              </div>
            )}
            {summary.status === 'under_budget' && (
              <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium">On track</p>
                  <p className="text-sm text-muted-foreground">
                    Your spending is within healthy limits. Continue monitoring as needed.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Optimize with balanced strategy</p>
                <p className="text-sm text-muted-foreground">
                  The balanced baseline strategy typically saves 20-40% cost while preserving 95%+ quality.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Decisions Log */}
        <Collapsible open={decisionsOpen} onOpenChange={setDecisionsOpen}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Decisions
                  </CardTitle>
                  <CardDescription>Budget enforcement actions taken</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="auto_downgrade">Auto-Downgrade</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="abort">Abort</SelectItem>
                    </SelectContent>
                  </Select>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {decisionsOpen ? 'Collapse' : 'Expand'}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {decisionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredDecisions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Cost Impact</TableHead>
                        <TableHead className="text-right">Quality Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDecisions.map((decision) => (
                        <TableRow key={decision.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(decision.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {decision.decisionType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {decision.reason}
                          </TableCell>
                          <TableCell className="text-right">
                            {decision.costSavingsPercent
                              ? <span className="text-success">-{decision.costSavingsPercent.toFixed(1)}%</span>
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {decision.qualityImpactPercent
                              ? <span className="text-warning">-{decision.qualityImpactPercent.toFixed(1)}%</span>
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mb-2" />
                    <p>No decisions recorded yet</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </DashboardLayout>
  );
}
