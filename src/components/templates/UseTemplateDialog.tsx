import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Template, categoryInfo } from '@/data/templates';
import { Loader2, FolderPlus, FolderOpen, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

interface UseTemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseTemplateDialog({ template, open, onOpenChange }: UseTemplateDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projectsData, refetch: refetchProjects } = useProjects();
  const projects = projectsData?.data || [];
  const isRtl = i18n.language === 'ar';
  
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  if (!template) return null;
  
  const category = categoryInfo[template.category];
  
  const handleApplyTemplate = async () => {
    if (!user) return;
    
    if (mode === 'new' && !projectName.trim()) {
      toast({
        variant: 'destructive',
        title: t('templates.error', 'Error'),
        description: t('templates.projectNameRequired', 'Please enter a project name'),
      });
      return;
    }
    
    if (mode === 'existing' && !selectedProjectId) {
      toast({
        variant: 'destructive',
        title: t('templates.error', 'Error'),
        description: t('templates.selectProject', 'Please select a project'),
      });
      return;
    }
    
    setLoading(true);
    
    try {
      let projectId = selectedProjectId;
      
      // Create new project if needed
      if (mode === 'new') {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: projectName,
            description: projectDescription || `Created from ${template.name} template`,
            owner_id: user.id,
            status: 'active',
          })
          .select()
          .single();
          
        if (projectError) throw projectError;
        projectId = newProject.id;
      }
      
      // Create training dataset with template
      const { data: dataset, error: datasetError } = await supabase
        .from('training_datasets')
        .insert({
          name: `${template.name} Dataset`,
          description: template.description,
          project_id: projectId,
          user_id: user.id,
          system_prompt: template.systemPrompt,
          format: 'openai',
          status: 'ready',
          total_pairs: template.samplePairs.length,
        })
        .select()
        .single();
        
      if (datasetError) throw datasetError;
      
      // Insert sample training pairs
      const pairs = template.samplePairs.map((pair) => ({
        dataset_id: dataset.id,
        system_message: pair.system,
        user_message: pair.user,
        assistant_message: pair.assistant,
        is_valid: true,
        quality_score: 0.95,
        token_count: Math.round((pair.system.length + pair.user.length + pair.assistant.length) / 4),
      }));
      
      const { error: pairsError } = await supabase
        .from('training_pairs')
        .insert(pairs);
        
      if (pairsError) throw pairsError;
      
      // Refetch projects if we created a new one
      if (mode === 'new') {
        await refetchProjects();
      }
      
      toast({
        title: t('templates.applied', 'Template Applied'),
        description: t('templates.appliedDesc', 'Template has been applied with {{count}} sample training pairs.', { count: template.samplePairs.length }),
      });
      
      onOpenChange(false);
      navigate(`/projects/${projectId}/data`);
      
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        variant: 'destructive',
        title: t('templates.error', 'Error'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('templates.useTemplate', 'Use Template')}
          </DialogTitle>
          <DialogDescription>
            {t('templates.applyTo', 'Apply "{{name}}" template to a project', { name: template.name })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')}>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                <FolderPlus className="h-4 w-4" />
                {t('templates.newProject', 'Create new project')}
              </Label>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                <FolderOpen className="h-4 w-4" />
                {t('templates.existingProject', 'Add to existing project')}
              </Label>
            </div>
          </RadioGroup>
          
          {/* New Project Fields */}
          {mode === 'new' && (
            <div className="space-y-3 pt-2">
              <div>
                <Label htmlFor="projectName">{t('projects.name', 'Project Name')}</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={template.name}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="projectDesc">{t('projects.projectDescription', 'Description')}</Label>
                <Textarea
                  id="projectDesc"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder={template.description}
                  rows={2}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          
          {/* Existing Project Selection */}
          {mode === 'existing' && (
            <div className="pt-2">
              <Label>{t('templates.selectProjectLabel', 'Select Project')}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('templates.choosePlaceholder', 'Choose a project')} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Template Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">{t('templates.willInclude', 'This will include:')}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>{t('templates.includePrompt', 'System prompt for {{category}}', { category: isRtl ? category.labelAr : category.label })}</li>
              <li>{t('templates.includePairs', '{{count}} sample training pairs', { count: template.samplePairs.length })}</li>
              <li>{t('templates.includeModel', 'Recommended model: {{model}}', { model: template.recommendedModel })}</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleApplyTemplate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                {t('templates.applying', 'Applying...')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 me-1.5" />
                {t('templates.apply', 'Apply Template')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
