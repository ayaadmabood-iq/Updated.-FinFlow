import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ArrowRightLeft,
  Loader2,
  Send,
  Save,
  Trash2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { TrainingJob } from '@/services/autoTrainingService';
import { useTestModel } from '@/hooks/useModels';
import { toast } from 'sonner';

interface ModelComparisonProps {
  models: TrainingJob[];
  onSaveResult?: (result: ComparisonResult) => void;
}

interface ComparisonResult {
  prompt: string;
  responses: Array<{
    modelId: string;
    modelName: string;
    response: string;
    duration: number;
  }>;
  timestamp: Date;
}

export function ModelComparison({ models, onSaveResult }: ModelComparisonProps) {
  const { t } = useTranslation();
  const testModel = useTestModel();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Respond concisely and accurately.'
  );
  const [responses, setResponses] = useState<
    Map<string, { response: string; duration: number; loading: boolean; error?: string }>
  >(new Map());
  const [savedResults, setSavedResults] = useState<ComparisonResult[]>([]);

  const completedModels = models.filter((m) => m.status === 'completed' && m.fineTunedModelId);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const handleCompare = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    // Initialize loading states
    const newResponses = new Map(responses);
    selectedModels.forEach((id) => {
      newResponses.set(id, { response: '', duration: 0, loading: true });
    });
    setResponses(new Map(newResponses));

    // Test each model in parallel
    const results = await Promise.allSettled(
      selectedModels.map(async (modelId) => {
        const model = completedModels.find((m) => m.fineTunedModelId === modelId);
        if (!model?.fineTunedModelId) throw new Error('Model not found');

        const startTime = Date.now();
        const response = await testModel.mutateAsync({
          modelId: model.fineTunedModelId,
          systemPrompt,
          userMessage: prompt,
        });
        const duration = Date.now() - startTime;

        return { modelId, response, duration };
      })
    );

    // Update responses
    const updatedResponses = new Map(responses);
    results.forEach((result, index) => {
      const modelId = selectedModels[index];
      if (result.status === 'fulfilled') {
        updatedResponses.set(modelId, {
          response: result.value.response,
          duration: result.value.duration,
          loading: false,
        });
      } else {
        updatedResponses.set(modelId, {
          response: '',
          duration: 0,
          loading: false,
          error: result.reason?.message || 'Failed to get response',
        });
      }
    });
    setResponses(updatedResponses);
  };

  const handleSaveResult = () => {
    const responseArray = Array.from(responses.entries())
      .filter(([_, data]) => data.response && !data.error)
      .map(([modelId, data]) => {
        const model = completedModels.find((m) => m.fineTunedModelId === modelId);
        return {
          modelId,
          modelName: model?.baseModel || modelId,
          response: data.response,
          duration: data.duration,
        };
      });

    if (responseArray.length === 0) {
      toast.error('No valid responses to save');
      return;
    }

    const result: ComparisonResult = {
      prompt,
      responses: responseArray,
      timestamp: new Date(),
    };

    setSavedResults((prev) => [...prev, result]);
    onSaveResult?.(result);
    toast.success('Comparison saved');
  };

  const copyResponse = async (response: string) => {
    await navigator.clipboard.writeText(response);
    toast.success('Response copied to clipboard');
  };

  const clearResults = () => {
    setResponses(new Map());
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Model Comparison
          </CardTitle>
          <CardDescription>
            Select multiple models to compare their responses side by side
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedModels.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No completed models available for comparison
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {completedModels.map((model) => (
                <div
                  key={model.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModels.includes(model.fineTunedModelId!)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleModel(model.fineTunedModelId!)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedModels.includes(model.fineTunedModelId!)}
                      onChange={() => {}}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {model.fineTunedModelId?.split(':').pop() || model.baseModel}
                      </p>
                      <p className="text-xs text-muted-foreground">{model.baseModel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 text-sm text-muted-foreground">
            {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
          </div>
        </CardContent>
      </Card>

      {/* Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle>Test Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>User Message</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your test prompt..."
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleCompare}
              disabled={!prompt.trim() || selectedModels.length === 0 || testModel.isPending}
              className="flex-1"
            >
              {testModel.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Compare Models
            </Button>
            {responses.size > 0 && (
              <>
                <Button variant="outline" onClick={handleSaveResult}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={clearResults}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      {responses.size > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from(responses.entries()).map(([modelId, data]) => {
            const model = completedModels.find((m) => m.fineTunedModelId === modelId);
            return (
              <Card key={modelId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {model?.fineTunedModelId?.split(':').pop() || model?.baseModel}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {data.duration > 0 && (
                        <Badge variant="outline">{(data.duration / 1000).toFixed(2)}s</Badge>
                      )}
                      {!data.loading && !data.error && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyResponse(data.response)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating response...
                    </div>
                  ) : data.error ? (
                    <div className="text-destructive text-sm">{data.error}</div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <p className="text-sm whitespace-pre-wrap">{data.response}</p>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Saved Results */}
      {savedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Saved Comparisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {savedResults.map((result, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">
                        {new Date(result.timestamp).toLocaleString()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {result.responses.length} responses
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-2 line-clamp-2">{result.prompt}</p>
                    <div className="flex gap-2 flex-wrap">
                      {result.responses.map((r) => (
                        <Badge key={r.modelId} variant="outline">
                          {r.modelName} ({(r.duration / 1000).toFixed(2)}s)
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
