import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Zap, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Play, 
  History,
  FileText,
  Calendar,
  Tag,
  Mail,
} from 'lucide-react';
import { WorkflowRule, WorkflowStatus } from '@/services/workflowService';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowListProps {
  workflows: WorkflowRule[];
  onEdit: (workflow: WorkflowRule) => void;
  onDelete: (workflowId: string) => void;
  onToggleStatus: (workflowId: string, status: WorkflowStatus) => void;
  onViewHistory: (workflowId: string) => void;
  onTrigger: (workflowId: string) => void;
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  document_uploaded: <FileText className="h-4 w-4" />,
  document_processed: <FileText className="h-4 w-4" />,
  content_detected: <FileText className="h-4 w-4" />,
  date_approaching: <Calendar className="h-4 w-4" />,
  amount_threshold: <Tag className="h-4 w-4" />,
  keyword_match: <Tag className="h-4 w-4" />,
  ai_classification: <Zap className="h-4 w-4" />,
  manual: <Play className="h-4 w-4" />,
};

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  draft: 'bg-gray-500',
  archived: 'bg-red-500',
};

export function WorkflowList({
  workflows,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewHistory,
  onTrigger,
}: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
          <p className="text-muted-foreground">
            Create your first automation to streamline your document processing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  {TRIGGER_ICONS[workflow.trigger_type] || <Zap className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{workflow.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`${STATUS_COLORS[workflow.status]} text-white`}
                    >
                      {workflow.status}
                    </Badge>
                    {workflow.is_system && (
                      <Badge variant="outline">System</Badge>
                    )}
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      Trigger: {workflow.trigger_type.replace(/_/g, ' ')}
                    </span>
                    <span>
                      {workflow.conditions?.length || 0} conditions
                    </span>
                    <span>
                      {workflow.actions?.length || 0} actions
                    </span>
                    {workflow.execution_count > 0 && (
                      <span>
                        {workflow.execution_count} executions
                      </span>
                    )}
                    {workflow.last_triggered_at && (
                      <span>
                        Last run: {formatDistanceToNow(new Date(workflow.last_triggered_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={workflow.status === 'active'}
                  onCheckedChange={(checked) => 
                    onToggleStatus(workflow.id, checked ? 'active' : 'paused')
                  }
                  disabled={workflow.status === 'archived'}
                />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(workflow)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {workflow.trigger_type === 'manual' && (
                      <DropdownMenuItem onClick={() => onTrigger(workflow.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onViewHistory(workflow.id)}>
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(workflow.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
