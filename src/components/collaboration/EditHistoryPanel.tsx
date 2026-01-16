import { useEditHistory, useRevertEdit } from '@/hooks/useRealtimeCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { History, RotateCcw, ArrowRight, Check, X, Edit, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { CollaborativeEdit } from '@/services/collaborationService';

interface EditHistoryPanelProps {
  documentId: string;
  limit?: number;
  onRevert?: (edit: CollaborativeEdit, previousValue: string | null) => void;
}

const editTypeIcons: Record<string, React.ElementType> = {
  update: Edit,
  create: Plus,
  delete: Trash2,
};

export function EditHistoryPanel({ documentId, limit = 50, onRevert }: EditHistoryPanelProps) {
  const { user } = useAuth();
  const { data: edits, isLoading } = useEditHistory(documentId, limit);
  const { mutate: revertEdit, isPending: isReverting } = useRevertEdit();
  const [selectedEdit, setSelectedEdit] = useState<CollaborativeEdit | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const handleRevert = () => {
    if (!selectedEdit) return;
    
    revertEdit(selectedEdit.id, {
      onSuccess: () => {
        onRevert?.(selectedEdit, selectedEdit.previousValue);
        setShowRevertDialog(false);
        setSelectedEdit(null);
      },
    });
  };

  const groupedEdits = edits?.reduce((acc, edit) => {
    const date = new Date(edit.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(edit);
    return acc;
  }, {} as Record<string, CollaborativeEdit[]>);

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Edit History
            </CardTitle>
            <Badge variant="secondary">{edits?.length || 0} edits</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading history...</p>
            ) : !edits || edits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No edit history yet</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEdits || {}).map(([date, dateEdits]) => (
                  <div key={date}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>

                    <div className="space-y-2">
                      {dateEdits.map((edit, index) => {
                        const Icon = editTypeIcons[edit.editType] || Edit;
                        const isCurrentUser = edit.userId === user?.id;

                        return (
                          <div
                            key={edit.id}
                            className={`group relative pl-6 ${
                              edit.isReverted ? 'opacity-50' : ''
                            }`}
                          >
                            {/* Timeline connector */}
                            {index < dateEdits.length - 1 && (
                              <div className="absolute left-[9px] top-6 w-0.5 h-full bg-border" />
                            )}

                            {/* Timeline dot */}
                            <div
                              className={`absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center ${
                                edit.isReverted
                                  ? 'border-muted-foreground'
                                  : 'border-primary'
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {edit.userId.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium truncate">
                                    {isCurrentUser ? 'You' : 'Team member'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(edit.createdAt), { addSuffix: true })}
                                  </span>
                                </div>

                                {!edit.isReverted && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7"
                                    onClick={() => {
                                      setSelectedEdit(edit);
                                      setShowRevertDialog(true);
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Revert
                                  </Button>
                                )}

                                {edit.isReverted && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <X className="h-3 w-3" />
                                    Reverted
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs mb-2">
                                  {edit.fieldName}
                                </Badge>

                                {edit.previousValue || edit.newValue ? (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    {edit.previousValue && (
                                      <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded max-w-32 truncate">
                                        {edit.previousValue.slice(0, 50)}
                                      </span>
                                    )}
                                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    {edit.newValue && (
                                      <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded max-w-32 truncate">
                                        {edit.newValue.slice(0, 50)}
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert this edit?</DialogTitle>
            <DialogDescription>
              This will mark the edit as reverted. You'll need to manually update the field to the previous value.
            </DialogDescription>
          </DialogHeader>

          {selectedEdit && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Field: {selectedEdit.fieldName}</p>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Previous value:</p>
                <p className="text-sm">{selectedEdit.previousValue || '(empty)'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">New value:</p>
                <p className="text-sm">{selectedEdit.newValue || '(empty)'}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevertDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRevert} disabled={isReverting}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Revert Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
