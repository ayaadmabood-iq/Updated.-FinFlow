import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'processing_complete' 
  | 'processing_failed' 
  | 'quota_warning' 
  | 'quota_exceeded'
  | 'budget_warning'
  | 'budget_critical'
  | 'budget_exceeded'
  | 'budget_downgrade'
  | 'budget_aborted';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

class NotificationService {
  // Get notifications for the current user
  async getNotifications(limit = 20): Promise<NotificationsResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    const notifications: Notification[] = (data || []).map(this.mapToNotification);
    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, unreadCount };
  }

  // Mark a single notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  private mapToNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      title: row.title as string,
      message: row.message as string,
      data: (row.data as Record<string, unknown>) || {},
      read: row.read as boolean,
      createdAt: row.created_at as string,
    };
  }
}

export const notificationService = new NotificationService();
