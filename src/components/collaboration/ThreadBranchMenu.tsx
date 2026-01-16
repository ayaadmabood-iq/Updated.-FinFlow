import { useState } from 'react';
import { useThreadBranches, useCreateBranch } from '@/hooks/useRealtimeCollaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GitBranch, Plus, MessageSquare, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreadBranchMenuProps {
  threadId: string;
  messageId: string;
  messageContent: string;
  teamId: string;
  projectId: string;
  onBranchCreated?: (branchId: string) => void;
  onSelectBranch?: (branchId: string) => void;
}

export function ThreadBranchMenu({
  threadId,
  messageId,
  messageContent,
  teamId,
  projectId,
  onBranchCreated,
  onSelectBranch,
}: ThreadBranchMenuProps) {
  const { data: branches } = useThreadBranches(threadId);
  const { mutate: createBranch, isPending } = useCreateBranch();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [branchTitle, setBranchTitle] = useState('');

  const handleCreateBranch = () => {
    if (!branchTitle.trim()) return;

    createBranch(
      {
        parentThreadId: threadId,
        messageId,
        title: branchTitle,
        context: messageContent,
        teamId,
        projectId,
      },
      {
        onSuccess: (branchId) => {
          setShowCreateDialog(false);
          setBranchTitle('');
          if (branchId) {
            onBranchCreated?.(branchId);
          }
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <GitBranch className="h-3 w-3" />
            {branches && branches.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {branches.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Thread Branches</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {!branches || branches.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No branches yet</p>
              <p className="text-xs mt-1">Create a branch to explore a sub-topic</p>
            </div>
          ) : (
            branches.map((branch) => (
              <DropdownMenuItem
                key={branch.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onSelectBranch?.(branch.id)}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{branch.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(branch.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create Branch
            </DialogTitle>
            <DialogDescription>
              Create a new conversation branch to explore a specific topic without cluttering the main thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Branching from:</p>
              <p className="text-sm italic">"{messageContent.slice(0, 150)}..."</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Title</label>
              <Input
                value={branchTitle}
                onChange={(e) => setBranchTitle(e.target.value)}
                placeholder="e.g., 'Deep dive into risk assessment'"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={!branchTitle.trim() || isPending}>
              <GitBranch className="h-4 w-4 mr-1" />
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
