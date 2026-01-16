import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useKnowledgeBases,
  useKnowledgeBaseArticles,
  useCreateKnowledgeBase,
  useCreateArticle,
} from '@/hooks/useCollaboration';
import {
  Book,
  Plus,
  FileText,
  Globe,
  Lock,
  Search,
  Calendar,
  Eye,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

interface KnowledgeBaseManagerProps {
  teamId: string;
}

export function KnowledgeBaseManager({ teamId }: KnowledgeBaseManagerProps) {
  const { data: knowledgeBases, isLoading } = useKnowledgeBases(teamId);
  const { mutate: createKB, isPending: isCreatingKB } = useCreateKnowledgeBase();
  
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDescription, setNewKBDescription] = useState('');
  const [newKBPublic, setNewKBPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateKB = () => {
    if (!newKBName.trim()) return;

    createKB(
      {
        teamId,
        name: newKBName,
        description: newKBDescription,
        isPublic: newKBPublic,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setNewKBName('');
          setNewKBDescription('');
          setNewKBPublic(false);
        },
      }
    );
  };

  const filteredKBs = knowledgeBases?.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading knowledge bases...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Knowledge Bases List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Book className="h-5 w-5" />
              Knowledge Bases
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Knowledge Base</DialogTitle>
                  <DialogDescription>
                    Create a new knowledge base to publish team documentation and insights.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="kb-name">Name</Label>
                    <Input
                      id="kb-name"
                      value={newKBName}
                      onChange={(e) => setNewKBName(e.target.value)}
                      placeholder="e.g., Product Documentation"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kb-description">Description</Label>
                    <Textarea
                      id="kb-description"
                      value={newKBDescription}
                      onChange={(e) => setNewKBDescription(e.target.value)}
                      placeholder="What is this knowledge base about?"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="kb-public">Public Access</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow anyone with the link to view
                      </p>
                    </div>
                    <Switch
                      id="kb-public"
                      checked={newKBPublic}
                      onCheckedChange={setNewKBPublic}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKB}
                    disabled={!newKBName.trim() || isCreatingKB}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge bases..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[calc(100vh-400px)]">
            {!filteredKBs || filteredKBs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No knowledge bases yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredKBs.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => setSelectedKBId(kb.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedKBId === kb.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{kb.name}</span>
                          {kb.is_public ? (
                            <Globe className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {kb.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {kb.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected KB Articles */}
      <Card className="lg:col-span-2">
        {selectedKBId ? (
          <KnowledgeBaseDetail
            knowledgeBaseId={selectedKBId}
            knowledgeBase={knowledgeBases?.find((kb) => kb.id === selectedKBId)}
          />
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select a knowledge base to view articles
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface KnowledgeBaseDetailProps {
  knowledgeBaseId: string;
  knowledgeBase?: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    is_public: boolean;
  };
}

function KnowledgeBaseDetail({ knowledgeBaseId, knowledgeBase }: KnowledgeBaseDetailProps) {
  const { data: articles, isLoading } = useKnowledgeBaseArticles(knowledgeBaseId);
  const { mutate: createArticle, isPending: isCreating } = useCreateArticle();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newTags, setNewTags] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(false);

  const handleCreateArticle = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    createArticle(
      {
        knowledgeBaseId,
        title: newTitle,
        contentMarkdown: newContent,
        summary: newSummary,
        tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        isPublished: publishImmediately,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setNewTitle('');
          setNewContent('');
          setNewSummary('');
          setNewTags('');
          setPublishImmediately(false);
        },
      }
    );
  };

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{knowledgeBase?.name}</CardTitle>
            {knowledgeBase?.description && (
              <CardDescription>{knowledgeBase.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {knowledgeBase?.is_public && (
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Public
              </Button>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Article</DialogTitle>
                  <DialogDescription>
                    Add a new article to this knowledge base.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="article-title">Title</Label>
                    <Input
                      id="article-title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Article title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="article-summary">Summary</Label>
                    <Textarea
                      id="article-summary"
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      placeholder="Brief summary of the article"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="article-content">Content (Markdown)</Label>
                    <Textarea
                      id="article-content"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Write your article content in Markdown..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="article-tags">Tags (comma-separated)</Label>
                    <Input
                      id="article-tags"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="documentation, guide, tutorial"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="publish">Publish Immediately</Label>
                      <p className="text-xs text-muted-foreground">
                        Make this article visible right away
                      </p>
                    </div>
                    <Switch
                      id="publish"
                      checked={publishImmediately}
                      onCheckedChange={setPublishImmediately}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateArticle}
                    disabled={!newTitle.trim() || !newContent.trim() || isCreating}
                  >
                    Create Article
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        <ScrollArea className="h-[calc(100vh-400px)]">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading articles...</p>
          ) : !articles || articles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No articles yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first article to start building your knowledge base.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{article.title}</h3>
                        {article.is_published ? (
                          <Badge variant="default" className="text-xs">Published</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Draft</Badge>
                        )}
                      </div>
                      
                      {article.summary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(article.created_at), 'MMM d, yyyy')}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          {article.view_count} views
                        </div>
                        
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            <div className="flex gap-1">
                              {article.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {article.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{article.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </>
  );
}
