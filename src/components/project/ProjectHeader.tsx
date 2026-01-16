import { FolderOpen, MoreHorizontal, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectHeaderProps {
  name: string;
  fileCount?: number;
  readyCount?: number;
  lastUpdated?: string;
}

export function ProjectHeader({ name, fileCount = 0, readyCount = 0, lastUpdated }: ProjectHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {fileCount} files • {readyCount} ready for training
            {lastUpdated && ` • Last updated ${lastUpdated}`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Project</DropdownMenuItem>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete Project</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
