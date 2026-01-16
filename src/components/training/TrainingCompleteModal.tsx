import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  Clock,
  Zap,
  TrendingUp,
  Code,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingJob } from '@/services/autoTrainingService';

interface TrainingCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: TrainingJob;
}

function formatDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function TrainingCompleteModal({ open, onOpenChange, job }: TrainingCompleteModalProps) {
  const { t } = useTranslation();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const modelId = job.fineTunedModelId || '';

  const pythonCode = `from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`;

  const curlCode = `curl https://api.openai.com/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelId}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="text-center pb-2">
          {/* Celebration Animation */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-500 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-1 h-5 w-5 text-yellow-500 animate-pulse delay-150" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl">
            {t('training.trainingComplete', 'Training Complete!')} 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('training.modelReady', 'Your fine-tuned model is ready to use')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Model ID Card */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('training.fineTunedModelId', 'Fine-tuned Model ID')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(modelId, 'Model ID')}
                className="h-8 gap-1"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedItem === 'Model ID' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <code className="block p-3 bg-white dark:bg-gray-800 rounded text-sm font-mono break-all border">
              {modelId}
            </code>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('training.duration', 'Duration')}</p>
              <p className="font-semibold text-sm">
                {job.startedAt && job.completedAt 
                  ? formatDuration(job.startedAt, job.completedAt) 
                  : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('training.baseModel', 'Base Model')}</p>
              <p className="font-semibold text-sm truncate" title={job.baseModel}>
                {job.baseModel.split('-').slice(0, 2).join('-')}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('training.provider', 'Provider')}</p>
              <p className="font-semibold text-sm capitalize">{job.provider}</p>
            </div>
          </div>

          {/* Training Metrics */}
          {job.resultMetrics && Object.keys(job.resultMetrics).length > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('training.trainingMetrics', 'Training Metrics')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(job.resultMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-background rounded border text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Snippets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4" />
              {t('training.quickStart', 'Quick Start')}
            </h4>
            
            {/* Python snippet */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted rounded-t-lg border border-b-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs py-0">Python</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(pythonCode, 'Python code')}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copiedItem === 'Python code' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-b-lg text-xs overflow-x-auto border border-t-0">
                <code>{pythonCode}</code>
              </pre>
            </div>

            {/* cURL snippet */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted rounded-t-lg border border-b-0">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs py-0">cURL</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(curlCode, 'cURL command')}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copiedItem === 'cURL command' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-b-lg text-xs overflow-x-auto border border-t-0">
                <code>{curlCode}</code>
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
          <Button asChild>
            <a
              href="https://platform.openai.com/finetune"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t('training.viewOnOpenAI', 'View on OpenAI')}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}