// Q&A Curator - Curate high-quality training pairs and export to JSONL

import { useState } from 'react';
import {
  useCuratedQAPairs,
  useCreateCuratedQAPair,
  useUpdateCuratedQAPair,
  useApproveCuratedQAPair,
  useDeleteCuratedQAPair,
  useExportToJSONL,
  type CuratedQAPair,
  type QASourceType,
} from '@/hooks/useDomainAI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  Plus,
  Check,
  X,
  Trash2,
  Download,
  FileJson,
  MessageSquare,
  FileText,
  Pencil,
  ThumbsUp,
  Eye,
} from 'lucide-react';

interface QACuratorProps {
  datasetId: string;
  projectId: string;
}

const SOURCE_TYPE_LABELS: Record<QASourceType, { label: string; icon: typeof MessageSquare }> = {
  chat_history: { label: 'Chat History', icon: MessageSquare },
  document_summary: { label: 'Document Summary', icon: FileText },
  manual: { label: 'Manual Entry', icon: Pencil },
  feedback_correction: { label: 'User Correction', icon: ThumbsUp },
};

export function QACurator({ datasetId, projectId }: QACuratorProps) {
  const { data: pairs, isLoading } = useCuratedQAPairs(datasetId);
  const createPair = useCreateCuratedQAPair();
  const updatePair = useUpdateCuratedQAPair();
  const approvePair = useApproveCuratedQAPair();
  const deletePair = useDeleteCuratedQAPair();
  const exportToJSONL = useExportToJSONL();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<CuratedQAPair | null>(null);
  const [viewingPair, setViewingPair] = useState<CuratedQAPair | null>(null);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    systemPrompt: '',
    userMessage: '',
    assistantResponse: '',
  });

  const resetForm = () => {
    setFormData({
      systemPrompt: '',
      userMessage: '',
      assistantResponse: '',
    });
  };

  const handleCreate = async () => {
    await createPair.mutateAsync({
      datasetId,
      projectId,
      sourceType: 'manual',
      ...formData,
      systemPrompt: formData.systemPrompt || undefined,
    });
    setIsAddOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingPair) return;
    await updatePair.mutateAsync({
      id: editingPair.id,
      datasetId,
      updates: {
        systemPrompt: formData.systemPrompt,
        userMessage: formData.userMessage,
        assistantResponse: formData.assistantResponse,
      },
    });
    setEditingPair(null);
    resetForm();
  };

  const handleApprove = async (pair: CuratedQAPair) => {
    await approvePair.mutateAsync({ id: pair.id, datasetId });
  };

  const handleDelete = async (pair: CuratedQAPair) => {
    await deletePair.mutateAsync({ id: pair.id, datasetId });
  };

  const handleBulkApprove = async () => {
    for (const id of selectedPairs) {
      await approvePair.mutateAsync({ id, datasetId });
    }
    setSelectedPairs(new Set());
  };

  const handleExport = async (approvedOnly: boolean) => {
    await exportToJSONL.mutateAsync({
      datasetId,
      options: { approvedOnly, includeSystemPrompt: true },
    });
  };

  const openEdit = (pair: CuratedQAPair) => {
    setEditingPair(pair);
    setFormData({
      systemPrompt: pair.systemPrompt || '',
      userMessage: pair.userMessage,
      assistantResponse: pair.assistantResponse,
    });
  };

  const togglePairSelection = (pairId: string) => {
    setSelectedPairs(prev => {
      const next = new Set(prev);
      if (next.has(pairId)) {
        next.delete(pairId);
      } else {
        next.add(pairId);
      }
      return next;
    });
  };

  const approvedCount = pairs?.filter(p => p.isApproved).length || 0;
  const totalCount = pairs?.length || 0;
  const totalTokens = pairs?.reduce((sum, p) => sum + (p.tokenCount || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const PairForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt (optional)</Label>
        <Textarea
          id="systemPrompt"
          value={formData.systemPrompt}
          onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
          placeholder="Optional system instructions..."
          rows={2}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="userMessage">User Message</Label>
        <Textarea
          id="userMessage"
          value={formData.userMessage}
          onChange={(e) => setFormData(prev => ({ ...prev, userMessage: e.target.value }))}
          placeholder="The user's question or prompt..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assistantResponse">Assistant Response</Label>
        <Textarea
          id="assistantResponse"
          value={formData.assistantResponse}
          onChange={(e) => setFormData(prev => ({ ...prev, assistantResponse: e.target.value }))}
          placeholder="The ideal AI response..."
          rows={5}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">Total Pairs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalCount - approvedCount}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Est. Tokens</div>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Approval Progress</span>
                <span>{Math.round((approvedCount / totalCount) * 100)}%</span>
              </div>
              <Progress value={(approvedCount / totalCount) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pair
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Q&A Pair</DialogTitle>
                <DialogDescription>
                  Create a new training example
                </DialogDescription>
              </DialogHeader>
              <PairForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.userMessage || !formData.assistantResponse || createPair.isPending}
                >
                  Add Pair
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {selectedPairs.size > 0 && (
            <Button variant="outline" onClick={handleBulkApprove}>
              <Check className="h-4 w-4 mr-2" />
              Approve Selected ({selectedPairs.size})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport(true)}
            disabled={approvedCount === 0 || exportToJSONL.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Approved
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport(false)}
            disabled={totalCount === 0 || exportToJSONL.isPending}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Pairs List */}
      {(!pairs || pairs.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Q&A Pairs Yet</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add training examples to build your fine-tuning dataset
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({totalCount - approvedCount})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'approved'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {pairs
                    .filter(p => {
                      if (tab === 'pending') return !p.isApproved;
                      if (tab === 'approved') return p.isApproved;
                      return true;
                    })
                    .map(pair => {
                      const SourceIcon = SOURCE_TYPE_LABELS[pair.sourceType]?.icon || MessageSquare;
                      
                      return (
                        <Card key={pair.id} className={pair.isApproved ? 'border-green-200' : ''}>
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedPairs.has(pair.id)}
                                onCheckedChange={() => togglePairSelection(pair.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    <SourceIcon className="h-3 w-3 mr-1" />
                                    {SOURCE_TYPE_LABELS[pair.sourceType]?.label || pair.sourceType}
                                  </Badge>
                                  {pair.isApproved && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      <Check className="h-3 w-3 mr-1" />
                                      Approved
                                    </Badge>
                                  )}
                                  {pair.tokenCount && (
                                    <Badge variant="secondary" className="text-xs">
                                      ~{pair.tokenCount} tokens
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    <span className="font-medium text-muted-foreground">User:</span>{' '}
                                    <span className="line-clamp-2">{pair.userMessage}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium text-muted-foreground">Assistant:</span>{' '}
                                    <span className="line-clamp-2">{pair.assistantResponse}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setViewingPair(pair)}
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(pair)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {!pair.isApproved && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleApprove(pair)}
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Q&A Pair?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(pair)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPair} onOpenChange={(open) => !open && setEditingPair(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Q&A Pair</DialogTitle>
            <DialogDescription>
              Update the training example
            </DialogDescription>
          </DialogHeader>
          <PairForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPair(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.userMessage || !formData.assistantResponse || updatePair.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingPair} onOpenChange={(open) => !open && setViewingPair(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Q&A Pair Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {viewingPair?.systemPrompt && (
              <div>
                <Label className="text-muted-foreground">System Prompt</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                  {viewingPair.systemPrompt}
                </pre>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">User Message</Label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {viewingPair?.userMessage}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Assistant Response</Label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {viewingPair?.assistantResponse}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPair(null)}>
              Close
            </Button>
            {viewingPair && !viewingPair.isApproved && (
              <Button onClick={() => {
                handleApprove(viewingPair);
                setViewingPair(null);
              }}>
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
