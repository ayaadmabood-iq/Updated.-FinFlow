import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckSquare, 
  Plus, 
  MoreVertical, 
  Trash2,
  Calendar,
  Flag,
  FileText,
  Zap,
} from 'lucide-react';
import { ProjectTask, TaskStatus, TaskPriority } from '@/services/workflowService';
import { useProjectTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useWorkflows';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskListProps {
  projectId: string;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

export function TaskList({ projectId }: TaskListProps) {
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const { data: tasks, isLoading } = useProjectTasks(
    projectId, 
    filter === 'all' ? undefined : { status: filter as TaskStatus }
  );
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate(
      {
        project_id: projectId,
        title: newTaskTitle,
        priority: 'medium',
        status: 'pending',
        tags: [],
        metadata: {},
      },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setShowAddTask(false);
        },
      }
    );
  };

  const handleToggleComplete = (task: ProjectTask) => {
    updateTask.mutate({
      taskId: task.id,
      updates: {
        status: task.status === 'completed' ? 'pending' : 'completed',
      },
    });
  };

  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    updateTask.mutate({ taskId, updates: { status } });
  };

  const handleUpdatePriority = (taskId: string, priority: TaskPriority) => {
    updateTask.mutate({ taskId, updates: { priority } });
  };

  const pendingCount = tasks?.filter(t => t.status === 'pending').length || 0;
  const inProgressCount = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">To Do ({pendingCount})</SelectItem>
                <SelectItem value="in_progress">In Progress ({inProgressCount})</SelectItem>
                <SelectItem value="completed">Done ({completedCount})</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowAddTask(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {showAddTask && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              autoFocus
            />
            <Button onClick={handleAddTask} disabled={createTask.isPending}>
              Add
            </Button>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : tasks?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm">Tasks from workflows will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  task.status === 'completed' ? 'bg-muted/50' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleComplete(task)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`${PRIORITY_COLORS[task.priority]} text-white text-xs`}
                    >
                      {task.priority}
                    </Badge>
                    {task.workflow_rule_id && (
                      <Zap className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                    {task.document_id && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Linked
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'pending')}>
                      Set To Do
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                      Set In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                      Set Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, 'high')}>
                      <Flag className="h-4 w-4 mr-2 text-orange-500" />
                      High Priority
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, 'urgent')}>
                      <Flag className="h-4 w-4 mr-2 text-red-500" />
                      Urgent
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteTask.mutate(task.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
