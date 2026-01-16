import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Copy, Download, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Sample training pair for preview
const samplePair = {
  system: 'You are a helpful customer support assistant.',
  user: 'How do I reset my password?',
  assistant: 'To reset your password, go to Settings > Security > Reset Password. Click the reset button and follow the email instructions sent to your registered email address.',
};

const formatExamples = {
  openai: {
    name: 'OpenAI JSONL',
    description: 'Standard format for OpenAI fine-tuning (GPT-3.5, GPT-4)',
    extension: '.jsonl',
    sample: JSON.stringify({
      messages: [
        { role: 'system', content: samplePair.system },
        { role: 'user', content: samplePair.user },
        { role: 'assistant', content: samplePair.assistant },
      ],
    }, null, 2),
  },
  alpaca: {
    name: 'Alpaca JSONL',
    description: 'Format for LLaMA and Alpaca-style models',
    extension: '.jsonl',
    sample: JSON.stringify({
      instruction: samplePair.user,
      input: '',
      output: samplePair.assistant,
      system: samplePair.system,
    }, null, 2),
  },
  sharegpt: {
    name: 'ShareGPT JSONL',
    description: 'Multi-turn conversation format used by many open-source models',
    extension: '.jsonl',
    sample: JSON.stringify({
      conversations: [
        { from: 'system', value: samplePair.system },
        { from: 'human', value: samplePair.user },
        { from: 'gpt', value: samplePair.assistant },
      ],
    }, null, 2),
  },
  csv: {
    name: 'CSV',
    description: 'Comma-separated values for spreadsheet applications',
    extension: '.csv',
    sample: `system,user,assistant
"${samplePair.system}","${samplePair.user}","${samplePair.assistant}"`,
  },
  huggingface: {
    name: 'Hugging Face Datasets',
    description: 'Format compatible with Hugging Face transformers library',
    extension: '.jsonl',
    sample: JSON.stringify({
      text: `<|system|>\n${samplePair.system}\n<|user|>\n${samplePair.user}\n<|assistant|>\n${samplePair.assistant}`,
      system: samplePair.system,
      input: samplePair.user,
      output: samplePair.assistant,
    }, null, 2),
  },
};

type FormatKey = keyof typeof formatExamples;

interface ExportFormatPreviewProps {
  onExport?: (format: FormatKey) => void;
}

export function ExportFormatPreview({ onExport }: ExportFormatPreviewProps) {
  const { t } = useTranslation();
  const [activeFormat, setActiveFormat] = useState<FormatKey>('openai');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatExamples[activeFormat].sample);
    setCopied(true);
    toast({ title: t('export.copied', 'Copied to clipboard') });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSample = () => {
    const format = formatExamples[activeFormat];
    const blob = new Blob([format.sample], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample${format.extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ 
      title: t('export.downloaded', 'Sample downloaded'),
      description: `sample${format.extension}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {t('export.formatPreview', 'Export Format Preview')}
        </CardTitle>
        <CardDescription>
          {t('export.formatPreviewDesc', 'Preview how your training data will look in each export format')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as FormatKey)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="alpaca">Alpaca</TabsTrigger>
            <TabsTrigger value="sharegpt">ShareGPT</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="huggingface">HF</TabsTrigger>
          </TabsList>

          {Object.entries(formatExamples).map(([key, format]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{format.name}</h4>
                  <p className="text-sm text-muted-foreground">{format.description}</p>
                </div>
                <Badge variant="secondary">{format.extension}</Badge>
              </div>

              <div className="relative">
                <ScrollArea className="h-64 rounded-lg border bg-muted/50 p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                    {format.sample}
                  </pre>
                </ScrollArea>
                
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadSample}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('export.downloadSample', 'Download Sample')}
                </Button>
                {onExport && (
                  <Button
                    onClick={() => onExport(key as FormatKey)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.exportFull', 'Export Full Dataset')}
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">{t('export.formatComparison', 'Format Comparison')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(formatExamples).map(([key, format]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeFormat === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setActiveFormat(key as FormatKey)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{format.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {format.extension}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {format.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
