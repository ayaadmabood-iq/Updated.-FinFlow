import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Zap,
} from 'lucide-react';
import { WorkflowExecution, ExecutionStatus } from '@/services/workflowService';
import { useWorkflowExecutions } from '@/hooks/useWorkflows';
import { formatDistanceToNow, format } from 'date-fns';

interface ExecutionHistoryProps {
  projectId: string;
  workflowId?: string;
}

const STATUS_CONFIG: Record<ExecutionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-gray-500', label: 'Pending' },
  running: { icon: <Zap className="h-4 w-4 animate-pulse" />, color: 'bg-blue-500', label: 'Running' },
  completed: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500', label: 'Failed' },
  skipped: { icon: <AlertCircle className="h-4 w-4" />, color: 'bg-yellow-500', label: 'Skipped' },
  cancelled: { icon: <XCircle className="h-4 w-4" />, color: 'bg-gray-500', label: 'Cancelled' },
};

export function ExecutionHistory({ projectId, workflowId }: ExecutionHistoryProps) {
  const { data: executions, isLoading } = useWorkflowExecutions(projectId, { 
    workflowId,
    limit: 50,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Execution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Execution History
          {executions && executions.length > 0 && (
            <Badge variant="secondary">{executions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!executions || executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No executions yet</p>
            <p className="text-sm">Workflow runs will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {executions.map((execution) => (
                <ExecutionItem key={execution.id} execution={execution} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutionItem({ execution }: { execution: WorkflowExecution }) {
  const statusConfig = STATUS_CONFIG[execution.status];
  const actionsExecuted = execution.actions_executed || [];

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${statusConfig.color} text-white`}>
            {statusConfig.icon}
          </div>
          <Badge variant="secondary">{statusConfig.label}</Badge>
          {execution.document_id && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Document linked
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        {execution.started_at && (
          <p>Started: {format(new Date(execution.started_at), 'PPpp')}</p>
        )}
        {execution.completed_at && (
          <p>Completed: {format(new Date(execution.completed_at), 'PPpp')}</p>
        )}
        {execution.duration_ms && (
          <p>Duration: {execution.duration_ms}ms</p>
        )}
        {actionsExecuted.length > 0 && (
          <p>Actions: {actionsExecuted.length} executed</p>
        )}
        {execution.retry_count > 0 && (
          <p>Retries: {execution.retry_count}</p>
        )}
      </div>

      {execution.error_message && (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
          {execution.error_message}
        </div>
      )}
    </div>
  );
}
