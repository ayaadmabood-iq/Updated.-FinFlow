// Audit Log page
import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import type { AuditAction, AuditLogEntry } from '@/types';

const actionColors: Record<AuditAction, string> = {
  create: 'bg-success/10 text-success',
  update: 'bg-primary/10 text-primary',
  delete: 'bg-destructive/10 text-destructive',
  view: 'bg-muted text-muted-foreground',
  export: 'bg-warning/10 text-warning',
  login: 'bg-primary/10 text-primary',
  logout: 'bg-muted text-muted-foreground',
  settings_change: 'bg-warning/10 text-warning',
  budget_check: 'bg-primary/10 text-primary',
  budget_abort: 'bg-destructive/10 text-destructive',
  budget_downgrade: 'bg-warning/10 text-warning',
  budget_safety_block: 'bg-destructive/10 text-destructive',
  budget_check_failed: 'bg-destructive/10 text-destructive',
  processing_timeout: 'bg-warning/10 text-warning',
  security_event: 'bg-destructive/10 text-destructive',
};

function AuditLogItem({ log }: { log: AuditLogEntry }) {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
      role="article"
      aria-label={`${log.action} action on ${log.resourceName} by ${log.userName}`}
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <Badge className={actionColors[log.action]} aria-label={`Action: ${log.action}`}>
          {log.action}
        </Badge>
        <div>
          <p className="text-sm font-medium">{log.resourceName}</p>
          <p className="text-xs text-muted-foreground">by {log.userName}</p>
        </div>
      </div>
      <div className="text-right">
        <time 
          dateTime={log.timestamp}
          className="text-xs text-muted-foreground block"
        >
          {new Date(log.timestamp).toLocaleDateString()}
        </time>
        <time 
          dateTime={log.timestamp}
          className="text-xs text-muted-foreground block"
        >
          {new Date(log.timestamp).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  const { data, isLoading } = useAuditLogs(1, 100, {
    action: actionFilter !== 'all' ? (actionFilter as AuditAction) : undefined,
    resourceType: resourceFilter !== 'all' ? (resourceFilter as AuditLogEntry['resourceType']) : undefined,
  });

  return (
    <DashboardLayout title="Audit Log" description="Track all system activity">
      <div className="space-y-4">
        <div 
          className="flex flex-col sm:flex-row gap-4"
          role="search"
          aria-label="Filter audit logs"
        >
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by action type">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by resource type">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading audit logs">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : data?.data.length ? (
              <VirtualizedList
                items={data.data}
                height={500}
                estimateSize={72}
                getItemKey={(log) => log.id}
                renderItem={(log) => (
                  <div className="pb-2">
                    <AuditLogItem log={log} />
                  </div>
                )}
                aria-label="Audit log entries"
                emptyMessage="No activity found"
              />
            ) : (
              <p 
                className="text-center text-muted-foreground py-8"
                role="status"
                aria-live="polite"
              >
                No activity found
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
