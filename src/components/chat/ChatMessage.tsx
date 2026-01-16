import { memo } from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SourceCitationsList } from './SourceCitation';
import type { ChatMessage as ChatMessageType } from '@/services/chatService';

interface ChatMessageProps {
  message: ChatMessageType;
  projectId: string;
  isRTL?: boolean;
}

function ChatMessageComponent({ message, projectId, isRTL = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Detect RTL content
  const arabicPattern = /[\u0600-\u06FF]/;
  const contentIsRTL = arabicPattern.test(message.content);

  return (
    <div
      className={cn(
        'flex gap-3 w-full',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isRTL && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser && 'flex flex-col items-end',
          !isUser && 'flex flex-col items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser 
              ? 'bg-primary text-primary-foreground rounded-tr-sm' 
              : 'bg-muted rounded-tl-sm'
          )}
          style={{
            direction: contentIsRTL ? 'rtl' : 'ltr',
            textAlign: contentIsRTL ? 'right' : 'left',
          }}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-flex items-center ml-1">
                <span className="animate-pulse">▌</span>
              </span>
            )}
          </p>
        </div>

        {/* Sources for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && !isStreaming && (
          <div className="w-full mt-2">
            <SourceCitationsList sources={message.sources} projectId={projectId} />
          </div>
        )}

        {/* Timestamp */}
        <span className={cn(
          'text-xs text-muted-foreground mt-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

// Loading indicator for when assistant is thinking
export function ChatTypingIndicator() {
  return (
    <div className="flex gap-3 w-full">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}
