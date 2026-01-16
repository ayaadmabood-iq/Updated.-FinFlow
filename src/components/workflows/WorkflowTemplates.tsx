import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Receipt, 
  FileClock, 
  Tags, 
  MessageSquare, 
  Webhook,
  Star,
  Plus,
} from 'lucide-react';
import { WorkflowTemplate } from '@/services/workflowService';
import { useWorkflowTemplates, useCreateFromTemplate } from '@/hooks/useWorkflows';

interface WorkflowTemplatesProps {
  projectId: string;
  onWorkflowCreated: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  finance: <Receipt className="h-5 w-5" />,
  legal: <FileClock className="h-5 w-5" />,
  organization: <Tags className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
  integration: <Webhook className="h-5 w-5" />,
};

export function WorkflowTemplates({ projectId, onWorkflowCreated }: WorkflowTemplatesProps) {
  const { data: templates, isLoading } = useWorkflowTemplates();
  const createFromTemplate = useCreateFromTemplate(projectId);
  
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [workflowName, setWorkflowName] = useState('');

  const handleUseTemplate = () => {
    if (!selectedTemplate || !workflowName.trim()) return;
    
    createFromTemplate.mutate(
      { templateId: selectedTemplate.id, name: workflowName },
      {
        onSuccess: () => {
          setSelectedTemplate(null);
          setWorkflowName('');
          onWorkflowCreated();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const featuredTemplates = templates?.filter(t => t.is_featured) || [];
  const otherTemplates = templates?.filter(t => !t.is_featured) || [];

  return (
    <>
      <div className="space-y-6">
        {featuredTemplates.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Featured Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => {
                    setSelectedTemplate(template);
                    setWorkflowName(template.name);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {otherTemplates.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">More Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => {
                    setSelectedTemplate(template);
                    setWorkflowName(template.name);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter a name for your workflow"
              />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Trigger:</strong> {selectedTemplate?.trigger_type.replace(/_/g, ' ')}</p>
              <p><strong>Actions:</strong> {selectedTemplate?.actions.length} action(s)</p>
              <p><strong>Conditions:</strong> {selectedTemplate?.conditions.length} condition(s)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUseTemplate}
              disabled={!workflowName.trim() || createFromTemplate.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TemplateCard({ 
  template, 
  onSelect 
}: { 
  template: WorkflowTemplate; 
  onSelect: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {CATEGORY_ICONS[template.category || 'integration'] || <Webhook className="h-5 w-5" />}
          </div>
          {template.is_featured && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <h4 className="font-medium mb-1">{template.name}</h4>
        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {template.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.use_count} uses
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
