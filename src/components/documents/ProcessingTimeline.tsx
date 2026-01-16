import React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  ChevronDown,
  FileText,
  Languages,
  Split,
  FileSearch,
  Database,
  Upload
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProcessingStep, PipelineStage } from '@/types';

interface ProcessingTimelineProps {
  steps: ProcessingStep[];
  className?: string;
  showDetails?: boolean;
}

const STAGE_CONFIG: Record<PipelineStage, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  description: string;
  explanation: string;
}> = {
  ingestion: {
    label: 'Ingestion',
    icon: Upload,
    description: 'Validating document in storage',
    explanation: 'Confirms the file was uploaded correctly and is accessible for processing.',
  },
  text_extraction: {
    label: 'Text Extraction',
    icon: FileText,
    description: 'Extracting text content',
    explanation: 'Pulls readable text from the document (handles PDFs, DOCX, images via OCR, and audio transcription).',
  },
  language_detection: {
    label: 'Language Detection',
    icon: Languages,
    description: 'Detecting document language',
    explanation: 'Identifies the primary language to optimize downstream processing and search.',
  },
  chunking: {
    label: 'Chunking',
    icon: Split,
    description: 'Splitting into chunks',
    explanation: 'Divides text into smaller, semantically meaningful pieces for better retrieval. Uses your project\'s chunking strategy.',
  },
  summarization: {
    label: 'Summarization',
    icon: FileSearch,
    description: 'Generating summary',
    explanation: 'Creates a concise summary of the document for quick overview and improved search relevance.',
  },
  indexing: {
    label: 'Indexing',
    icon: Database,
    description: 'Creating search index',
    explanation: 'Generates embeddings for semantic search, enabling similarity-based retrieval across your knowledge base.',
  },
};

const STAGE_ORDER: PipelineStage[] = [
  'ingestion',
  'text_extraction',
  'language_detection',
  'chunking',
  'summarization',
  'indexing',
];

export function ProcessingTimeline({ steps, className, showDetails = true }: ProcessingTimelineProps) {
  const [expandedStages, setExpandedStages] = React.useState<Set<string>>(new Set());

  const getStepByStage = (stage: PipelineStage): ProcessingStep | undefined => {
    return steps.find(s => s.stage === stage);
  };

  const toggleExpanded = (stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Running</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-1', className)}>
        <h4 className="text-sm font-medium mb-3">Processing Timeline</h4>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border" />
          
          {STAGE_ORDER.map((stage, index) => {
            const step = getStepByStage(stage);
            const config = STAGE_CONFIG[stage];
            const Icon = config.icon;
            const isExpanded = expandedStages.has(stage);
            const isLast = index === STAGE_ORDER.length - 1;

            return (
              <Collapsible
                key={stage}
                open={isExpanded && showDetails}
                onOpenChange={() => showDetails && toggleExpanded(stage)}
              >
                <div className={cn('relative flex items-start gap-3 pb-4', isLast && 'pb-0')}>
                  {/* Status indicator */}
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border">
                    {getStatusIcon(step?.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto py-1 px-2 -ml-2 hover:bg-muted/50"
                        disabled={!showDetails}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{config.label}</span>
                          {step?.duration_ms && (
                            <span className="text-xs text-muted-foreground">
                              ({formatDuration(step.duration_ms)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(step?.status)}
                          {showDetails && (
                            <ChevronDown className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              isExpanded && 'rotate-180'
                            )} />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2 pt-2 pl-2">
                      {/* Explanation */}
                      <p className="text-xs text-muted-foreground">
                        {config.explanation}
                      </p>
                      
                      {/* Result summary */}
                      {step?.result_summary && Object.keys(step.result_summary).length > 0 && (
                        <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                          <span className="font-medium">Results:</span>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                            {Object.entries(step.result_summary).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="font-mono">
                                  {typeof value === 'number' 
                                    ? value.toLocaleString()
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Error message */}
                      {step?.error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 text-xs text-destructive">
                          <span className="font-medium">Error: </span>
                          {step.error}
                        </div>
                      )}
                      
                      {/* Timing info */}
                      {step?.started_at && (
                        <div className="text-xs text-muted-foreground">
                          Started: {new Date(step.started_at).toLocaleTimeString()}
                          {step.completed_at && (
                            <> • Completed: {new Date(step.completed_at).toLocaleTimeString()}</>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Compact version for inline display
export function ProcessingTimelineCompact({ steps, className }: { steps: ProcessingStep[]; className?: string }) {
  const getStepByStage = (stage: PipelineStage): ProcessingStep | undefined => {
    return steps.find(s => s.stage === stage);
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-destructive';
      case 'running': return 'bg-primary animate-pulse';
      case 'skipped': return 'bg-muted';
      default: return 'bg-muted/50';
    }
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {STAGE_ORDER.map((stage, index) => {
          const step = getStepByStage(stage);
          const config = STAGE_CONFIG[stage];

          return (
            <React.Fragment key={stage}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'h-2 w-2 rounded-full cursor-help',
                    getStatusColor(step?.status)
                  )} />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {step?.status || 'Pending'}
                    {step?.duration_ms && ` • ${(step.duration_ms / 1000).toFixed(1)}s`}
                  </p>
                </TooltipContent>
              </Tooltip>
              {index < STAGE_ORDER.length - 1 && (
                <div className="h-0.5 w-2 bg-border" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
