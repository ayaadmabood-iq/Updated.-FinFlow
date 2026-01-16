import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Network, FileText } from "lucide-react";
import { useKnowledgeGraph } from "@/hooks/useKnowledgeGraph";
import { GraphSearchResult } from "@/services/knowledgeGraphService";

interface Props {
  projectId: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; name: string; summary?: string }>;
  entities?: any[];
}

export function GraphSearchChat({ projectId }: Props) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { graphSearch, isSearching } = useKnowledgeGraph(projectId);

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;

    const userMessage = query;
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const result = await graphSearch({ query: userMessage, useGraphContext: true });
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          entities: result.graphContext.entities,
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error while searching." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4" />
          Graph-Augmented Search
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ask questions that use the knowledge graph for context
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                <p>Ask a question about your documents.</p>
                <p className="mt-2">The AI will use the knowledge graph to find connections.</p>
              </div>
            )}
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                } rounded-lg p-3 max-w-[85%]`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Show related entities */}
                {message.entities && message.entities.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      Related Entities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {message.entities.slice(0, 5).map((entity: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {entity.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Sources
                    </p>
                    <div className="space-y-1">
                      {message.sources.slice(0, 3).map((source, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          • {source.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents..."
            disabled={isSearching}
          />
          <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
