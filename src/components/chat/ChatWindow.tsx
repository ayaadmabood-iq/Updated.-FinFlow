import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Bot, Trash2, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { ChatMessage, ChatTypingIndicator } from './ChatMessage';
import { DocumentSelector } from './DocumentSelector';
import { SuggestedQuestions } from './SuggestedQuestions';
import { chatService, type ChatMessage as ChatMessageType, type SourceCitation } from '@/services/chatService';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  mimeType: string;
  status: string;
}

interface ChatWindowProps {
  projectId: string;
  documents: Document[];
  className?: string;
}

export function ChatWindow({ projectId, documents, className }: ChatWindowProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [includeProjectContext, setIncludeProjectContext] = useState(true);
  const [pendingSources, setPendingSources] = useState<SourceCitation[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isRTL = i18n.language === 'ar';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get first processed document for suggested questions
  const firstProcessedDoc = documents.find(d => d.status === 'processed' || d.status === 'ready');

  const handleSend = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setPendingSources([]);

    // Prepare conversation history for context
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Create streaming assistant message
    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    const updateAssistantMessage = (content: string, sources?: SourceCitation[], isStreaming = true) => {
      setMessages(prev => {
        const existingIdx = prev.findIndex(m => m.id === assistantId);
        const newMessage: ChatMessageType = {
          id: assistantId,
          role: 'assistant',
          content,
          sources,
          timestamp: new Date(),
          isStreaming,
        };

        if (existingIdx >= 0) {
          return prev.map((m, i) => i === existingIdx ? newMessage : m);
        }
        return [...prev, newMessage];
      });
    };

    try {
      await chatService.streamChat(
        query,
        conversationHistory,
        {
          projectId,
          selectedDocumentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          includeProjectContext,
        },
        {
          onDelta: (text) => {
            assistantContent += text;
            updateAssistantMessage(assistantContent, pendingSources, true);
          },
          onSources: (sources) => {
            setPendingSources(sources);
          },
          onDone: () => {
            setIsLoading(false);
            // Final update with sources and no streaming indicator
            setMessages(prev => {
              const existingIdx = prev.findIndex(m => m.id === assistantId);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  sources: pendingSources,
                  isStreaming: false,
                };
                return updated;
              }
              return prev;
            });
          },
          onError: (error) => {
            setIsLoading(false);
            toast.error(error.message);
            // Remove incomplete assistant message if no content
            if (!assistantContent) {
              setMessages(prev => prev.filter(m => m.id !== assistantId));
            }
          },
        }
      );
    } catch (error) {
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [inputValue, isLoading, messages, projectId, selectedDocumentIds, includeProjectContext, pendingSources]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setPendingSources([]);
  };

  const handleSelectSuggestedQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t('chat.title', 'AI Chat')}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <DocumentSelector
              documents={documents}
              selectedIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
              disabled={isLoading}
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t('chat.settings', 'Chat Settings')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="project-context" className="flex flex-col gap-1">
                      <span>{t('chat.includeProjectContext', 'Include project context')}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {t('chat.projectContextDesc', 'Add project description to AI context')}
                      </span>
                    </Label>
                    <Switch
                      id="project-context"
                      checked={includeProjectContext}
                      onCheckedChange={setIncludeProjectContext}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('chat.empty', 'Start a conversation')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[300px] mb-6">
                  {t('chat.emptyDescription', 'Ask questions about your documents and get AI-powered answers with source citations.')}
                </p>
                
                {/* Suggested Questions for first document */}
                {firstProcessedDoc && (
                  <SuggestedQuestions
                    documentId={firstProcessedDoc.id}
                    onSelectQuestion={handleSelectSuggestedQuestion}
                    className="w-full max-w-md"
                  />
                )}
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  projectId={projectId}
                  isRTL={isRTL}
                />
              ))
            )}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <ChatTypingIndicator />
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder={t('chat.placeholder', 'Ask a question about your documents...')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isLoading}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-[44px] w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
