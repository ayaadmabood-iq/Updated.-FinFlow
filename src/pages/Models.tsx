import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCompletedModels, useTestModel } from '@/hooks/useModels';
import { TrainingAnalyticsDashboard } from '@/components/training/TrainingAnalyticsDashboard';
import { ModelComparison } from '@/components/training/ModelComparison';
import {
  Brain,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Clock,
  Zap,
  CheckCircle2,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Play,
  BarChart3,
  GitCompare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { TrainingJob } from '@/services/autoTrainingService';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function Models() {
  const { t } = useTranslation();
  const { models, isLoading } = useCompletedModels();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<TrainingJob | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('models');

  const filteredModels = models?.filter((model) =>
    model.fineTunedModelId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.baseModel.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const copyModelId = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    toast.success(t('models.copiedToClipboard', 'Model ID copied to clipboard'));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              {t('models.title', 'Fine-tuned Models')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('models.description', 'View, test, and manage your completed fine-tuned models')}
            </p>
          </div>
        </div>

        {/* Tabs for Models, Analytics, Comparison */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {t('models.modelsTab', 'Models')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('models.analyticsTab', 'Analytics')}
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              {t('models.compareTab', 'Compare')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="mt-6 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('models.searchPlaceholder', 'Search models...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Models Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredModels.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery 
                      ? t('models.noResults', 'No models found')
                      : t('models.noModels', 'No Fine-tuned Models Yet')}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {searchQuery
                      ? t('models.tryDifferentSearch', 'Try a different search term')
                      : t('models.noModelsDesc', 'Complete a training job to see your fine-tuned models here. Start by creating a dataset and launching training.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onCopy={copyModelId}
                    onTest={() => {
                      setSelectedModel(model);
                      setTestDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <TrainingAnalyticsDashboard 
              jobs={models || []} 
              selectedJob={selectedModel || undefined}
            />
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <ModelComparison models={models || []} />
          </TabsContent>
        </Tabs>

        {/* Test Dialog */}
        {selectedModel && (
          <ModelTestDialog
            open={testDialogOpen}
            onOpenChange={setTestDialogOpen}
            model={selectedModel}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

interface ModelCardProps {
  model: TrainingJob;
  onCopy: (modelId: string) => void;
  onTest: () => void;
}

function ModelCard({ model, onCopy, onTest }: ModelCardProps) {
  const { t } = useTranslation();

  if (!model.fineTunedModelId) return null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" title={model.fineTunedModelId}>
              {model.fineTunedModelId.split(':').pop() || model.fineTunedModelId}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('models.basedOn', 'Based on')} {model.baseModel}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopy(model.fineTunedModelId!)}>
                <Copy className="h-4 w-4 mr-2" />
                {t('models.copyId', 'Copy Model ID')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://platform.openai.com/finetune"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('models.viewOnOpenAI', 'View on OpenAI')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('models.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model ID (truncated) */}
        <div className="p-2 bg-muted/50 rounded-md">
          <code className="text-xs font-mono truncate block" title={model.fineTunedModelId}>
            {model.fineTunedModelId}
          </code>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {model.startedAt && model.completedAt 
                ? formatDuration(model.startedAt, model.completedAt)
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground capitalize">{model.provider}</span>
          </div>
        </div>

        {/* Completed Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {model.completedAt ? formatDate(model.completedAt) : 'N/A'}
          </span>
          {model.autoStarted && (
            <Badge variant="outline" className="text-xs">Auto</Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onCopy(model.fineTunedModelId!)}
          >
            <Copy className="h-4 w-4 mr-1" />
            {t('models.copy', 'Copy')}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={onTest}
          >
            <Play className="h-4 w-4 mr-1" />
            {t('models.test', 'Test')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: TrainingJob;
}

function ModelTestDialog({ open, onOpenChange, model }: ModelTestDialogProps) {
  const { t } = useTranslation();
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const testMutation = useTestModel();

  const handleSend = async () => {
    if (!userMessage.trim() || !model.fineTunedModelId) return;

    const newUserMessage = userMessage.trim();
    setMessages((prev) => [...prev, { role: 'user', content: newUserMessage }]);
    setUserMessage('');

    try {
      const response = await testMutation.mutateAsync({
        modelId: model.fineTunedModelId,
        systemPrompt,
        userMessage: newUserMessage,
      });
      
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('models.testModel', 'Test Model')}
          </DialogTitle>
          <DialogDescription className="truncate">
            {model.fineTunedModelId}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('models.chat', 'Chat')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              {t('models.settings', 'Settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 mt-4">
            {/* Messages */}
            <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  {t('models.startConversation', 'Send a message to start the conversation')}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {testMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder={t('models.typeMessage', 'Type your message...')}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!userMessage.trim() || testMutation.isPending}
                size="icon"
                className="h-[44px] w-[44px]"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="m-0 mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('models.systemPrompt', 'System Prompt')}
              </label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {t('models.systemPromptHint', 'The system prompt sets the behavior and context for your fine-tuned model.')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setMessages([])}>
            {t('models.clearChat', 'Clear Chat')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}