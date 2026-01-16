import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresence } from '@/hooks/useCollaboration';
import { Circle } from 'lucide-react';

interface PresenceIndicatorProps {
  resourceType: 'document' | 'chat_thread' | 'project';
  resourceId: string;
  teamId?: string;
  maxAvatars?: number;
  showCount?: boolean;
}

export function PresenceIndicator({
  resourceType,
  resourceId,
  teamId,
  maxAvatars = 4,
  showCount = true,
}: PresenceIndicatorProps) {
  const { presentUsers } = usePresence(resourceType, resourceId, teamId);

  if (presentUsers.length === 0) {
    return null;
  }

  const displayUsers = presentUsers.slice(0, maxAvatars);
  const remainingCount = presentUsers.length - maxAvatars;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background hover:z-10 transition-transform hover:scale-110">
                    <AvatarImage src={user.metadata?.avatarUrl as string} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{(user.metadata?.name as string) || `User ${user.userId.slice(0, 8)}`}</p>
                <p className="text-muted-foreground">Online now</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && showCount && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{remainingCount} more users online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {showCount && (
          <span className="text-xs text-muted-foreground ml-1">
            {presentUsers.length} viewing
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
