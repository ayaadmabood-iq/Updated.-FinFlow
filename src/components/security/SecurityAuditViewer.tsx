// Security Audit Viewer - Admin dashboard for security event monitoring

import { useState } from 'react';
import { useSecurityLogs, useSecuritySummary, type SecurityAuditLogEntry, type ActionCategory, type SeverityLevel } from '@/hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Download, 
  Lock, 
  UserCheck, 
  FileText, 
  RefreshCw,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';

const severityColors: Record<SeverityLevel, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  emergency: 'bg-destructive text-destructive-foreground',
};

const categoryIcons: Record<ActionCategory, typeof Shield> = {
  access: Eye,
  export: Download,
  permission: Lock,
  security: Shield,
  processing: FileText,
  authentication: UserCheck,
};

export function SecurityAuditViewer() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [piiOnlyFilter, setPiiOnlyFilter] = useState(false);
  const [exportOnlyFilter, setExportOnlyFilter] = useState(false);

  const filters = {
    actionCategory: categoryFilter !== 'all' ? categoryFilter as ActionCategory : undefined,
    severityLevel: severityFilter !== 'all' ? severityFilter as SeverityLevel : undefined,
    startDate: dateFilter || undefined,
    piiAccessedOnly: piiOnlyFilter || undefined,
    dataExportedOnly: exportOnlyFilter || undefined,
  };

  const { data: logsData, isLoading, refetch } = useSecurityLogs(page, 25, filters);
  const { data: summary, isLoading: summaryLoading } = useSecuritySummary();

  const totalPages = Math.ceil((logsData?.total || 0) / 25);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Events (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-destructive">{summary?.criticalEvents || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-warning" />
              PII Access (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-warning">{summary?.piiAccessCount || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Data Exports (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-primary">{summary?.exportCount || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{logsData?.total || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Audit Log
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>Monitor and investigate security events across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter row */}
          <div className="flex flex-wrap gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="access">Access</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="permission">Permission</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-40"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="From date"
            />

            <Button
              variant={piiOnlyFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPiiOnlyFilter(!piiOnlyFilter)}
            >
              <Eye className="h-4 w-4 mr-2" />
              PII Only
            </Button>

            <Button
              variant={exportOnlyFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportOnlyFilter(!exportOnlyFilter)}
            >
              <Download className="h-4 w-4 mr-2" />
              Exports Only
            </Button>
          </div>

          {/* Events list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : logsData?.data.length ? (
            <div className="space-y-2">
              {logsData.data.map((log) => (
                <SecurityEventRow key={log.id} event={log} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No security events found</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({logsData?.total} total events)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityEventRow({ event }: { event: SecurityAuditLogEntry }) {
  const Icon = categoryIcons[event.actionCategory] || Shield;

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${severityColors[event.severityLevel]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{event.action}</span>
            <Badge variant="outline" className={severityColors[event.severityLevel]}>
              {event.severityLevel}
            </Badge>
            {event.piiAccessed && (
              <Badge variant="outline" className="bg-warning/10 text-warning">
                PII
              </Badge>
            )}
            {event.dataExported && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Export
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{event.userName}</span> • {event.resourceType}: {event.resourceName}
          </p>
          {event.details && Object.keys(event.details).length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {JSON.stringify(event.details).slice(0, 100)}...
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          {format(new Date(event.createdAt), 'MMM d, yyyy')}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(event.createdAt), 'HH:mm:ss')}
        </p>
        {event.clientIp && (
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {event.clientIp}
          </p>
        )}
      </div>
    </div>
  );
}

export default SecurityAuditViewer;
