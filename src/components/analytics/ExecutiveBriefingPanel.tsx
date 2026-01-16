import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Calendar as CalendarIcon,
  Download,
  Trash2,
  Plus,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { ExecutiveBriefing } from '@/services/analyticsService';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { sanitizeMarkdown } from '@/lib/sanitize';

interface ExecutiveBriefingPanelProps {
  briefings: ExecutiveBriefing[];
  isLoading: boolean;
  onGenerate: (periodStart: Date, periodEnd: Date, title?: string) => void;
  onDelete: (briefingId: string) => void;
  isGenerating: boolean;
}

export function ExecutiveBriefingPanel({
  briefings,
  isLoading,
  onGenerate,
  onDelete,
  isGenerating,
}: ExecutiveBriefingPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<ExecutiveBriefing | null>(null);
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(startOfWeek(subDays(new Date(), 7)));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfWeek(subDays(new Date(), 7)));

  const handleGenerate = () => {
    onGenerate(periodStart, periodEnd, title || undefined);
    setCreateDialogOpen(false);
    setTitle('');
  };

  const handleDownloadMarkdown = (briefing: ExecutiveBriefing) => {
    if (!briefing.content_markdown) return;
    const blob = new Blob([briefing.content_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${briefing.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ExecutiveBriefing['status']) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'generating':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Executive Briefings
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading briefings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Executive Briefings
              </CardTitle>
              <CardDescription>
                AI-generated summaries of project activity and insights
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Briefing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Executive Briefing</DialogTitle>
                  <DialogDescription>
                    Create an AI-generated summary of project activity for a specific period.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input
                      id="title"
                      placeholder="Weekly Briefing - Week 23"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !periodStart && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {periodStart ? format(periodStart, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={periodStart}
                            onSelect={(date) => date && setPeriodStart(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !periodEnd && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {periodEnd ? format(periodEnd, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={periodEnd}
                            onSelect={(date) => date && setPeriodEnd(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPeriodStart(startOfWeek(subDays(new Date(), 7)));
                        setPeriodEnd(endOfWeek(subDays(new Date(), 7)));
                      }}
                    >
                      Last Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPeriodStart(subDays(new Date(), 30));
                        setPeriodEnd(new Date());
                      }}
                    >
                      Last 30 Days
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {briefings.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No briefings yet</p>
              <p className="text-sm">Generate your first executive briefing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {briefings.slice(0, 5).map((briefing) => (
                <div
                  key={briefing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setSelectedBriefing(briefing)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{briefing.title}</span>
                        {getStatusBadge(briefing.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(briefing.period_start), 'MMM d')} -{' '}
                        {format(new Date(briefing.period_end), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {briefing.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadMarkdown(briefing);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(briefing.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBriefing} onOpenChange={(open) => !open && setSelectedBriefing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedBriefing?.title}</DialogTitle>
            <DialogDescription>
              {selectedBriefing && (
                <>
                  {format(new Date(selectedBriefing.period_start), 'MMM d')} -{' '}
                  {format(new Date(selectedBriefing.period_end), 'MMM d, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedBriefing?.status === 'ready' && selectedBriefing.content_markdown ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                <div dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(selectedBriefing.content_markdown) }} />
              </div>
            </ScrollArea>
          ) : selectedBriefing?.status === 'generating' ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedBriefing?.status === 'failed' ? (
            <div className="flex flex-col items-center justify-center h-40 text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{selectedBriefing.error_message || 'Generation failed'}</p>
            </div>
          ) : null}
          <DialogFooter>
            {selectedBriefing?.status === 'ready' && (
              <Button onClick={() => selectedBriefing && handleDownloadMarkdown(selectedBriefing)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
