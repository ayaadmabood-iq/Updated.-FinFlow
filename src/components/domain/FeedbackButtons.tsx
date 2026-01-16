// Feedback Buttons - Thumbs up/down for AI responses with correction flow

import { useState } from 'react';
import { useSubmitFeedback, type FeedbackRating, type FeedbackCategory } from '@/hooks/useDomainAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackButtonsProps {
  projectId: string;
  messageId?: string;
  documentId?: string;
  query: string;
  aiResponse: string;
  className?: string;
  size?: 'sm' | 'default';
  onFeedbackSubmitted?: (rating: FeedbackRating) => void;
}

const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'factual_error', label: 'Factual Error' },
  { value: 'style', label: 'Wrong Style/Tone' },
  { value: 'incomplete', label: 'Incomplete Answer' },
  { value: 'irrelevant', label: 'Irrelevant Response' },
  { value: 'too_long', label: 'Too Long' },
  { value: 'too_short', label: 'Too Short' },
  { value: 'wrong_format', label: 'Wrong Format' },
  { value: 'other', label: 'Other Issue' },
];

export function FeedbackButtons({
  projectId,
  messageId,
  documentId,
  query,
  aiResponse,
  className,
  size = 'default',
  onFeedbackSubmitted,
}: FeedbackButtonsProps) {
  const submitFeedback = useSubmitFeedback();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctedResponse, setCorrectedResponse] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory | ''>('');
  const [feedbackText, setFeedbackText] = useState('');

  const handlePositive = async () => {
    setRating('positive');
    await submitFeedback.mutateAsync({
      projectId,
      messageId,
      documentId,
      query,
      aiResponse,
      rating: 'positive',
    });
    onFeedbackSubmitted?.('positive');
  };

  const handleNegative = () => {
    setRating('negative');
    setShowCorrectionDialog(true);
  };

  const handleSubmitCorrection = async () => {
    await submitFeedback.mutateAsync({
      projectId,
      messageId,
      documentId,
      query,
      aiResponse,
      rating: 'negative',
      correctedResponse: correctedResponse || undefined,
      feedbackCategory: feedbackCategory || undefined,
      feedbackText: feedbackText || undefined,
    });
    setShowCorrectionDialog(false);
    onFeedbackSubmitted?.('negative');
  };

  const handleSkipCorrection = async () => {
    await submitFeedback.mutateAsync({
      projectId,
      messageId,
      documentId,
      query,
      aiResponse,
      rating: 'negative',
      feedbackCategory: feedbackCategory || undefined,
      feedbackText: feedbackText || undefined,
    });
    setShowCorrectionDialog(false);
    onFeedbackSubmitted?.('negative');
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <>
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant={rating === 'positive' ? 'default' : 'ghost'}
          size="icon"
          className={buttonSize}
          onClick={handlePositive}
          disabled={rating !== null || submitFeedback.isPending}
          title="Good response"
        >
          <ThumbsUp className={cn(iconSize, rating === 'positive' && 'fill-current')} />
        </Button>
        <Button
          variant={rating === 'negative' ? 'destructive' : 'ghost'}
          size="icon"
          className={buttonSize}
          onClick={handleNegative}
          disabled={rating !== null || submitFeedback.isPending}
          title="Bad response"
        >
          <ThumbsDown className={cn(iconSize, rating === 'negative' && 'fill-current')} />
        </Button>
      </div>

      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Help Us Improve
            </DialogTitle>
            <DialogDescription>
              Tell us what was wrong with this response so we can do better next time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">What was the issue?</Label>
              <Select
                value={feedbackCategory}
                onValueChange={(val) => setFeedbackCategory(val as FeedbackCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type..." />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedbackText">Additional comments (optional)</Label>
              <Textarea
                id="feedbackText"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more about the issue..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction">
                What should the correct response be? (optional but very helpful!)
              </Label>
              <Textarea
                id="correction"
                value={correctedResponse}
                onChange={(e) => setCorrectedResponse(e.target.value)}
                placeholder="Provide the correct or better response..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Your correction will be used to improve future AI responses
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleSkipCorrection}
              disabled={submitFeedback.isPending}
            >
              Skip Correction
            </Button>
            <Button
              onClick={handleSubmitCorrection}
              disabled={submitFeedback.isPending}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact inline version for chat messages
export function InlineFeedback({
  projectId,
  messageId,
  query,
  aiResponse,
}: {
  projectId: string;
  messageId?: string;
  query: string;
  aiResponse: string;
}) {
  const submitFeedback = useSubmitFeedback();
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (rating: FeedbackRating) => {
    await submitFeedback.mutateAsync({
      projectId,
      messageId,
      query,
      aiResponse,
      rating,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <span className="text-xs text-muted-foreground">Thanks for your feedback!</span>
    );
  }

  return (
    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
      <span className="text-xs text-muted-foreground mr-1">Was this helpful?</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleFeedback('positive')}
        disabled={submitFeedback.isPending}
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleFeedback('negative')}
        disabled={submitFeedback.isPending}
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
