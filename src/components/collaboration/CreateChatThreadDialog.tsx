import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateChatThread } from '@/hooks/useCollaboration';
import { useProjects } from '@/hooks/useProjects';
import { MessageSquarePlus } from 'lucide-react';

interface CreateChatThreadDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (threadId: string) => void;
}

export function CreateChatThreadDialog({
  teamId,
  open,
  onOpenChange,
  onCreated,
}: CreateChatThreadDialogProps) {
  const { data: projects } = useProjects();
  const { mutate: createThread, isPending } = useCreateChatThread();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');

  const handleCreate = () => {
    if (!title.trim() || !projectId) return;

    createThread(
      {
        teamId,
        projectId,
        title,
        description: description || undefined,
      },
      {
        onSuccess: (data) => {
          setTitle('');
          setDescription('');
          setProjectId('');
          onOpenChange(false);
          onCreated?.(data.id);
        },
      }
    );
  };

  // Filter projects that belong to this team or are shared with it
  const teamProjects = Array.isArray(projects) ? projects : projects?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            <DialogTitle>Start New Conversation</DialogTitle>
          </div>
          <DialogDescription>
            Create a shared chat thread for your team to collaborate on a project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {teamProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Thread Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Report Analysis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this conversation about?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !projectId || isPending}
          >
            Create Thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
