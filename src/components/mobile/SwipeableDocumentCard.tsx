import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Trash2, 
  Share2, 
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Document {
  id: string;
  name: string;
  status: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  summary?: string;
}

interface SwipeableDocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onClick: (id: string) => void;
}

export function SwipeableDocumentCard({
  document,
  onDelete,
  onShare,
  onClick,
}: SwipeableDocumentCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 100;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      const newOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, e.deltaX));
      setSwipeOffset(newOffset);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        setIsDeleting(true);
        setTimeout(() => {
          onDelete(document.id);
        }, 300);
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        onShare(document.id);
      }
      setSwipeOffset(0);
    },
    onTouchEndOrOnMouseUp: () => {
      if (Math.abs(swipeOffset) < SWIPE_THRESHOLD) {
        setSwipeOffset(0);
      }
    },
    trackMouse: true,
    trackTouch: true,
  });

  const getStatusIcon = () => {
    switch (document.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (document.mime_type.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    }
    if (document.mime_type.includes('word') || document.mime_type.includes('document')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    }
    if (document.mime_type.includes('image')) {
      return <FileText className="h-10 w-10 text-green-500" />;
    }
    return <FileText className="h-10 w-10 text-muted-foreground" />;
  };

  return (
    <div className="relative overflow-hidden rounded-lg" ref={cardRef}>
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Share action (right swipe) */}
        <div 
          className={cn(
            "flex items-center justify-center bg-blue-500 transition-all",
            swipeOffset > 0 ? "flex-1" : "w-0"
          )}
          style={{ maxWidth: swipeOffset > 0 ? `${swipeOffset}px` : 0 }}
        >
          <Share2 className="h-6 w-6 text-white" />
        </div>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Delete action (left swipe) */}
        <div 
          className={cn(
            "flex items-center justify-center bg-destructive transition-all",
            swipeOffset < 0 ? "flex-1" : "w-0"
          )}
          style={{ maxWidth: swipeOffset < 0 ? `${Math.abs(swipeOffset)}px` : 0 }}
        >
          <Trash2 className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Card content */}
      <Card
        {...handlers}
        className={cn(
          "relative transition-transform cursor-pointer active:scale-[0.98]",
          isDeleting && "translate-x-full opacity-0 transition-all duration-300"
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={() => swipeOffset === 0 && onClick(document.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* File icon */}
            <div className="shrink-0">
              {getFileIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">{document.name}</h3>
                {getStatusIcon()}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{formatFileSize(document.size_bytes)}</span>
                <span>•</span>
                <span>{format(new Date(document.created_at), 'MMM d, yyyy')}</span>
              </div>

              {document.summary && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {document.summary}
                </p>
              )}

              {document.status === 'processing' && (
                <Badge variant="secondary" className="mt-2">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swipe hint on first render */}
      <style>{`
        @keyframes swipe-hint {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-10px); }
        }
      `}</style>
    </div>
  );
}
