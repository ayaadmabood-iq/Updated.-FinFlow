import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Sparkles,
  BarChart3,
  Table as TableIcon,
  Hash,
  List,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { AnalyticsQuery } from '@/services/analyticsService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

interface NaturalLanguageQueryProps {
  history: AnalyticsQuery[];
  isLoading: boolean;
  onExecute: (query: string) => void;
  isExecuting: boolean;
  lastResult: AnalyticsQuery | null;
}

const EXAMPLE_QUERIES = [
  'Show total expenses by month',
  'Which documents have the highest risk score?',
  'List all contracts expiring in the next 30 days',
  'What is the average processing time per document type?',
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(221.2 83.2% 53.3%)',
  'hsl(142.1 76.2% 36.3%)',
  'hsl(0 84.2% 60.2%)',
];

export function NaturalLanguageQuery({
  history,
  isLoading,
  onExecute,
  isExecuting,
  lastResult,
}: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onExecute(query.trim());
    }
  };

  const renderResult = (result: AnalyticsQuery) => {
    if (!result.is_successful) {
      return (
        <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <p>{result.error_message || 'Query failed'}</p>
        </div>
      );
    }

    const data = result.result_data;
    const config = result.visualization_config || {};

    switch (result.result_type) {
      case 'chart':
        const chartType = config.chartType || 'bar';
        
        if (chartType === 'bar') {
          return (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(data) ? data : []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey={config.xAxis || 'name'} className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey={config.yAxis || 'value'}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }

        if (chartType === 'line') {
          return (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.isArray(data) ? data : []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey={config.xAxis || 'name'} className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={config.yAxis || 'value'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        }

        if (chartType === 'pie') {
          return (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Array.isArray(data) ? data : []}
                    dataKey={config.yAxis || 'value'}
                    nameKey={config.xAxis || 'name'}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {(Array.isArray(data) ? data : []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        }

        return null;

      case 'table':
        const columns = config.columns || (Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : []);
        return (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col: string) => (
                    <TableHead key={col} className="capitalize">
                      {col.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(data) ? data : []).slice(0, 10).map((row: any, i: number) => (
                  <TableRow key={i}>
                    {columns.map((col: string) => (
                      <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'metric':
        const metricValue = typeof data === 'object' && data !== null && !Array.isArray(data) 
          ? (data as { value?: unknown }).value 
          : data;
        const metricLabel = typeof data === 'object' && data !== null && !Array.isArray(data)
          ? (data as { label?: string }).label
          : undefined;
        return (
          <div className="flex items-center gap-4 p-6 bg-muted rounded-lg">
            <Hash className="h-8 w-8 text-primary" />
            <div>
              <div className="text-3xl font-bold">{String(metricValue ?? '')}</div>
              {(config.label || metricLabel) && <div className="text-muted-foreground">{config.label || metricLabel}</div>}
            </div>
          </div>
        );

      case 'list':
        return (
          <ul className="space-y-2">
            {(Array.isArray(data) ? data : []).map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                <span className="font-medium text-primary">{i + 1}.</span>
                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
              </li>
            ))}
          </ul>
        );

      default:
        return (
          <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  const getResultTypeIcon = (type: string | null) => {
    switch (type) {
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'table':
        return <TableIcon className="h-4 w-4" />;
      case 'metric':
        return <Hash className="h-4 w-4" />;
      case 'list':
        return <List className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Natural Language Analytics
        </CardTitle>
        <CardDescription>
          Ask questions about your data in plain English
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., Show me total expenses by vendor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isExecuting || !query.trim()}>
            {isExecuting ? (
              <span className="animate-pulse">Analyzing...</span>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Query
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example) => (
            <Button
              key={example}
              variant="outline"
              size="sm"
              onClick={() => setQuery(example)}
              className="text-xs"
            >
              {example}
            </Button>
          ))}
        </div>

        {isExecuting && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        )}

        {lastResult && !isExecuting && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              {getResultTypeIcon(lastResult.result_type)}
              <span className="font-medium">Result</span>
              <Badge variant="outline" className="text-xs capitalize">
                {lastResult.result_type || 'unknown'}
              </Badge>
              {lastResult.execution_time_ms && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {lastResult.execution_time_ms}ms
                </span>
              )}
            </div>
            {renderResult(lastResult)}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-Generated Result
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Recent Queries</h4>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {history.slice(0, 10).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuery(q.natural_query)}
                    className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getResultTypeIcon(q.result_type)}
                      <span className="text-sm truncate flex-1">{q.natural_query}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
