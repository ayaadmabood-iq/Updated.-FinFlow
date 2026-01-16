import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, XCircle, AlertTriangle, Ban, 
  Trash2, Circle, DollarSign, TrendingDown, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/services/notificationService';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<NotificationType, typeof CheckCircle> = {
  processing_complete: CheckCircle,
  processing_failed: XCircle,
  quota_warning: AlertTriangle,
  quota_exceeded: Ban,
  budget_warning: DollarSign,
  budget_critical: AlertTriangle,
  budget_exceeded: Ban,
  budget_downgrade: TrendingDown,
  budget_aborted: ShieldAlert,
};

const typeColors: Record<NotificationType, string> = {
  processing_complete: 'text-success',
  processing_failed: 'text-destructive',
  quota_warning: 'text-warning',
  quota_exceeded: 'text-destructive',
  budget_warning: 'text-warning',
  budget_critical: 'text-destructive',
  budget_exceeded: 'text-destructive',
  budget_downgrade: 'text-primary',
  budget_aborted: 'text-destructive',
};

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { t } = useTranslation();
  const Icon = typeIcons[notification.type] || Circle;
  const iconColor = typeColors[notification.type] || 'text-muted-foreground';

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0",
        !notification.read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm",
            !notification.read && "font-medium"
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        title={t('common.delete')}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}
