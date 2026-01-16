import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Plus, 
  LayoutTemplate, 
  CheckSquare, 
  History,
  TrendingUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WorkflowList } from './WorkflowList';
import { WorkflowTemplates } from './WorkflowTemplates';
import { TaskList } from './TaskList';
import { ExecutionHistory } from './ExecutionHistory';
import { 
  useWorkflowRules, 
  useCreateWorkflowRule, 
  useUpdateWorkflowRule,
  useDeleteWorkflowRule,
  useToggleWorkflowStatus,
  useTriggerWorkflow,
  useWorkflowStats,
} from '@/hooks/useWorkflows';
import { WorkflowRule, WorkflowStatus } from '@/services/workflowService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorkflowDashboardProps {
  projectId: string;
}

export function WorkflowDashboard({ projectId }: WorkflowDashboardProps) {
  const [activeTab, setActiveTab] = useState('workflows');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRule | null>(null);
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);

  const { data: workflows, isLoading } = useWorkflowRules(projectId);
  const { data: stats } = useWorkflowStats(projectId);
  const createWorkflow = useCreateWorkflowRule(projectId);
  const updateWorkflow = useUpdateWorkflowRule(projectId);
  const deleteWorkflow = useDeleteWorkflowRule(projectId);
  const toggleStatus = useToggleWorkflowStatus(projectId);
  const triggerWorkflow = useTriggerWorkflow();

  const handleSaveWorkflow = (workflow: Partial<WorkflowRule>) => {
    if (editingWorkflow) {
      updateWorkflow.mutate(
        { ruleId: editingWorkflow.id, updates: workflow },
        { onSuccess: () => { setIsBuilderOpen(false); setEditingWorkflow(null); } }
      );
    } else {
      createWorkflow.mutate(workflow as any, {
        onSuccess: () => setIsBuilderOpen(false),
      });
    }
  };

  const handleEdit = (workflow: WorkflowRule) => {
    setEditingWorkflow(workflow);
    setIsBuilderOpen(true);
  };

  const handleDelete = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      deleteWorkflow.mutate(workflowId);
    }
  };

  const handleToggleStatus = (workflowId: string, status: WorkflowStatus) => {
    toggleStatus.mutate({ ruleId: workflowId, status });
  };

  const handleTrigger = (workflowId: string) => {
    triggerWorkflow.mutate({ workflowId, eventData: { manual: true } });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold">{stats?.activeWorkflows || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{stats?.totalExecutions || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats?.totalExecutions 
                    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) 
                    : 100}%
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold">{stats?.pendingTasks || 0}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="workflows" className="gap-2">
              <Zap className="h-4 w-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {activeTab === 'workflows' && (
            <Button onClick={() => { setEditingWorkflow(null); setIsBuilderOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          )}
        </div>

        <TabsContent value="workflows">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : (
            <WorkflowList
              workflows={workflows || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onViewHistory={(id) => { setHistoryWorkflowId(id); setActiveTab('history'); }}
              onTrigger={handleTrigger}
            />
          )}
        </TabsContent>

        <TabsContent value="templates">
          <WorkflowTemplates 
            projectId={projectId} 
            onWorkflowCreated={() => setActiveTab('workflows')}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskList projectId={projectId} />
        </TabsContent>

        <TabsContent value="history">
          <ExecutionHistory projectId={projectId} workflowId={historyWorkflowId || undefined} />
        </TabsContent>
      </Tabs>

      {/* Workflow Builder Dialog */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
            </DialogTitle>
          </DialogHeader>
          <WorkflowBuilder
            initialWorkflow={editingWorkflow || undefined}
            onSave={handleSaveWorkflow}
            onCancel={() => { setIsBuilderOpen(false); setEditingWorkflow(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
