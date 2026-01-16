// System Prompt Manager - Version and switch between AI instruction sets

import { useState } from 'react';
import {
  useSystemPromptVersions,
  useCreateSystemPromptVersion,
  useActivateSystemPrompt,
  useDeleteSystemPromptVersion,
  type SystemPromptVersion,
} from '@/hooks/useDomainAI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Plus,
  Check,
  Trash2,
  Copy,
  History,
  Zap,
  Sparkles,
  FileText,
  Book,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SystemPromptManagerProps {
  projectId: string;
}

const MODES = [
  { value: 'default', label: 'Default', icon: Bot, description: 'Standard assistant mode' },
  { value: 'auditor', label: 'Auditor', icon: FileText, description: 'Detailed fact-checking mode' },
  { value: 'creative', label: 'Creative', icon: Sparkles, description: 'More creative and expressive' },
  { value: 'technical', label: 'Technical', icon: Zap, description: 'Precise technical responses' },
  { value: 'summarizer', label: 'Summarizer', icon: Book, description: 'Focused on concise summaries' },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  default: `You are a helpful AI assistant for this project. Answer questions accurately based on the provided context. Be clear and concise while remaining helpful.`,
  auditor: `You are a meticulous auditor reviewing documents for accuracy and compliance. Point out any inconsistencies, missing information, or potential issues. Be thorough and cite specific sections when making observations.`,
  creative: `You are a creative writing assistant. Help generate engaging content, suggest improvements, and offer creative alternatives. Use vivid language and explore different perspectives.`,
  technical: `You are a technical expert assistant. Provide precise, detailed technical explanations. Use proper terminology and include relevant technical details. When appropriate, suggest best practices and potential optimizations.`,
  summarizer: `You are a summarization expert. Create concise, well-structured summaries that capture key points. Use bullet points for clarity and highlight the most important information.`,
};

export function SystemPromptManager({ projectId }: SystemPromptManagerProps) {
  const { data: versions, isLoading } = useSystemPromptVersions(projectId);
  const createVersion = useCreateSystemPromptVersion();
  const activatePrompt = useActivateSystemPrompt();
  const deleteVersion = useDeleteSystemPromptVersion();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<SystemPromptVersion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'default',
    systemPrompt: DEFAULT_PROMPTS.default,
    temperature: 0.7,
    maxTokens: 2048,
    includeGlossary: true,
    includeStyleProfile: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mode: 'default',
      systemPrompt: DEFAULT_PROMPTS.default,
      temperature: 0.7,
      maxTokens: 2048,
      includeGlossary: true,
      includeStyleProfile: true,
    });
  };

  const handleModeChange = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      mode,
      systemPrompt: DEFAULT_PROMPTS[mode] || DEFAULT_PROMPTS.default,
    }));
  };

  const handleCreate = async () => {
    await createVersion.mutateAsync({
      projectId,
      ...formData,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleActivate = async (version: SystemPromptVersion) => {
    await activatePrompt.mutateAsync({ id: version.id, projectId });
  };

  const handleDelete = async (version: SystemPromptVersion) => {
    await deleteVersion.mutateAsync({ id: version.id, projectId });
  };

  const handleDuplicate = (version: SystemPromptVersion) => {
    setFormData({
      name: `${version.name} (Copy)`,
      description: version.description || '',
      mode: version.mode,
      systemPrompt: version.systemPrompt,
      temperature: version.temperature,
      maxTokens: version.maxTokens,
      includeGlossary: version.includeGlossary,
      includeStyleProfile: version.includeStyleProfile,
    });
    setIsCreateOpen(true);
  };

  // Group versions by name
  const groupedVersions = versions?.reduce((acc, version) => {
    if (!acc[version.name]) {
      acc[version.name] = [];
    }
    acc[version.name].push(version);
    return acc;
  }, {} as Record<string, SystemPromptVersion[]>) || {};

  const activeVersion = versions?.find(v => v.isActive);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            System Prompts
          </h3>
          <p className="text-sm text-muted-foreground">
            Define different AI instruction sets and switch between modes
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create System Prompt</DialogTitle>
              <DialogDescription>
                Define a new instruction set for the AI
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Prompt Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Legal Review Mode"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mode Template</Label>
                  <Select value={formData.mode} onValueChange={handleModeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map(mode => (
                        <SelectItem key={mode.value} value={mode.value}>
                          <div className="flex items-center gap-2">
                            <mode.icon className="h-4 w-4" />
                            {mode.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this mode"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="Instructions for the AI..."
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be injected at the start of every conversation
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Temperature: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, temperature: value }))}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                    min={256}
                    max={8192}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="includeGlossary"
                    checked={formData.includeGlossary}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeGlossary: checked }))}
                  />
                  <Label htmlFor="includeGlossary">Include Glossary Terms</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="includeStyleProfile"
                    checked={formData.includeStyleProfile}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeStyleProfile: checked }))}
                  />
                  <Label htmlFor="includeStyleProfile">Include Style Profile</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !formData.systemPrompt || createVersion.isPending}
              >
                Create Prompt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Prompt Card */}
      {activeVersion && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Active: {activeVersion.name}
                  <Badge variant="outline" className="text-xs">v{activeVersion.versionNumber}</Badge>
                </CardTitle>
                <CardDescription>
                  {MODES.find(m => m.value === activeVersion.mode)?.description || activeVersion.mode}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setViewingVersion(activeVersion)}>
                View Prompt
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Temperature: {activeVersion.temperature}</Badge>
              <Badge variant="secondary">Max Tokens: {activeVersion.maxTokens}</Badge>
              {activeVersion.includeGlossary && (
                <Badge variant="outline">+ Glossary</Badge>
              )}
              {activeVersion.includeStyleProfile && (
                <Badge variant="outline">+ Style</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Prompts */}
      {(!versions || versions.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No System Prompts Yet</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first system prompt to customize AI behavior
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedVersions).map(([name, versionList]) => {
            const latestVersion = versionList[0];
            const ModeIcon = MODES.find(m => m.value === latestVersion.mode)?.icon || Bot;
            
            return (
              <Card key={name} className={latestVersion.isActive ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <ModeIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{name}</CardTitle>
                        {latestVersion.description && (
                          <CardDescription className="text-xs">
                            {latestVersion.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {latestVersion.isActive && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <History className="h-3 w-3" />
                    {versionList.length} version{versionList.length > 1 ? 's' : ''}
                    <span className="mx-1">•</span>
                    Updated {formatDistanceToNow(new Date(latestVersion.updatedAt), { addSuffix: true })}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setViewingVersion(latestVersion)}
                    >
                      View
                    </Button>
                    {!latestVersion.isActive && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleActivate(latestVersion)}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(latestVersion)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete System Prompt?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete all versions of "{name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(latestVersion)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Prompt Dialog */}
      <Dialog open={!!viewingVersion} onOpenChange={(open) => !open && setViewingVersion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingVersion?.name}
              <Badge variant="outline">v{viewingVersion?.versionNumber}</Badge>
            </DialogTitle>
            <DialogDescription>
              {MODES.find(m => m.value === viewingVersion?.mode)?.description}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
              {viewingVersion?.systemPrompt}
            </pre>
          </ScrollArea>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Temperature: {viewingVersion?.temperature}</Badge>
            <Badge variant="secondary">Max Tokens: {viewingVersion?.maxTokens}</Badge>
            {viewingVersion?.includeGlossary && (
              <Badge variant="outline">+ Glossary</Badge>
            )}
            {viewingVersion?.includeStyleProfile && (
              <Badge variant="outline">+ Style</Badge>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingVersion(null)}>
              Close
            </Button>
            {viewingVersion && !viewingVersion.isActive && (
              <Button onClick={() => {
                handleActivate(viewingVersion);
                setViewingVersion(null);
              }}>
                Activate This Prompt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
