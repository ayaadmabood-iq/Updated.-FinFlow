import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTrainingDatasets } from '@/hooks/useTraining';
import { trainingService, type TrainingFormat, type TrainingDataset } from '@/services/trainingService';
import { toast } from '@/hooks/use-toast';
import {
  Download,
  FileJson,
  Copy,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  Share2,
} from 'lucide-react';

interface DatasetExportPanelProps {
  projectId: string;
}

type ExportFormat = TrainingFormat | 'csv' | 'huggingface';

const formatLabels: Record<ExportFormat, { label: string; description: string; extension: string }> = {
  openai: { label: 'OpenAI', description: 'ChatML format for GPT fine-tuning', extension: 'jsonl' },
  anthropic: { label: 'Anthropic', description: 'Claude format for Anthropic fine-tuning', extension: 'jsonl' },
  alpaca: { label: 'Alpaca', description: 'Stanford Alpaca instruction format', extension: 'jsonl' },
  sharegpt: { label: 'ShareGPT', description: 'ShareGPT conversation format', extension: 'jsonl' },
  csv: { label: 'CSV', description: 'Comma-separated values with custom columns', extension: 'csv' },
  huggingface: { label: 'Hugging Face', description: 'Datasets library compatible format', extension: 'jsonl' },
};

// CSV column options
const csvColumnOptions = [
  { id: 'system', label: 'System Message' },
  { id: 'user', label: 'User Message' },
  { id: 'assistant', label: 'Assistant Message' },
  { id: 'tokens', label: 'Token Count' },
  { id: 'quality', label: 'Quality Score' },
];

export function DatasetExportPanel({ projectId }: DatasetExportPanelProps) {
  const { t } = useTranslation();
  const { data: datasets, isLoading } = useTrainingDatasets(projectId);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<ExportFormat>('openai');
  const [includeSystemPrompt, setIncludeSystemPrompt] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>(['user', 'assistant']);

  const readyDatasets = datasets?.filter(d => d.status === 'ready' || d.status === 'completed') || [];
  const selectedDataset = readyDatasets.find(d => d.id === selectedDatasetId);

  const toggleCsvColumn = (columnId: string) => {
    setCsvColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  const handleDownload = async () => {
    if (!selectedDatasetId) return;

    setIsExporting(true);
    try {
      const { content, filename } = await trainingService.downloadJsonl(selectedDatasetId);
      
      let finalContent: string;
      let finalFilename: string;
      let mimeType: string;

      if (targetFormat === 'csv') {
        finalContent = convertToCsv(content, csvColumns, includeSystemPrompt);
        finalFilename = filename.replace(`.jsonl`, `.csv`);
        mimeType = 'text/csv';
      } else if (targetFormat === 'huggingface') {
        finalContent = convertToHuggingFace(content, includeSystemPrompt);
        finalFilename = filename.replace(`.jsonl`, `_hf.jsonl`);
        mimeType = 'application/jsonl';
      } else {
        finalContent = convertFormat(content, selectedDataset?.format || 'openai', targetFormat, includeSystemPrompt);
        finalFilename = filename.replace(`.jsonl`, `_${targetFormat}.jsonl`);
        mimeType = 'application/jsonl';
      }
      
      // Download file
      const blob = new Blob([finalContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('export.downloadSuccess', 'Download started'),
        description: finalFilename,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('export.downloadFailed', 'Download failed'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!selectedDatasetId || targetFormat === 'csv') return;

    setIsCopying(true);
    try {
      const { content } = await trainingService.downloadJsonl(selectedDatasetId);
      let finalContent: string;
      
      if (targetFormat === 'huggingface') {
        finalContent = convertToHuggingFace(content, includeSystemPrompt);
      } else {
        finalContent = convertFormat(content, selectedDataset?.format || 'openai', targetFormat as TrainingFormat, includeSystemPrompt);
      }
      await navigator.clipboard.writeText(finalContent);

      toast({
        title: t('export.copiedSuccess', 'Copied to clipboard'),
        description: t('export.copiedDesc', 'JSONL content copied successfully'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('export.copyFailed', 'Copy failed'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t('export.exportDataset', 'Export Training Dataset')}
        </CardTitle>
        <CardDescription>
          {t('export.exportDesc', 'Download your training datasets in various formats for fine-tuning')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {readyDatasets.length === 0 ? (
          <div className="text-center py-8">
            <FileJson className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('export.noDatasets', 'No Datasets Available')}
            </h3>
            <p className="text-muted-foreground">
              {t('export.noDatasetsDesc', 'Generate a training dataset first to export it.')}
            </p>
          </div>
        ) : (
          <>
            {/* Dataset Selection */}
            <div className="space-y-2">
              <Label>{t('export.selectDataset', 'Select Dataset')}</Label>
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('export.choosePlaceholder', 'Choose a dataset to export')} />
                </SelectTrigger>
                <SelectContent>
                  {readyDatasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <span>{dataset.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dataset.totalPairs} pairs
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Dataset Info */}
            {selectedDataset && (
              <DatasetInfoCard dataset={selectedDataset} />
            )}

            {/* Target Format */}
            <div className="space-y-2">
              <Label>{t('export.targetFormat', 'Target Format')}</Label>
              <Select value={targetFormat} onValueChange={(v) => setTargetFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatLabels).map(([format, info]) => (
                    <SelectItem key={format} value={format}>
                      <div className="flex flex-col">
                        <span>{info.label}</span>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CSV Column Selection (only show when CSV is selected) */}
            {targetFormat === 'csv' && (
              <div className="space-y-3">
                <Label>{t('export.csvColumns', 'CSV Columns')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {csvColumnOptions.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`csv-${col.id}`}
                        checked={csvColumns.includes(col.id)}
                        onCheckedChange={() => toggleCsvColumn(col.id)}
                      />
                      <Label htmlFor={`csv-${col.id}`} className="font-normal text-sm">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('export.csvColumnsHint', 'Select which columns to include in the CSV export')}
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              <Label>{t('export.options', 'Export Options')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeSystem"
                    checked={includeSystemPrompt}
                    onCheckedChange={(c) => setIncludeSystemPrompt(!!c)}
                  />
                  <Label htmlFor="includeSystem" className="font-normal">
                    {t('export.includeSystemPrompt', 'Include system prompts')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMetadata"
                    checked={includeMetadata}
                    onCheckedChange={(c) => setIncludeMetadata(!!c)}
                  />
                  <Label htmlFor="includeMetadata" className="font-normal">
                    {t('export.includeMetadata', 'Include metadata comments')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleDownload}
                disabled={!selectedDatasetId || isExporting || (targetFormat === 'csv' && csvColumns.length === 0)}
                className="flex-1"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('export.download', 'Download')} {formatLabels[targetFormat].extension.toUpperCase()}
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={!selectedDatasetId || isCopying || targetFormat === 'csv'}
              >
                {isCopying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {t('common.copy', 'Copy')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DatasetInfoCard({ dataset }: { dataset: TrainingDataset }) {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{dataset.name}</span>
        </div>
        <Badge variant={dataset.status === 'ready' ? 'default' : 'secondary'}>
          {dataset.status === 'ready' ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <Clock className="h-3 w-3 mr-1" />
          )}
          {dataset.status}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t('export.pairs', 'Pairs')}</span>
          <p className="font-medium">{dataset.totalPairs.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{t('export.tokens', 'Tokens')}</span>
          <p className="font-medium">{dataset.totalTokens.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">{t('export.format', 'Format')}</span>
          <p className="font-medium capitalize">{dataset.format}</p>
        </div>
      </div>
      {dataset.estimatedCost && (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('export.estimatedCost', 'Est. Cost')}: </span>
          <span className="font-medium">${dataset.estimatedCost.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// Format conversion utility
function convertFormat(
  jsonlContent: string,
  sourceFormat: TrainingFormat,
  targetFormat: TrainingFormat,
  includeSystemPrompt: boolean
): string {
  if (sourceFormat === targetFormat && includeSystemPrompt) {
    return jsonlContent;
  }

  const lines = jsonlContent.trim().split('\n');
  const convertedLines = lines.map((line) => {
    try {
      const data = JSON.parse(line);
      return JSON.stringify(convertSingleEntry(data, sourceFormat, targetFormat, includeSystemPrompt));
    } catch {
      return line;
    }
  });

  return convertedLines.join('\n');
}

// CSV export utility
function convertToCsv(
  jsonlContent: string,
  columns: string[],
  includeSystemPrompt: boolean
): string {
  const lines = jsonlContent.trim().split('\n');
  const rows: string[][] = [];
  
  // Header row
  const headerMap: Record<string, string> = {
    system: 'System Message',
    user: 'User Message',
    assistant: 'Assistant Message',
    tokens: 'Token Count',
    quality: 'Quality Score',
  };
  rows.push(columns.map(c => headerMap[c] || c));

  // Data rows
  lines.forEach((line) => {
    try {
      const data = JSON.parse(line);
      const { systemMessage, userMessage, assistantMessage } = extractMessages(data);
      
      const row = columns.map((col) => {
        switch (col) {
          case 'system':
            return includeSystemPrompt ? escapeCsv(systemMessage) : '';
          case 'user':
            return escapeCsv(userMessage);
          case 'assistant':
            return escapeCsv(assistantMessage);
          case 'tokens':
            return String(Math.ceil((userMessage.length + assistantMessage.length + systemMessage.length) / 4));
          case 'quality':
            return String(data.quality_score || data.qualityScore || 'N/A');
          default:
            return '';
        }
      });
      rows.push(row);
    } catch {
      // Skip invalid lines
    }
  });

  return rows.map(row => row.join(',')).join('\n');
}

function escapeCsv(str: string): string {
  if (!str) return '';
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  const escaped = str.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}

// Hugging Face datasets format
function convertToHuggingFace(
  jsonlContent: string,
  includeSystemPrompt: boolean
): string {
  const lines = jsonlContent.trim().split('\n');
  const convertedLines = lines.map((line) => {
    try {
      const data = JSON.parse(line);
      const { systemMessage, userMessage, assistantMessage } = extractMessages(data);
      
      // Hugging Face datasets format with text column
      const prompt = includeSystemPrompt && systemMessage 
        ? `${systemMessage}\n\nUser: ${userMessage}`
        : `User: ${userMessage}`;
      
      return JSON.stringify({
        text: `${prompt}\n\nAssistant: ${assistantMessage}`,
        prompt: userMessage,
        completion: assistantMessage,
        system: includeSystemPrompt ? systemMessage : undefined,
        messages: [
          ...(includeSystemPrompt && systemMessage ? [{ role: 'system', content: systemMessage }] : []),
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantMessage },
        ],
      });
    } catch {
      return line;
    }
  });

  return convertedLines.join('\n');
}

// Helper to extract messages from any format
function extractMessages(data: Record<string, unknown>): {
  systemMessage: string;
  userMessage: string;
  assistantMessage: string;
} {
  let systemMessage = '';
  let userMessage = '';
  let assistantMessage = '';

  // Try OpenAI format
  if (data.messages && Array.isArray(data.messages)) {
    for (const msg of data.messages as Array<{ role: string; content: string }>) {
      if (msg.role === 'system') systemMessage = msg.content;
      if (msg.role === 'user') userMessage = msg.content;
      if (msg.role === 'assistant') assistantMessage = msg.content;
    }
  }
  // Try Anthropic format
  else if (data.system !== undefined) {
    systemMessage = (data.system as string) || '';
    const messages = data.messages as Array<{ role: string; content: string }> || [];
    for (const msg of messages) {
      if (msg.role === 'user') userMessage = msg.content;
      if (msg.role === 'assistant') assistantMessage = msg.content;
    }
  }
  // Try Alpaca format
  else if (data.instruction !== undefined) {
    systemMessage = (data.instruction as string) || '';
    userMessage = (data.input as string) || '';
    assistantMessage = (data.output as string) || '';
  }
  // Try ShareGPT format
  else if (data.conversations && Array.isArray(data.conversations)) {
    for (const conv of data.conversations as Array<{ from: string; value: string }>) {
      if (conv.from === 'system') systemMessage = conv.value;
      if (conv.from === 'human') userMessage = conv.value;
      if (conv.from === 'gpt') assistantMessage = conv.value;
    }
  }

  return { systemMessage, userMessage, assistantMessage };
}

function convertSingleEntry(
  data: Record<string, unknown>,
  sourceFormat: TrainingFormat,
  targetFormat: TrainingFormat,
  includeSystemPrompt: boolean
): Record<string, unknown> {
  // Extract messages from source format
  let systemMessage = '';
  let userMessage = '';
  let assistantMessage = '';

  if (sourceFormat === 'openai') {
    const messages = data.messages as Array<{ role: string; content: string }> || [];
    for (const msg of messages) {
      if (msg.role === 'system') systemMessage = msg.content;
      if (msg.role === 'user') userMessage = msg.content;
      if (msg.role === 'assistant') assistantMessage = msg.content;
    }
  } else if (sourceFormat === 'anthropic') {
    systemMessage = data.system as string || '';
    const messages = data.messages as Array<{ role: string; content: string }> || [];
    for (const msg of messages) {
      if (msg.role === 'user') userMessage = msg.content;
      if (msg.role === 'assistant') assistantMessage = msg.content;
    }
  } else if (sourceFormat === 'alpaca') {
    systemMessage = data.instruction as string || '';
    userMessage = data.input as string || '';
    assistantMessage = data.output as string || '';
  } else if (sourceFormat === 'sharegpt') {
    const conversations = data.conversations as Array<{ from: string; value: string }> || [];
    for (const conv of conversations) {
      if (conv.from === 'system') systemMessage = conv.value;
      if (conv.from === 'human') userMessage = conv.value;
      if (conv.from === 'gpt') assistantMessage = conv.value;
    }
  }

  // Convert to target format
  const system = includeSystemPrompt ? systemMessage : '';

  if (targetFormat === 'openai') {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: userMessage });
    messages.push({ role: 'assistant', content: assistantMessage });
    return { messages };
  }

  if (targetFormat === 'anthropic') {
    return {
      system: system || undefined,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
      ],
    };
  }

  if (targetFormat === 'alpaca') {
    return {
      instruction: system || userMessage,
      input: system ? userMessage : '',
      output: assistantMessage,
    };
  }

  if (targetFormat === 'sharegpt') {
    const conversations = [];
    if (system) conversations.push({ from: 'system', value: system });
    conversations.push({ from: 'human', value: userMessage });
    conversations.push({ from: 'gpt', value: assistantMessage });
    return { conversations };
  }

  return data;
}
