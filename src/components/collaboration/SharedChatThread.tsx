import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useChatMessages,
  useSendMessage,
  useSharedChatThread,
  usePresence,
} from '@/hooks/useCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { useDocuments } from '@/hooks/useDocuments';
import { useTeams } from '@/hooks/useTeams';
import { Send, Bot, User, Hash, AtSign, FileText, Users, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface SharedChatThreadProps {
  threadId: string;
}

export function SharedChatThread({ threadId }: SharedChatThreadProps) {
  const { user } = useAuth();
  const { data: thread } = useSharedChatThread(threadId);
  const { data: messages, isLoading } = useChatMessages(threadId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { presentUsers } = usePresence('chat_thread', threadId, thread?.team_id);
  
  const [inputValue, setInputValue] = useState('');
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [docRefSearch, setDocRefSearch] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch team members for mentions
  const { data: teams } = useTeams();
  const currentTeam = teams?.find(t => t.id === thread?.team_id);

  // Fetch project documents for references
  const documentsResult = useDocuments(thread?.project_id);
  const documents = Array.isArray(documentsResult.data) 
    ? documentsResult.data 
    : documentsResult.data?.data || [];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !threadId) return;

    // Parse mentions (@username) and document refs (#docname)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const docRefRegex = /#\[([^\]]+)\]\(([^)]+)\)/g;
    
    const mentions: string[] = [];
    const documentRefs: string[] = [];
    
    let match;
    while ((match = mentionRegex.exec(inputValue)) !== null) {
      mentions.push(match[2]);
    }
    while ((match = docRefRegex.exec(inputValue)) !== null) {
      documentRefs.push(match[2]);
    }

    sendMessage({
      threadId,
      content: inputValue,
      mentions,
      documentRefs,
    });

    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Detect mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    const lastHashIndex = value.lastIndexOf('#');
    
    if (lastAtIndex > lastHashIndex && lastAtIndex !== -1) {
      const searchTerm = value.slice(lastAtIndex + 1);
      if (!searchTerm.includes(' ')) {
        setMentionSearch(searchTerm);
        setDocRefSearch(null);
      }
    } else if (lastHashIndex > lastAtIndex && lastHashIndex !== -1) {
      const searchTerm = value.slice(lastHashIndex + 1);
      if (!searchTerm.includes(' ')) {
        setDocRefSearch(searchTerm);
        setMentionSearch(null);
      }
    } else {
      setMentionSearch(null);
      setDocRefSearch(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!thread) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Select a chat thread to start</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{thread.title}</CardTitle>
            {thread.description && (
              <p className="text-sm text-muted-foreground mt-1">{thread.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {presentUsers.slice(0, 3).map((u) => (
                <div key={u.userId} className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {u.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                </div>
              ))}
              {presentUsers.length > 3 && (
                <Badge variant="secondary" className="ml-2">
                  +{presentUsers.length - 3}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {presentUsers.length} online
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading messages...</p>
          ) : messages?.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages?.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.sender_type === 'ai' ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.sender_type === 'ai'
                      ? 'bg-primary/10 border border-primary/20'
                      : message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show document references */}
                  {message.document_refs && message.document_refs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.document_refs.map((docId) => {
                        const doc = documents?.find((d) => d.id === docId);
                        return (
                          <Badge key={docId} variant="secondary" className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            {doc?.name || docId.slice(0, 8)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Show mentions */}
                  {message.mentions && message.mentions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.mentions.map((userId) => (
                        <Badge key={userId} variant="outline" className="text-xs gap-1">
                          <AtSign className="h-3 w-3" />
                          {userId.slice(0, 8)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs opacity-60 mt-1">
                    {format(new Date(message.created_at), 'HH:mm')}
                    {message.is_edited && ' (edited)'}
                  </p>
                </div>
                
                {message.sender_id === user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <Separator />
      
      <div className="p-4">
        {/* Mention/Document ref suggestions */}
        {(mentionSearch !== null || docRefSearch !== null) && (
          <div className="mb-2 p-2 bg-muted rounded-lg max-h-32 overflow-y-auto">
            {mentionSearch !== null && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Mention a team member:</p>
                {/* Would show filtered team members here */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setInputValue(inputValue.replace(/@[^@]*$/, '@[Team Member](user-id) '));
                    setMentionSearch(null);
                  }}
                >
                  <AtSign className="h-4 w-4 mr-2" />
                  Team Member
                </Button>
              </div>
            )}
            {docRefSearch !== null && documents && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reference a document:</p>
                {documents
                  .filter((d) =>
                    d.name.toLowerCase().includes(docRefSearch.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((doc) => (
                    <Button
                      key={doc.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setInputValue(
                          inputValue.replace(/#[^#]*$/, `#[${doc.name}](${doc.id}) `)
                        );
                        setDocRefSearch(null);
                      }}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      {doc.name}
                    </Button>
                  ))}
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message... Use @ to mention, # to reference docs"
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
