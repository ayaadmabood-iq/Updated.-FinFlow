import { useState, useEffect } from 'react';
import { Lightbulb, Loader2, HelpCircle, FileSearch, BarChart3, GitCompare, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { chatService, type SuggestedQuestion } from '@/services/chatService';
import { cn } from '@/lib/utils';

interface SuggestedQuestionsProps {
  documentId: string;
  onSelectQuestion: (question: string) => void;
  className?: string;
}

const categoryIcons = {
  summary: HelpCircle,
  details: FileSearch,
  analysis: BarChart3,
  comparison: GitCompare,
  clarification: MessageSquare,
};

const categoryColors = {
  summary: 'text-chart-1',
  details: 'text-chart-2',
  analysis: 'text-chart-3',
  comparison: 'text-chart-4',
  clarification: 'text-chart-5',
};

export function SuggestedQuestions({ documentId, onSelectQuestion, className }: SuggestedQuestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSuggestions() {
      if (!documentId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await chatService.getSuggestedQuestions(documentId);
        if (mounted) {
          setSuggestions(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load suggestions');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSuggestions();

    return () => {
      mounted = false;
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating suggested questions...</span>
      </div>
    );
  }

  if (error || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={cn('bg-muted/50', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-chart-4" />
          <span className="text-sm font-medium">Suggested Questions</span>
        </div>
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => {
            const Icon = categoryIcons[suggestion.category] || HelpCircle;
            const colorClass = categoryColors[suggestion.category] || 'text-muted-foreground';

            return (
              <Button
                key={idx}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-background"
                onClick={() => onSelectQuestion(suggestion.question)}
              >
                <Icon className={cn('h-4 w-4 mr-2 flex-shrink-0', colorClass)} />
                <span className="text-sm line-clamp-2">{suggestion.question}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
