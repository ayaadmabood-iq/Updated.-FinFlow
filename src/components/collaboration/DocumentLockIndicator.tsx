import { useDocumentLocks, useAcquireLock, useReleaseLock } from '@/hooks/useRealtimeCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DocumentLockIndicatorProps {
  documentId: string;
  fieldName: string;
  onLockAcquired?: () => void;
  onLockReleased?: () => void;
  compact?: boolean;
}

export function DocumentLockIndicator({
  documentId,
  fieldName,
  onLockAcquired,
  onLockReleased,
  compact = false,
}: DocumentLockIndicatorProps) {
  const { user } = useAuth();
  const { data: locks } = useDocumentLocks(documentId);
  const { mutate: acquireLock, isPending: isAcquiring } = useAcquireLock();
  const { mutate: releaseLock, isPending: isReleasing } = useReleaseLock();

  const fieldLock = locks?.find((l) => l.fieldName === fieldName);
  const isLockedByMe = fieldLock?.userId === user?.id;
  const isLockedByOther = fieldLock && !isLockedByMe;

  const handleToggleLock = () => {
    if (isLockedByMe) {
      releaseLock(
        { documentId, fieldName },
        { onSuccess: () => onLockReleased?.() }
      );
    } else if (!fieldLock) {
      acquireLock(
        { documentId, fieldName },
        { onSuccess: () => onLockAcquired?.() }
      );
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              {isLockedByOther ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : isLockedByMe ? (
                <Lock className="h-4 w-4 text-primary" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isLockedByOther
              ? `Locked by another user (expires ${formatDistanceToNow(new Date(fieldLock.expiresAt), { addSuffix: true })})`
              : isLockedByMe
              ? 'You have this field locked'
              : 'Field is available for editing'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLockedByOther ? (
        <Badge variant="destructive" className="gap-1">
          <Lock className="h-3 w-3" />
          Locked by another user
        </Badge>
      ) : isLockedByMe ? (
        <>
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            You're editing
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLock}
            disabled={isReleasing}
          >
            <Unlock className="h-4 w-4 mr-1" />
            Release
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLock}
          disabled={isAcquiring}
        >
          <Lock className="h-4 w-4 mr-1" />
          Start Editing
        </Button>
      )}
    </div>
  );
}
