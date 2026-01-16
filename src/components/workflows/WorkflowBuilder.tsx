import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save,
  Zap,
  FileText,
  Mail,
  MessageSquare,
  Webhook,
  Tag,
  CheckSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  WorkflowTriggerType, 
  WorkflowActionType, 
  WorkflowCondition, 
  WorkflowAction,
  WorkflowRule,
} from '@/services/workflowService';
import { useTestWorkflow } from '@/hooks/useWorkflows';

interface WorkflowBuilderProps {
  initialWorkflow?: Partial<WorkflowRule>;
  onSave: (workflow: Partial<WorkflowRule>) => void;
  onCancel: () => void;
}

const TRIGGER_OPTIONS: { value: WorkflowTriggerType; label: string; description: string }[] = [
  { value: 'document_uploaded', label: 'Document Uploaded', description: 'When a new document is uploaded' },
  { value: 'document_processed', label: 'Document Processed', description: 'When document processing completes' },
  { value: 'content_detected', label: 'Content Detected', description: 'When specific content is found in a document' },
  { value: 'date_approaching', label: 'Date Approaching', description: 'When a date field is within X days' },
  { value: 'amount_threshold', label: 'Amount Threshold', description: 'When an amount exceeds a value' },
  { value: 'keyword_match', label: 'Keyword Match', description: 'When specific keywords are found' },
  { value: 'ai_classification', label: 'AI Classification', description: 'When AI classifies document as type' },
  { value: 'manual', label: 'Manual Trigger', description: 'Triggered manually by user' },
];

const ACTION_OPTIONS: { value: WorkflowActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'add_tag', label: 'Add Tag', icon: <Tag className="h-4 w-4" /> },
  { value: 'create_task', label: 'Create Task', icon: <CheckSquare className="h-4 w-4" /> },
  { value: 'generate_summary', label: 'Generate Summary', icon: <FileText className="h-4 w-4" /> },
  { value: 'send_email', label: 'Send Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'send_slack', label: 'Send to Slack', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'call_webhook', label: 'Call Webhook', icon: <Webhook className="h-4 w-4" /> },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Does Not Exist' },
];

export function WorkflowBuilder({ initialWorkflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>(
    initialWorkflow?.trigger_type || 'document_processed'
  );
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    initialWorkflow?.trigger_config || {}
  );
  const [conditions, setConditions] = useState<WorkflowCondition[]>(
    initialWorkflow?.conditions || []
  );
  const [actions, setActions] = useState<WorkflowAction[]>(
    initialWorkflow?.actions || []
  );
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testData, setTestData] = useState('{\n  "document_type": "invoice",\n  "amount": 15000\n}');

  const testWorkflow = useTestWorkflow();

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = (type: WorkflowActionType) => {
    setActions([...actions, { type, config: {} }]);
  };

  const updateAction = (index: number, config: Record<string, unknown>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], config };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...actions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < actions.length) {
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      setActions(newActions);
    }
  };

  const handleTest = () => {
    try {
      const parsedData = JSON.parse(testData);
      testWorkflow.mutate({
        workflow: { trigger_type: triggerType, conditions, actions },
        testData: parsedData,
      });
    } catch {
      // Invalid JSON
    }
  };

  const handleSave = () => {
    onSave({
      ...initialWorkflow,
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      conditions,
      actions,
    });
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'add_tag':
        return (
          <Input
            placeholder="Tag name"
            value={String(action.config.tag || '')}
            onChange={(e) => updateAction(index, { ...action.config, tag: e.target.value })}
          />
        );
      case 'create_task':
        return (
          <div className="space-y-2">
            <Input
              placeholder="Task title"
              value={String(action.config.title || '')}
              onChange={(e) => updateAction(index, { ...action.config, title: e.target.value })}
            />
            <Select
              value={String(action.config.priority || 'medium')}
              onValueChange={(value) => updateAction(index, { ...action.config, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'send_email':
        return (
          <div className="space-y-2">
            <Input
              placeholder="Recipient email"
              value={String(action.config.to || '')}
              onChange={(e) => updateAction(index, { ...action.config, to: e.target.value })}
            />
            <Input
              placeholder="Subject"
              value={String(action.config.subject || '')}
              onChange={(e) => updateAction(index, { ...action.config, subject: e.target.value })}
            />
          </div>
        );
      case 'send_slack':
        return (
          <div className="space-y-2">
            <Input
              placeholder="Channel (e.g., #general)"
              value={String(action.config.channel || '')}
              onChange={(e) => updateAction(index, { ...action.config, channel: e.target.value })}
            />
            <Textarea
              placeholder="Message template (use {{document.name}} for variables)"
              value={String(action.config.message || '')}
              onChange={(e) => updateAction(index, { ...action.config, message: e.target.value })}
            />
          </div>
        );
      case 'call_webhook':
        return (
          <div className="space-y-2">
            <Input
              placeholder="Webhook URL"
              value={String(action.config.url || '')}
              onChange={(e) => updateAction(index, { ...action.config, url: e.target.value })}
            />
            <Select
              value={String(action.config.method || 'POST')}
              onValueChange={(value) => updateAction(index, { ...action.config, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">No configuration needed</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workflow"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>When this happens...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={triggerType} onValueChange={(v) => setTriggerType(v as WorkflowTriggerType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((trigger) => (
                <SelectItem key={trigger.value} value={trigger.value}>
                  <div>
                    <div>{trigger.label}</div>
                    <div className="text-xs text-muted-foreground">{trigger.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {triggerType === 'date_approaching' && (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="30"
                value={String(triggerConfig.days_before || '')}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, days_before: parseInt(e.target.value) })}
                className="w-20"
              />
              <span className="text-sm">days before</span>
              <Input
                placeholder="Field name (e.g., expiry_date)"
                value={String(triggerConfig.field || '')}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, field: e.target.value })}
              />
            </div>
          )}

          {triggerType === 'keyword_match' && (
            <Input
              placeholder="Keywords (comma-separated)"
              value={String(triggerConfig.keywords || '')}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, keywords: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>And these conditions are met...</CardTitle>
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" /> Add Condition
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No conditions - workflow will trigger for all matching events
            </p>
          ) : (
            conditions.map((condition, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Field"
                  value={condition.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={condition.operator}
                  onValueChange={(v) => updateCondition(index, { operator: v as WorkflowCondition['operator'] })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!['exists', 'not_exists'].includes(condition.operator) && (
                  <Input
                    placeholder="Value"
                    value={String(condition.value)}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="flex-1"
                  />
                )}
                <Button variant="ghost" size="icon" onClick={() => removeCondition(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Then do this...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ACTION_OPTIONS.find((a) => a.value === action.type)?.icon}
                  <Badge variant="secondary">
                    {ACTION_OPTIONS.find((a) => a.value === action.type)?.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveAction(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveAction(index, 'down')}
                    disabled={index === actions.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeAction(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {renderActionConfig(action, index)}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            {ACTION_OPTIONS.map((action) => (
              <Button
                key={action.value}
                variant="outline"
                size="sm"
                onClick={() => addAction(action.value)}
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Panel */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowTestPanel(!showTestPanel)}
          >
            <span className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Workflow
            </span>
            {showTestPanel ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>
        {showTestPanel && (
          <CardContent className="space-y-4">
            <div>
              <Label>Test Data (JSON)</Label>
              <Textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="font-mono text-sm"
                rows={6}
              />
            </div>
            <Button onClick={handleTest} disabled={testWorkflow.isPending}>
              <Play className="h-4 w-4 mr-2" />
              Run Test
            </Button>

            {testWorkflow.data && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {testWorkflow.data.wouldTrigger ? (
                    <Badge variant="default" className="bg-green-500">Would Trigger</Badge>
                  ) : (
                    <Badge variant="secondary">Would Not Trigger</Badge>
                  )}
                </div>
                {testWorkflow.data.matchedConditions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Matched Conditions:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {testWorkflow.data.matchedConditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {testWorkflow.data.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{testWorkflow.data.errors.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name || actions.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          Save Workflow
        </Button>
      </div>
    </div>
  );
}
